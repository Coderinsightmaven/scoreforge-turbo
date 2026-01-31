//! Tennis data processing commands for Tauri backend.
//!
//! This module provides high-performance tennis match data processing
//! using Rust, which is faster than JavaScript Web Workers.
//!
//! Features:
//! - Processes raw tennis data into normalized format
//! - Handles multiple data formats (snake_case and camelCase)
//! - Normalizes point values (0, 15, 30, 40, AD)
//! - Batch processing support
//! - Data validation
//!
//! # Example
//! ```rust,no_run
//! let raw_data = RawTennisData { /* ... */ };
//! let processed = process_tennis_data(raw_data).await?;
//! ```
// src-tauri/src/commands/tennis_processor.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::command;

/// Raw tennis data structure from API/WebSocket.
///
/// Supports both snake_case and camelCase property names for compatibility
/// with different API formats.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawTennisData {
    pub id: Option<String>,
    pub match_id: Option<String>,
    pub player1: Option<RawPlayerData>,
    pub player2: Option<RawPlayerData>,
    pub team1: Option<RawPlayerData>,
    pub team2: Option<RawPlayerData>,
    pub score: Option<RawScoreData>,
    pub sets: Option<HashMap<String, RawSetData>>,
    pub serving_player: Option<i32>,
    #[serde(rename = "servingPlayer")]
    pub serving_player_camel: Option<i32>,
    pub current_set: Option<i32>,
    #[serde(rename = "currentSet")]
    pub current_set_camel: Option<i32>,
    pub is_tiebreak: Option<bool>,
    #[serde(rename = "isTiebreak")]
    pub is_tiebreak_camel: Option<bool>,
    pub match_status: Option<String>,
    #[serde(rename = "matchStatus")]
    pub match_status_camel: Option<String>,
}

/// Raw player/team data structure.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawPlayerData {
    pub name: Option<String>,
    pub country: Option<String>,
    pub seed: Option<i32>,
}

/// Raw score data structure.
///
/// Supports both snake_case (player1_sets) and camelCase (player1Sets) formats.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawScoreData {
    pub player1_sets: Option<i32>,
    #[serde(rename = "player1Sets")]
    pub player1_sets_camel: Option<i32>,
    pub player2_sets: Option<i32>,
    #[serde(rename = "player2Sets")]
    pub player2_sets_camel: Option<i32>,
    pub player1_games: Option<i32>,
    #[serde(rename = "player1Games")]
    pub player1_games_camel: Option<i32>,
    pub player2_games: Option<i32>,
    #[serde(rename = "player2Games")]
    pub player2_games_camel: Option<i32>,
    pub player1_points: Option<String>,
    #[serde(rename = "player1Points")]
    pub player1_points_camel: Option<String>,
    pub player2_points: Option<String>,
    #[serde(rename = "player2Points")]
    pub player2_points_camel: Option<String>,
}

/// Raw set data structure.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawSetData {
    pub player1: Option<i32>,
    pub player2: Option<i32>,
}

/// Processed tennis match data in normalized format.
///
/// This is the standardized output format after processing raw data.
/// All fields are guaranteed to have values (no Option types).
/// Includes both new (snake_case) and legacy (camelCase) property names.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedTennisMatch {
    pub match_id: String,
    pub player1: ProcessedPlayerData,
    pub player2: ProcessedPlayerData,
    pub score: ProcessedScoreData,
    pub sets: HashMap<String, ProcessedSetData>,
    pub serving_player: i32,
    pub current_set: i32,
    pub is_tiebreak: bool,
    pub match_status: String,
    // Legacy properties for compatibility (serialized as camelCase)
    #[serde(rename = "servingPlayer")]
    pub serving_player_legacy: i32,
    #[serde(rename = "currentSet")]
    pub current_set_legacy: i32,
    #[serde(rename = "isTiebreak")]
    pub is_tiebreak_legacy: bool,
    #[serde(rename = "matchStatus")]
    pub match_status_legacy: String,
}

