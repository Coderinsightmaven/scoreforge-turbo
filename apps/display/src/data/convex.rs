use std::collections::BTreeMap;

use convex::base_client::FunctionResult;
use convex::{ConvexClient, Value};
use futures::StreamExt;
use tokio::sync::mpsc;

use super::live_data::{
    BracketInfo, LiveDataCommand, LiveDataMessage, MatchInfo, SetScore, TennisLiveData,
    TournamentInfo,
};

/// Manages the background tokio runtime and Convex client communication.
pub struct ConvexManager {
    pub command_tx: mpsc::UnboundedSender<LiveDataCommand>,
    pub message_rx: mpsc::UnboundedReceiver<LiveDataMessage>,
    _runtime: tokio::runtime::Runtime,
}

impl ConvexManager {
    pub fn new() -> Self {
        let (command_tx, command_rx) = mpsc::unbounded_channel();
        let (message_tx, message_rx) = mpsc::unbounded_channel();

        let runtime = tokio::runtime::Runtime::new().expect("Failed to create tokio runtime");

        runtime.spawn(convex_task(command_rx, message_tx));

        Self {
            command_tx,
            message_rx,
            _runtime: runtime,
        }
    }

    pub fn send_command(&self, cmd: LiveDataCommand) {
        let _ = self.command_tx.send(cmd);
    }

    pub fn try_recv(&mut self) -> Option<LiveDataMessage> {
        self.message_rx.try_recv().ok()
    }
}

