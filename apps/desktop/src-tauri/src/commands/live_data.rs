// src-tauri/src/commands/live_data.rs
use serde::{Deserialize, Serialize};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use tokio_tungstenite::WebSocketStream;
use tokio_tungstenite::MaybeTlsStream;
use tokio::net::TcpStream;
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::sync::Mutex;
use std::collections::HashMap;

type WebSocketConnection = WebSocketStream<MaybeTlsStream<TcpStream>>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TennisLiveData {
    #[serde(rename = "matchId")]
    pub match_id: String,
    pub player1: PlayerInfo,
    pub player2: PlayerInfo,
    pub score: TennisScore,
    pub sets: Vec<TennisSet>,
    #[serde(rename = "matchStatus")]
    pub match_status: String,
    #[serde(rename = "servingPlayer")]
    pub serving_player: Option<u8>,
    #[serde(rename = "currentSet")]
    pub current_set: u8,
    #[serde(rename = "isTiebreak")]
    pub is_tiebreak: bool,
    #[serde(rename = "tiebreakScore")]
    pub tiebreak_score: Option<TiebreakScore>,
    pub tournament: Option<String>,
    pub round: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayerInfo {
    pub name: String,
    pub country: Option<String>,
    pub seed: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TennisScore {
    #[serde(rename = "player1Sets")]
    pub player1_sets: u8,
    #[serde(rename = "player2Sets")]
    pub player2_sets: u8,
    #[serde(rename = "player1Games")]
    pub player1_games: u8,
    #[serde(rename = "player2Games")]
    pub player2_games: u8,
    #[serde(rename = "player1Points")]
    pub player1_points: String,
    #[serde(rename = "player2Points")]
    pub player2_points: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TennisSet {
    #[serde(rename = "player1Games")]
    pub player1_games: u8,
    #[serde(rename = "player2Games")]
    pub player2_games: u8,
    pub completed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TiebreakScore {
    pub player1: u8,
    pub player2: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreboardInfo {
    pub id: String,
    pub name: String,
}

// Global state for WebSocket connections
lazy_static::lazy_static! {
    static ref WEBSOCKET_CONNECTIONS: Arc<Mutex<HashMap<String, WebSocketConnection>>> = Arc::new(Mutex::new(HashMap::new()));
    static ref MESSAGE_LISTENERS: Arc<Mutex<HashMap<String, tokio::task::JoinHandle<()>>>> = Arc::new(Mutex::new(HashMap::new()));
}

// Mock data for testing
fn create_mock_tennis_data() -> TennisLiveData {
    TennisLiveData {
        match_id: "mock_match_001".to_string(),
        player1: PlayerInfo {
            name: "Novak Djokovic".to_string(),
            country: Some("SRB".to_string()),
            seed: Some(1),
        },
        player2: PlayerInfo {
            name: "Rafael Nadal".to_string(),
            country: Some("ESP".to_string()),
            seed: Some(2),
        },
        score: TennisScore {
            player1_sets: 2,
            player2_sets: 1,
            player1_games: 4,
            player2_games: 3,
            player1_points: "30".to_string(),
            player2_points: "15".to_string(),
        },
        sets: vec![
            TennisSet {
                player1_games: 6,
                player2_games: 4,
                completed: true,
            },
            TennisSet {
                player1_games: 5,
                player2_games: 7,
                completed: true,
            },
            TennisSet {
                player1_games: 7,
                player2_games: 5,
                completed: true,
            },
            TennisSet {
                player1_games: 4,
                player2_games: 3,
                completed: false,
            },
        ],
        match_status: "in_progress".to_string(),
        serving_player: Some(1),
        current_set: 4,
        is_tiebreak: false,
        tiebreak_score: None,
        tournament: Some("Wimbledon".to_string()),
        round: Some("Final".to_string()),
    }
}

#[tauri::command]
pub async fn connect_websocket(ws_url: String, connection_id: String) -> Result<String, String> {
    log::info!("Attempting to connect to WebSocket: {}", ws_url);

    // Ensure URL starts with wss://
    let ws_url = if ws_url.starts_with("ws://") {
        ws_url.replace("ws://", "wss://")
    } else if !ws_url.starts_with("wss://") {
        format!("wss://{}", ws_url)
    } else {
        ws_url
    };

    // Validate the WebSocket URL by parsing it
    let _url = url::Url::parse(&ws_url)
        .map_err(|e| format!("Invalid WebSocket URL: {}", e))?;

    // Attempt to connect using the URL string directly
    match connect_async(&ws_url).await {
        Ok((ws_stream, _)) => {
            log::info!("Successfully connected to WebSocket: {}", ws_url);

            // Store the connection
            let mut connections = WEBSOCKET_CONNECTIONS.lock().await;
            connections.insert(connection_id.clone(), ws_stream);

            // Single connection receives all court data
            log::debug!("[WEBSOCKET {}] Single connection established - will receive data from all courts", connection_id);

            Ok(format!("Connected to WebSocket: {}", ws_url))
        }
        Err(e) => {
            let error_msg = format!("Failed to connect to WebSocket: {}", e);
            log::error!("{}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
pub async fn disconnect_websocket(connection_id: String) -> Result<String, String> {
    log::info!("Disconnecting WebSocket connection: {}", connection_id);

    let mut connections = WEBSOCKET_CONNECTIONS.lock().await;

    if let Some(mut ws_stream) = connections.remove(&connection_id) {
        // Send close frame and close the connection
        let _ = ws_stream.close(None).await;

        // Note: With single connection approach, data by court is preserved
        // No need to clean up court-specific data on disconnect

        Ok(format!("Disconnected WebSocket connection: {}", connection_id))
    } else {
        Err(format!("No WebSocket connection found with ID: {}", connection_id))
    }
}

#[tauri::command]
pub async fn start_websocket_listener(connection_id: String) -> Result<String, String> {
    log::info!("Starting WebSocket message listener for: {}", connection_id);

    // Check if we already have a listener for this connection
    let mut listeners = MESSAGE_LISTENERS.lock().await;
    if listeners.contains_key(&connection_id) {
        return Ok(format!("Listener already running for WebSocket: {}", connection_id));
    }

    // Check if the connection exists
    let connections = WEBSOCKET_CONNECTIONS.lock().await;
    if !connections.contains_key(&connection_id) {
        return Err(format!("No WebSocket connection found with ID: {}", connection_id));
    }
    drop(connections);

    // Start the listener task
    let connection_id_clone = connection_id.clone();
    let listener_handle = tokio::spawn(async move {
        log::debug!("WebSocket listener started for: {}", connection_id_clone);

        loop {
            let mut connections = WEBSOCKET_CONNECTIONS.lock().await;

            if let Some(ws_stream) = connections.get_mut(&connection_id_clone) {
                // Try to receive a message
                match ws_stream.next().await {
                    Some(message_result) => {
                        match message_result {
                            Ok(message) => {
                                match message {
                                    Message::Text(text) => {
                                        log::debug!("[WEBSOCKET {}] Received TEXT message: {}", connection_id_clone, text);
                                        // Generic message logging - specific parsing handled by frontend
                                    }
                                    Message::Binary(data) => {
                                        log::debug!("[WEBSOCKET {}] Received BINARY message: {} bytes", connection_id_clone, data.len());
                                    }
                                    Message::Ping(payload) => {
                                        log::debug!("[WEBSOCKET {}] Received PING: {} bytes", connection_id_clone, payload.len());
                                    }
                                    Message::Pong(payload) => {
                                        log::debug!("[WEBSOCKET {}] Received PONG: {} bytes", connection_id_clone, payload.len());
                                    }
                                    Message::Close(close_frame) => {
                                        if let Some(frame) = close_frame {
                                            log::info!("[WEBSOCKET {}] Connection closed: Code={}, Reason={}",
                                                connection_id_clone,
                                                frame.code,
                                                frame.reason
                                            );
                                        } else {
                                            log::info!("[WEBSOCKET {}] Connection closed (no close frame)", connection_id_clone);
                                        }
                                        log::debug!("[WEBSOCKET {}] Attempting to reconnect in 5 seconds...", connection_id_clone);
                                        tokio::time::sleep(tokio::time::Duration::from_secs(5)).await;

                                        // Attempt reconnection
                                        match attempt_reconnection(&connection_id_clone).await {
                                            Ok(_) => {
                                                log::info!("[WEBSOCKET {}] Reconnection successful, continuing...", connection_id_clone);
                                                continue;
                                            }
                                            Err(e) => {
                                                log::error!("[WEBSOCKET {}] Reconnection failed: {}, giving up", connection_id_clone, e);
                                                break;
                                            }
                                        }
                                    }
                                    Message::Frame(frame) => {
                                        log::debug!("[WEBSOCKET {}] Received FRAME: {:?}", connection_id_clone, frame);
                                    }
                                }
                            }
                            Err(e) => {
                                log::error!("[WEBSOCKET {}] Error receiving message: {}", connection_id_clone, e);

                                // Attempt to reconnect after network errors
                                log::debug!("[WEBSOCKET {}] Network error detected, attempting to reconnect in 3 seconds...", connection_id_clone);
                                tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;

                                match attempt_reconnection(&connection_id_clone).await {
                                    Ok(_) => {
                                        log::info!("[WEBSOCKET {}] Reconnection successful after network error", connection_id_clone);
                                        continue;
                                    }
                                    Err(reconnect_err) => {
                                        log::error!("[WEBSOCKET {}] Reconnection failed after network error: {}", connection_id_clone, reconnect_err);
                                        break;
                                    }
                                }
                            }
                        }
                    }
                    None => {
                        log::info!("[WEBSOCKET {}] Message stream ended", connection_id_clone);

                        // Attempt to reconnect when stream ends
                        log::debug!("[WEBSOCKET {}] Stream ended, attempting to reconnect in 2 seconds...", connection_id_clone);
                        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

                        match attempt_reconnection(&connection_id_clone).await {
                            Ok(_) => {
                                log::info!("[WEBSOCKET {}] Reconnection successful after stream ended", connection_id_clone);
                                continue;
                            }
                            Err(reconnect_err) => {
                                log::error!("[WEBSOCKET {}] Reconnection failed after stream ended: {}", connection_id_clone, reconnect_err);
                                break;
                            }
                        }
                    }
                }
            } else {
                log::warn!("[WEBSOCKET {}] Connection no longer exists, stopping listener", connection_id_clone);
                break;
            }

            drop(connections);
        }

        log::info!("WebSocket listener stopped for: {}", connection_id_clone);
    });

    listeners.insert(connection_id.clone(), listener_handle);

    Ok(format!("Started WebSocket message listener for: {}", connection_id))
}

async fn attempt_reconnection(connection_id: &str) -> Result<(), String> {
    log::debug!("[WEBSOCKET {}] Attempting reconnection...", connection_id);
    // Automatic reconnection is not supported - connection URL must be provided by the client
    Err("Automatic reconnection is not supported. Please reconnect manually.".to_string())
}

#[tauri::command]
pub async fn stop_websocket_listener(connection_id: String) -> Result<String, String> {
    log::info!("Stopping WebSocket message listener for: {}", connection_id);

    let mut listeners = MESSAGE_LISTENERS.lock().await;

    if let Some(handle) = listeners.remove(&connection_id) {
        handle.abort();
        Ok(format!("Stopped WebSocket message listener for: {}", connection_id))
    } else {
        Err(format!("No message listener found for WebSocket: {}", connection_id))
    }
}

#[tauri::command]
pub async fn send_websocket_message(connection_id: String, message: String) -> Result<String, String> {
    log::debug!("Sending message to WebSocket {}: {}", connection_id, message);

    let mut connections = WEBSOCKET_CONNECTIONS.lock().await;

    if let Some(ws_stream) = connections.get_mut(&connection_id) {
        ws_stream.send(Message::Text(message.clone().into())).await
            .map_err(|e| format!("Failed to send message: {}", e))?;

        Ok(format!("Message sent to {}: {}", connection_id, message))
    } else {
        Err(format!("No WebSocket connection found with ID: {}", connection_id))
    }
}

#[tauri::command]
pub async fn test_websocket_connection(ws_url: String) -> Result<bool, String> {
    log::debug!("Testing WebSocket connection to: {}", ws_url);

    // Ensure URL starts with wss://
    let ws_url = if ws_url.starts_with("ws://") {
        ws_url.replace("ws://", "wss://")
    } else if !ws_url.starts_with("wss://") {
        format!("wss://{}", ws_url)
    } else {
        ws_url
    };

    // Validate the WebSocket URL by parsing it
    let _url = url::Url::parse(&ws_url)
        .map_err(|e| format!("Invalid WebSocket URL: {}", e))?;

    // Attempt to connect with a timeout
    match tokio::time::timeout(
        std::time::Duration::from_secs(10),
        connect_async(&ws_url)
    ).await {
        Ok(Ok((mut ws_stream, _))) => {
            log::info!("WebSocket test successful: {}", ws_url);

            // Send a close frame to cleanly disconnect
            let _ = ws_stream.close(None).await;

            Ok(true)
        }
        Ok(Err(e)) => {
            let error_msg = format!("WebSocket test failed: {}", e);
            log::error!("{}", error_msg);
            Err(error_msg)
        }
        Err(_) => {
            let error_msg = "WebSocket test timed out after 10 seconds".to_string();
            log::error!("{}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
pub async fn fetch_live_data(api_url: String, _api_key: String) -> Result<TennisLiveData, String> {
    // For now, return mock data if the URL contains "mock"
    if api_url.contains("mock") {
        return Ok(create_mock_tennis_data());
    }

    // TODO: Implement WebSocket-based data fetching
    // This could send a request over WebSocket and wait for response
    Err("WebSocket-based data fetching not yet implemented".to_string())
}

#[tauri::command]
pub async fn get_available_scoreboards(api_url: String, _api_key: String) -> Result<Vec<ScoreboardInfo>, String> {
    // For mock URLs, return sample scoreboards
    if api_url.contains("mock") {
        return Ok(vec![
            ScoreboardInfo {
                id: "test-1".to_string(),
                name: "Test Court 1".to_string(),
            },
            ScoreboardInfo {
                id: "test-2".to_string(),
                name: "Test Court 2".to_string(),
            },
            ScoreboardInfo {
                id: "stadium".to_string(),
                name: "Main Stadium".to_string(),
            },
        ]);
    }

    // TODO: Implement WebSocket-based scoreboard fetching
    Err("WebSocket-based scoreboard fetching not yet implemented".to_string())
}

#[tauri::command]
pub async fn test_api_connection(_api_url: String, _api_key: String) -> Result<bool, String> {
    // For now, always return true for backward compatibility
    // TODO: Implement actual API connection testing
    Ok(true)
}

#[tauri::command]
pub async fn inspect_live_data() -> Result<String, String> {
    let connections = WEBSOCKET_CONNECTIONS.lock().await;
    let connection_count = connections.len();

    Ok(format!("Active WebSocket connections: {}", connection_count))
}

#[tauri::command]
pub async fn cleanup_live_data() -> Result<String, String> {
    log::debug!("Manual data cleanup requested");
    // No cleanup needed - live data is managed via ScoreForge HTTP polling
    Ok("Data cleanup completed.".to_string())
}

#[tauri::command]
pub async fn check_websocket_status(connection_id: String) -> Result<String, String> {
    let connections = WEBSOCKET_CONNECTIONS.lock().await;

    if connections.contains_key(&connection_id) {
        Ok(format!("WebSocket connection '{}' is active", connection_id))
    } else {
        Ok(format!("WebSocket connection '{}' is not active", connection_id))
    }
}