/// Processed player data with guaranteed name field.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedPlayerData {
    pub name: String,
    pub country: Option<String>,
    pub seed: Option<i32>,
}

/// Processed score data with normalized values.
///
/// Includes both new (snake_case) and legacy (camelCase) property names
/// for backward compatibility with frontend code.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedScoreData {
    // New property names
    pub player1_sets: i32,
    pub player2_sets: i32,
    pub player1_games: i32,
    pub player2_games: i32,
    pub player1_points: String,
    pub player2_points: String,
    // Legacy property names for compatibility (serialized as camelCase)
    #[serde(rename = "player1Sets")]
    pub player1_sets_legacy: i32,
    #[serde(rename = "player2Sets")]
    pub player2_sets_legacy: i32,
    #[serde(rename = "player1Games")]
    pub player1_games_legacy: i32,
    #[serde(rename = "player2Games")]
    pub player2_games_legacy: i32,
    #[serde(rename = "player1Points")]
    pub player1_points_legacy: String,
    #[serde(rename = "player2Points")]
    pub player2_points_legacy: String,
}

/// Processed set data with guaranteed values.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedSetData {
    pub player1: i32,
    pub player2: i32,
}

/// Tennis data processor for normalizing raw tennis match data.
///
/// Handles:
/// - Multiple data format support (snake_case, camelCase)
/// - Player/team data extraction
/// - Score normalization
/// - Point value standardization
/// - Set data processing
pub struct TennisDataProcessor;

impl TennisDataProcessor {
    /// Processes raw tennis data into a standardized format.
    ///
    /// # Arguments
    /// * `raw_data` - Raw tennis data from API/WebSocket
    ///
    /// # Returns
    /// * `Ok(ProcessedTennisMatch)` - Successfully processed match data
    /// * `Err(String)` - Error message if processing fails
    ///
    /// # Process
    /// 1. Extracts match ID (from match_id or id field)
    /// 2. Processes player data (from player1/player2 or team1/team2)
    /// 3. Normalizes score data (handles both naming conventions)
    /// 4. Processes sets data
    /// 5. Extracts serving player and match state
    pub fn process_data(raw_data: RawTennisData) -> Result<ProcessedTennisMatch, String> {
        // Extract and validate basic match information
        let match_id = raw_data.match_id
            .or(raw_data.id)
            .unwrap_or_else(|| "unknown".to_string());

        // Process player data
        let player1 = Self::process_player_data(
            raw_data.player1.or(raw_data.team1),
            "Player 1"
        );
        let player2 = Self::process_player_data(
            raw_data.player2.or(raw_data.team2),
            "Player 2"
        );

        // Process score data
        let score = Self::process_score_data(raw_data.score);

        // Process sets data
        let sets = Self::process_sets_data(raw_data.sets.unwrap_or_default());

        // Extract serving and match state information
        let serving_player = Self::normalize_serving_player(
            raw_data.serving_player.or(raw_data.serving_player_camel)
        );
        let current_set = raw_data.current_set.or(raw_data.current_set_camel).unwrap_or(1);
        let is_tiebreak = raw_data.is_tiebreak.or(raw_data.is_tiebreak_camel).unwrap_or(false);
        let match_status = raw_data.match_status
            .or(raw_data.match_status_camel)
            .unwrap_or_else(|| "in_progress".to_string());

        Ok(ProcessedTennisMatch {
            match_id,
            player1,
            player2,
            score,
            sets,
            serving_player,
            current_set,
            is_tiebreak,
            match_status: match_status.clone(),
            // Legacy properties (for frontend compatibility)
            serving_player_legacy: serving_player,
            current_set_legacy: current_set,
            is_tiebreak_legacy: is_tiebreak,
            match_status_legacy: match_status,
        })
    }