async fn convex_task(
    mut command_rx: mpsc::UnboundedReceiver<LiveDataCommand>,
    message_tx: mpsc::UnboundedSender<LiveDataMessage>,
) {
    tracing::info!("Convex background task started");

    let mut client: Option<ConvexClient> = None;
    let mut api_key: Option<String> = None;
    let mut selected_tournament_id: Option<String> = None;

    while let Some(cmd) = command_rx.recv().await {
        match cmd {
            LiveDataCommand::Connect { url, api_key: key } => {
                tracing::info!("Connecting to Convex: {}", url);
                match ConvexClient::new(&url).await {
                    Ok(c) => {
                        client = Some(c);
                        api_key = Some(key.clone());
                        let _ = message_tx.send(LiveDataMessage::Connected);

                        // Fetch tournaments via mutation
                        if let Some(ref mut c) = client {
                            let args: BTreeMap<String, Value> =
                                maplit::btreemap! { "apiKey".into() => key.into() };
                            match c.mutation("publicApi:listTournaments", args).await {
                                Ok(FunctionResult::Value(val)) => {
                                    let tournaments = parse_tournament_list(&val);
                                    let _ = message_tx
                                        .send(LiveDataMessage::TournamentList(tournaments));
                                }
                                Ok(FunctionResult::ErrorMessage(e)) => {
                                    let _ = message_tx.send(LiveDataMessage::Error(e));
                                }
                                Ok(FunctionResult::ConvexError(e)) => {
                                    let _ =
                                        message_tx.send(LiveDataMessage::Error(format!("{:?}", e)));
                                }
                                Err(e) => {
                                    let _ = message_tx.send(LiveDataMessage::Error(format!(
                                        "Connection error: {e}"
                                    )));
                                }
                            }
                        }
                    }
                    Err(e) => {
                        let _ = message_tx
                            .send(LiveDataMessage::Error(format!("Failed to connect: {e}")));
                    }
                }
            }
            LiveDataCommand::SelectTournament(tournament_id) => {
                tracing::info!("Selected tournament: {}", tournament_id);
                selected_tournament_id = Some(tournament_id.clone());
                if let (Some(c), Some(key)) = (&mut client, &api_key) {
                    let args: BTreeMap<String, Value> = maplit::btreemap! {
                        "apiKey".into() => key.clone().into(),
                        "tournamentId".into() => tournament_id.into(),
                    };
                    match c.mutation("publicApi:listBrackets", args).await {
                        Ok(FunctionResult::Value(val)) => {
                            let brackets = parse_bracket_list(&val);
                            let _ = message_tx.send(LiveDataMessage::BracketList(brackets));
                        }
                        Ok(FunctionResult::ErrorMessage(e)) => {
                            let _ = message_tx.send(LiveDataMessage::Error(e));
                        }
                        Ok(FunctionResult::ConvexError(e)) => {
                            let _ = message_tx.send(LiveDataMessage::Error(format!("{:?}", e)));
                        }
                        Err(e) => {
                            let _ = message_tx
                                .send(LiveDataMessage::Error(format!("Fetch error: {e}")));
                        }
                    }
                }
            }
            LiveDataCommand::SelectBracket(bracket_id) => {
                tracing::info!("Selected bracket: {}", bracket_id);
                if let (Some(c), Some(key), Some(tid)) =
                    (&mut client, &api_key, &selected_tournament_id)
                {
                    let args: BTreeMap<String, Value> = maplit::btreemap! {
                        "apiKey".into() => key.clone().into(),
                        "tournamentId".into() => tid.clone().into(),
                        "bracketId".into() => bracket_id.into(),
                    };
                    match c.mutation("publicApi:listMatches", args).await {
                        Ok(FunctionResult::Value(val)) => {
                            let matches = parse_match_list(&val);
                            let _ = message_tx.send(LiveDataMessage::MatchList(matches));
                        }
                        Ok(FunctionResult::ErrorMessage(e)) => {
                            let _ = message_tx.send(LiveDataMessage::Error(e));
                        }
                        Ok(FunctionResult::ConvexError(e)) => {
                            let _ = message_tx.send(LiveDataMessage::Error(format!("{:?}", e)));
                        }
                        Err(e) => {
                            let _ = message_tx
                                .send(LiveDataMessage::Error(format!("Fetch error: {e}")));
                        }
                    }
                }
            }
            LiveDataCommand::SelectMatch(match_id) => {
                tracing::info!("Subscribing to match: {}", match_id);
                if let (Some(c), Some(key)) = (&mut client, &api_key) {
                    let args: BTreeMap<String, Value> = maplit::btreemap! {
                        "apiKey".into() => key.clone().into(),
                        "matchId".into() => match_id.into(),
                    };

                    // Subscribe to watchMatch query for real-time updates
                    match c.subscribe("publicApi:watchMatch", args).await {
                        Ok(mut sub) => {
                            let tx = message_tx.clone();
                            // Spawn a task to forward subscription updates
                            tokio::spawn(async move {
                                while let Some(result) = sub.next().await {
                                    match result {
                                        FunctionResult::Value(val) => {
                                            if let Some(data) = parse_match_data(&val) {
                                                let _ = tx
                                                    .send(LiveDataMessage::MatchDataUpdated(data));
                                            } else if let Some(err) = get_error_string(&val) {
                                                let _ = tx.send(LiveDataMessage::Error(err));
                                            }
                                        }
                                        FunctionResult::ErrorMessage(e) => {
                                            let _ = tx.send(LiveDataMessage::Error(e));
                                            break;
                                        }
                                        FunctionResult::ConvexError(e) => {
                                            let _ =
                                                tx.send(LiveDataMessage::Error(format!("{:?}", e)));
                                            break;
                                        }
                                    }
                                }
                                let _ = tx.send(LiveDataMessage::Disconnected);
                            });
                        }
                        Err(e) => {
                            let _ = message_tx
                                .send(LiveDataMessage::Error(format!("Subscribe error: {e}")));
                        }
                    }
                }
            }
            LiveDataCommand::Disconnect => {
                tracing::info!("Disconnecting from Convex");
                client = None;
                api_key = None;
                let _ = message_tx.send(LiveDataMessage::Disconnected);
            }
        }
    }
}

// --- Value parsing helpers ---

fn get_str(obj: &BTreeMap<String, Value>, key: &str) -> Option<String> {
    match obj.get(key)? {
        Value::String(s) => Some(s.clone()),
        _ => None,
    }
}


fn get_obj<'a>(obj: &'a BTreeMap<String, Value>, key: &str) -> Option<&'a BTreeMap<String, Value>> {
    match obj.get(key)? {
        Value::Object(o) => Some(o),
        _ => None,
    }
}

fn get_array<'a>(obj: &'a BTreeMap<String, Value>, key: &str) -> Option<&'a Vec<Value>> {
    match obj.get(key)? {
        Value::Array(a) => Some(a),
        _ => None,
    }
}

fn get_error_string(val: &Value) -> Option<String> {
    if let Value::Object(obj) = val {
        get_str(obj, "error")
    } else {
        None
    }
}

fn parse_tournament_list(val: &Value) -> Vec<TournamentInfo> {
    let Value::Object(obj) = val else {
        return vec![];
    };

    // Check for error
    if get_str(obj, "error").is_some() {
        return vec![];
    }

    let Some(tournaments) = get_array(obj, "tournaments") else {
        return vec![];
    };

    tournaments
        .iter()
        .filter_map(|t| {
            let Value::Object(t_obj) = t else {
                return None;
            };
            Some(TournamentInfo {
                id: get_str(t_obj, "id")?,
                name: get_str(t_obj, "name")?,
                status: get_str(t_obj, "status").unwrap_or_else(|| "unknown".to_string()),
            })
        })
        .collect()
}

fn parse_bracket_list(val: &Value) -> Vec<BracketInfo> {
    let Value::Object(obj) = val else {
        return vec![];
    };

    if get_str(obj, "error").is_some() {
        return vec![];
    }

    let Some(brackets) = get_array(obj, "brackets") else {
        return vec![];
    };

    brackets
        .iter()
        .filter_map(|b| {
            let Value::Object(b_obj) = b else {
                return None;
            };
            let match_count = match b_obj.get("matchCount") {
                Some(Value::Int64(n)) => *n as usize,
                Some(Value::Float64(n)) => *n as usize,
                _ => 0,
            };
            Some(BracketInfo {
                id: get_str(b_obj, "id")?,
                name: get_str(b_obj, "name")?,
                status: get_str(b_obj, "status").unwrap_or_else(|| "unknown".to_string()),
                match_count,
                participant_type: get_str(b_obj, "participantType")
                    .unwrap_or_else(|| "individual".to_string()),
            })
        })
        .collect()
}

fn parse_match_list(val: &Value) -> Vec<MatchInfo> {
    let Value::Object(obj) = val else {
        return vec![];
    };

    if get_str(obj, "error").is_some() {
        return vec![];
    }

    let Some(matches) = get_array(obj, "matches") else {
        return vec![];
    };

    matches
        .iter()
        .filter_map(|m| {
            let Value::Object(m_obj) = m else {
                return None;
            };
            // Filter out matches where either participant is missing (TBD)
            let p1_name = get_obj(m_obj, "participant1")
                .and_then(|p| get_str(p, "displayName"))?;
            let p2_name = get_obj(m_obj, "participant2")
                .and_then(|p| get_str(p, "displayName"))?;

            Some(MatchInfo {
                id: get_str(m_obj, "id")?,
                player1_name: p1_name,
                player2_name: p2_name,
                court: get_str(m_obj, "court"),
                status: get_str(m_obj, "status").unwrap_or_else(|| "unknown".to_string()),
            })
        })
        .collect()
}