    /// Processes raw player data into normalized format.
    ///
    /// # Arguments
    /// * `raw_player` - Optional raw player data
    /// * `default_name` - Default name if player data is missing
    ///
    /// # Returns
    /// Processed player data with guaranteed name field.
    fn process_player_data(raw_player: Option<RawPlayerData>, default_name: &str) -> ProcessedPlayerData {
        match raw_player {
            Some(player) => ProcessedPlayerData {
                name: player.name.unwrap_or_else(|| default_name.to_string()),
                country: player.country,
                seed: player.seed,
            },
            None => ProcessedPlayerData {
                name: default_name.to_string(),
                country: None,
                seed: None,
            }
        }
    }

    /// Processes raw score data into normalized format.
    ///
    /// Handles both snake_case and camelCase property names.
    /// Normalizes point values (0, 15, 30, 40, AD).
    ///
    /// # Arguments
    /// * `raw_score` - Optional raw score data
    ///
    /// # Returns
    /// Processed score data with all fields guaranteed to have values.
    fn process_score_data(raw_score: Option<RawScoreData>) -> ProcessedScoreData {
        let default_score = RawScoreData {
            player1_sets: Some(0),
            player1_sets_camel: Some(0),
            player2_sets: Some(0),
            player2_sets_camel: Some(0),
            player1_games: Some(0),
            player1_games_camel: Some(0),
            player2_games: Some(0),
            player2_games_camel: Some(0),
            player1_points: Some("0".to_string()),
            player1_points_camel: Some("0".to_string()),
            player2_points: Some("0".to_string()),
            player2_points_camel: Some("0".to_string()),
        };

        let score = raw_score.unwrap_or(default_score);

        let player1_sets = score.player1_sets.or(score.player1_sets_camel).unwrap_or(0);
        let player2_sets = score.player2_sets.or(score.player2_sets_camel).unwrap_or(0);
        let player1_games = score.player1_games.or(score.player1_games_camel).unwrap_or(0);
        let player2_games = score.player2_games.or(score.player2_games_camel).unwrap_or(0);
        let player1_points = Self::normalize_points(
            score.player1_points.as_ref()
                .or(score.player1_points_camel.as_ref())
                .map(|s| s.as_str())
                .unwrap_or("0")
        );
        let player2_points = Self::normalize_points(
            score.player2_points.as_ref()
                .or(score.player2_points_camel.as_ref())
                .map(|s| s.as_str())
                .unwrap_or("0")
        );

        ProcessedScoreData {
            player1_sets,
            player2_sets,
            player1_games,
            player2_games,
            player1_points: player1_points.clone(),
            player2_points: player2_points.clone(),
            // Legacy properties (for frontend compatibility)
            player1_sets_legacy: player1_sets,
            player2_sets_legacy: player2_sets,
            player1_games_legacy: player1_games,
            player2_games_legacy: player2_games,
            player1_points_legacy: player1_points,
            player2_points_legacy: player2_points,
        }
    }

    /// Processes raw sets data into normalized format.
    ///
    /// Converts HashMap of raw set data to processed set data.
    ///
    /// # Arguments
    /// * `raw_sets` - HashMap of set keys to raw set data
    ///
    /// # Returns
    /// HashMap of set keys to processed set data with guaranteed values.
    fn process_sets_data(raw_sets: HashMap<String, RawSetData>) -> HashMap<String, ProcessedSetData> {
        raw_sets.into_iter()
            .map(|(key, set_data)| {
                let processed_set = ProcessedSetData {
                    player1: set_data.player1.unwrap_or(0),
                    player2: set_data.player2.unwrap_or(0),
                };
                (key, processed_set)
            })
            .collect()
    }

    /// Normalizes tennis point values to standard format.
    ///
    /// Converts various point representations:
    /// - "love" -> "0"
    /// - "a", "ad", "advantage" -> "AD"
    /// - Numbers -> string representation
    ///
    /// # Arguments
    /// * `points` - Point value string
    ///
    /// # Returns
    /// Normalized point string (0, 15, 30, 40, or AD)
    fn normalize_points(points: &str) -> String {
        match points.to_lowercase().as_str() {
            "0" => "0".to_string(),
            "15" => "15".to_string(),
            "30" => "30".to_string(),
            "40" => "40".to_string(),
            "a" | "ad" | "advantage" => "AD".to_string(),
            "love" => "0".to_string(),
            _ => points.to_string(),
        }
    }