fn parse_match_data(val: &Value) -> Option<TennisLiveData> {
    let Value::Object(root) = val else {
        return None;
    };

    let match_obj = get_obj(root, "match")?;

    // Get participant names
    let p1 = get_obj(match_obj, "participant1");
    let p2 = get_obj(match_obj, "participant2");

    let player1_display_name = p1
        .and_then(|p| get_str(p, "displayName"))
        .unwrap_or_else(|| "Player 1".to_string());
    let player2_display_name = p2
        .and_then(|p| get_str(p, "displayName"))
        .unwrap_or_else(|| "Player 2".to_string());

    // Individual name: playerName (singles) or player1Name (doubles), falling back to displayName
    let player1_name = p1
        .and_then(|p| get_str(p, "playerName").or_else(|| get_str(p, "player1Name")))
        .unwrap_or_else(|| player1_display_name.clone());
    let player2_name = p2
        .and_then(|p| get_str(p, "playerName").or_else(|| get_str(p, "player1Name")))
        .unwrap_or_else(|| player2_display_name.clone());

    // Tennis state
    let tennis_state = get_obj(match_obj, "tennisState");

    let (sets, current_game_points, tiebreak_points, serving_player, is_tiebreak, is_match_complete) =
        if let Some(ts) = tennis_state {
            let sets = parse_sets(ts);
            let game_points = parse_game_points(ts);
            let tiebreak_points = parse_tiebreak_points(ts);
            let serving = parse_serving_player(ts);
            let tiebreak = matches!(ts.get("isTiebreak"), Some(Value::Boolean(true)));
            let complete = matches!(ts.get("isMatchComplete"), Some(Value::Boolean(true)));
            (sets, game_points, tiebreak_points, serving, tiebreak, complete)
        } else {
            (vec![], [0, 0], [0, 0], 1, false, false)
        };

    Some(TennisLiveData {
        player1_name,
        player2_name,
        player1_display_name,
        player2_display_name,
        sets,
        current_game_points,
        tiebreak_points,
        serving_player,
        is_tiebreak,
        is_match_complete,
    })
}

fn value_to_u32(v: &Value) -> Option<u32> {
    match v {
        Value::Int64(n) => Some(*n as u32),
        Value::Float64(n) => Some(*n as u32),
        _ => None,
    }
}

fn parse_sets(ts: &BTreeMap<String, Value>) -> Vec<SetScore> {
    let mut result = Vec::new();

    // sets is an array of [p1Games, p2Games] arrays, e.g. [[6, 4], [7, 5]]
    if let Some(sets_arr) = get_array(ts, "sets") {
        for set_val in sets_arr {
            if let Value::Array(pair) = set_val {
                let p1 = pair.first().and_then(value_to_u32);
                let p2 = pair.get(1).and_then(value_to_u32);
                if let (Some(g1), Some(g2)) = (p1, p2) {
                    result.push(SetScore {
                        player1_games: g1,
                        player2_games: g2,
                    });
                }
            }
        }
    }

    // Add current set from currentSetGames [p1Games, p2Games]
    if let Some(current) = get_array(ts, "currentSetGames") {
        let p1 = current.first().and_then(value_to_u32);
        let p2 = current.get(1).and_then(value_to_u32);
        if let (Some(g1), Some(g2)) = (p1, p2) {
            result.push(SetScore {
                player1_games: g1,
                player2_games: g2,
            });
        }
    }

    result
}

fn parse_game_points(ts: &BTreeMap<String, Value>) -> [u32; 2] {
    if let Some(points) = get_array(ts, "currentGamePoints") {
        let p1 = points.first().and_then(value_to_u32);
        let p2 = points.get(1).and_then(value_to_u32);
        [p1.unwrap_or(0), p2.unwrap_or(0)]
    } else {
        [0, 0]
    }
}

fn parse_tiebreak_points(ts: &BTreeMap<String, Value>) -> [u32; 2] {
    if let Some(points) = get_array(ts, "tiebreakPoints") {
        let p1 = points.first().and_then(value_to_u32);
        let p2 = points.get(1).and_then(value_to_u32);
        [p1.unwrap_or(0), p2.unwrap_or(0)]
    } else {
        [0, 0]
    }
}

fn parse_serving_player(ts: &BTreeMap<String, Value>) -> u8 {
    match ts.get("servingParticipant") {
        Some(Value::Int64(n)) => *n as u8,
        Some(Value::Float64(n)) => *n as u8,
        _ => 1,
    }
}