    /// Normalizes serving player number.
    ///
    /// Clamps value between 1 and 4 (valid player numbers).
    ///
    /// # Arguments
    /// * `serving_player` - Optional serving player number
    ///
    /// # Returns
    /// Serving player number (1-4), defaults to 1 if None
    fn normalize_serving_player(serving_player: Option<i32>) -> i32 {
        serving_player.unwrap_or(1).clamp(1, 4)
    }
}

/// Batch processor for multiple tennis matches.
///
/// Processes multiple matches sequentially, continuing even if individual
/// matches fail to process.
pub struct BatchTennisProcessor;

impl BatchTennisProcessor {
    /// Processes a batch of raw tennis data.
    ///
    /// # Arguments
    /// * `raw_data_batch` - Vector of raw tennis data to process
    ///
    /// # Returns
    /// * `Ok(Vec<ProcessedTennisMatch>)` - Vector of successfully processed matches
    /// * `Err(String)` - Error message if batch processing fails
    ///
    /// # Note
    /// Individual match processing errors are logged but don't stop the batch.
    /// Only successfully processed matches are included in the result.
    pub fn process_batch(raw_data_batch: Vec<RawTennisData>) -> Result<Vec<ProcessedTennisMatch>, String> {
        let mut results = Vec::new();

        for raw_data in raw_data_batch {
            match TennisDataProcessor::process_data(raw_data) {
                Ok(processed) => results.push(processed),
                Err(error) => {
                    eprintln!("Error processing tennis data: {}", error);
                    // Continue processing other items
                }
            }
        }

        Ok(results)
    }
}

// === Tauri Commands ===

/// Tauri command: Process a single tennis match data.
///
/// This is the main entry point for processing tennis data from the frontend.
/// It processes raw tennis data through the Rust backend for high performance.
///
/// # Arguments
/// * `raw_data` - Raw tennis data from frontend
///
/// # Returns
/// * `Ok(ProcessedTennisMatch)` - Processed match data
/// * `Err(String)` - Error message
#[command]
pub async fn process_tennis_data(raw_data: RawTennisData) -> Result<ProcessedTennisMatch, String> {
    println!("🎾 Processing tennis data via Rust backend");
    TennisDataProcessor::process_data(raw_data)
}

/// Tauri command: Process multiple tennis matches in batch.
///
/// Processes multiple matches efficiently, useful for bulk operations.
///
/// # Arguments
/// * `raw_data_batch` - Vector of raw tennis data
///
/// # Returns
/// * `Ok(Vec<ProcessedTennisMatch>)` - Vector of processed matches
/// * `Err(String)` - Error message
#[command]
pub async fn process_tennis_data_batch(raw_data_batch: Vec<RawTennisData>) -> Result<Vec<ProcessedTennisMatch>, String> {
    println!("🎾 Batch processing {} tennis matches via Rust backend", raw_data_batch.len());
    BatchTennisProcessor::process_batch(raw_data_batch)
}

/// Tauri command: Validate tennis data structure.
///
/// Performs basic validation to check if data has required fields.
///
/// # Arguments
/// * `raw_data` - Raw tennis data to validate
///
/// # Returns
/// * `Ok(true)` - Data is valid
/// * `Ok(false)` - Data is invalid (missing required fields)
/// * `Err(String)` - Validation error
///
/// # Validation Rules
/// - Must have match_id or id field
/// - Must have at least one player (player1 or team1)
#[command]
pub async fn validate_tennis_data(raw_data: RawTennisData) -> Result<bool, String> {
    // Basic validation - check if required fields are present
    if raw_data.id.is_none() && raw_data.match_id.is_none() {
        return Ok(false);
    }

    // Check if we have at least one player
    if raw_data.player1.is_none() && raw_data.team1.is_none() {
        return Ok(false);
    }

    Ok(true)
}
