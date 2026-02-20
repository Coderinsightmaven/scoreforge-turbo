use std::collections::{BTreeMap, BTreeSet};
use std::time::Duration;

use convex::base_client::FunctionResult;
use convex::{ConvexClient, Value};
use futures::StreamExt;
use tokio::sync::mpsc;
use tokio::task::JoinHandle;

use super::live_data::{
    LiveDataCommand, LiveDataMessage, SetScore, TennisLiveData, TournamentInfo,
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
    let mut subscription_task: Option<JoinHandle<()>> = None;
    let mut pairing_poll_task: Option<JoinHandle<()>> = None;

    while let Some(cmd) = command_rx.recv().await {
        match cmd {
            LiveDataCommand::StartPairing { url } => {
                if let Some(task) = pairing_poll_task.take() {
                    task.abort();
                }

                match ConvexClient::new(&url).await {
                    Ok(mut pairing_client) => {
                        let args: BTreeMap<String, Value> = maplit::btreemap! {};
                        match pairing_client.mutation("devicePairing:startPairing", args).await {
                            Ok(FunctionResult::Value(val)) => {
                                if let Some((pairing_id, pairing_code, pairing_secret, expires_at, poll_interval)) =
                                    parse_pairing_start(&val)
                                {
                                    let _ = message_tx.send(LiveDataMessage::PairingStarted {
                                        pairing_code,
                                        expires_at,
                                    });

                                    let tx = message_tx.clone();
                                    pairing_poll_task = Some(tokio::spawn(async move {
                                        loop {
                                            tokio::time::sleep(Duration::from_millis(
                                                poll_interval.max(500),
                                            ))
                                            .await;

                                            let poll_args: BTreeMap<String, Value> = maplit::btreemap! {
                                                "pairingId".into() => pairing_id.clone().into(),
                                                "pairingSecret".into() => pairing_secret.clone().into(),
                                            };

                                            match pairing_client
                                                .mutation("devicePairing:pollPairing", poll_args)
                                                .await
                                            {
                                                Ok(FunctionResult::Value(poll_val)) => {
                                                    match parse_pairing_poll(&poll_val) {
                                                        PairingPollStatus::Pending => {}
                                                        PairingPollStatus::Paired(api_key) => {
                                                            let _ = tx.send(
                                                                LiveDataMessage::PairingCompleted {
                                                                    api_key,
                                                                },
                                                            );
                                                            break;
                                                        }
                                                        PairingPollStatus::Expired => {
                                                            let _ = tx
                                                                .send(LiveDataMessage::PairingExpired);
                                                            break;
                                                        }
                                                        PairingPollStatus::Claimed => {
                                                            let _ = tx.send(LiveDataMessage::Error(
                                                                "Pairing was already claimed."
                                                                    .to_string(),
                                                            ));
                                                            break;
                                                        }
                                                        PairingPollStatus::Invalid => {
                                                            let _ = tx.send(LiveDataMessage::Error(
                                                                "Invalid pairing session."
                                                                    .to_string(),
                                                            ));
                                                            break;
                                                        }
                                                        PairingPollStatus::Unknown => {
                                                            let _ = tx.send(LiveDataMessage::Error(
                                                                "Unexpected pairing response."
                                                                    .to_string(),
                                                            ));
                                                            break;
                                                        }
                                                    }
                                                }
                                                Ok(FunctionResult::ErrorMessage(e)) => {
                                                    let _ = tx.send(LiveDataMessage::Error(e));
                                                    break;
                                                }
                                                Ok(FunctionResult::ConvexError(e)) => {
                                                    let _ = tx.send(LiveDataMessage::Error(
                                                        e.message.clone(),
                                                    ));
                                                    break;
                                                }
                                                Err(e) => {
                                                    let _ = tx.send(LiveDataMessage::Error(format!(
                                                        "Pairing poll failed: {e}"
                                                    )));
                                                    break;
                                                }
                                            }
                                        }
                                    }));
                                } else if let Some(err) = get_error_string(&val) {
                                    let _ = message_tx.send(LiveDataMessage::Error(err));
                                } else {
                                    let _ = message_tx.send(LiveDataMessage::Error(
                                        "Unexpected pairing response.".to_string(),
                                    ));
                                }
                            }
                            Ok(FunctionResult::ErrorMessage(e)) => {
                                let _ = message_tx.send(LiveDataMessage::Error(e));
                            }
                            Ok(FunctionResult::ConvexError(e)) => {
                                let _ = message_tx.send(LiveDataMessage::Error(e.message.clone()));
                            }
                            Err(e) => {
                                let _ = message_tx.send(LiveDataMessage::Error(format!(
                                    "Failed to start pairing: {e}"
                                )));
                            }
                        }
                    }
                    Err(e) => {
                        let _ = message_tx
                            .send(LiveDataMessage::Error(format!("Failed to connect: {e}")));
                    }
                }
            }
            LiveDataCommand::Connect { url, api_key: key } => {
                if let Some(task) = subscription_task.take() {
                    task.abort();
                }

                tracing::info!("Connecting to Convex: {}", url);
                match ConvexClient::new(&url).await {
                    Ok(c) => {
                        client = Some(c);
                        api_key = Some(key.clone());
                        let _ = message_tx.send(LiveDataMessage::Connected);

                        if let Some(ref mut c) = client {
                            let args: BTreeMap<String, Value> =
                                maplit::btreemap! { "apiKey".into() => key.into() };
                            match c.mutation("publicApi:listTournaments", args).await {
                                Ok(FunctionResult::Value(val)) => {
                                    if let Some(err) = get_error_string(&val) {
                                        let _ = message_tx.send(LiveDataMessage::Error(err));
                                    } else {
                                        let tournaments = parse_tournament_list(&val);
                                        let _ = message_tx
                                            .send(LiveDataMessage::TournamentList(tournaments));
                                    }
                                }
                                Ok(FunctionResult::ErrorMessage(e)) => {
                                    let _ = message_tx.send(LiveDataMessage::Error(e));
                                }
                                Ok(FunctionResult::ConvexError(e)) => {
                                    let _ =
                                        message_tx.send(LiveDataMessage::Error(e.message.clone()));
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
                    match c.mutation("publicApi:listMatches", args).await {
                        Ok(FunctionResult::Value(val)) => {
                            if let Some(err) = get_error_string(&val) {
                                let _ = message_tx.send(LiveDataMessage::Error(err));
                            } else {
                                let courts = parse_court_list(&val);
                                let _ = message_tx.send(LiveDataMessage::CourtList(courts));
                            }
                        }
                        Ok(FunctionResult::ErrorMessage(e)) => {
                            let _ = message_tx.send(LiveDataMessage::Error(e));
                        }
                        Ok(FunctionResult::ConvexError(e)) => {
                            let _ = message_tx.send(LiveDataMessage::Error(e.message.clone()));
                        }
                        Err(e) => {
                            let _ = message_tx
                                .send(LiveDataMessage::Error(format!("Fetch error: {e}")));
                        }
                    }
                }
            }
            LiveDataCommand::SelectCourt(court) => {
                tracing::info!("Subscribing to court: {}", court);
                if let Some(task) = subscription_task.take() {
                    task.abort();
                }

                if let (Some(c), Some(key), Some(tid)) =
                    (&mut client, &api_key, &selected_tournament_id)
                {
                    let args: BTreeMap<String, Value> = maplit::btreemap! {
                        "apiKey".into() => key.clone().into(),
                        "tournamentId".into() => tid.clone().into(),
                        "court".into() => court.into(),
                    };

                    match c.subscribe("publicApi:watchCourt", args).await {
                        Ok(mut sub) => {
                            let tx = message_tx.clone();
                            subscription_task = Some(tokio::spawn(async move {
                                while let Some(result) = sub.next().await {
                                    match result {
                                        FunctionResult::Value(val) => {
                                            if let Some(data) = parse_match_data(&val) {
                                                let _ = tx
                                                    .send(LiveDataMessage::MatchDataUpdated(data));
                                            } else if is_waiting_for_court_match(&val) {
                                                let _ = tx.send(LiveDataMessage::CourtNoActiveMatch);
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
                                                tx.send(LiveDataMessage::Error(e.message.clone()));
                                            break;
                                        }
                                    }
                                }
                                let _ = tx.send(LiveDataMessage::Disconnected);
                            }));
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
                if let Some(task) = subscription_task.take() {
                    task.abort();
                }
                if let Some(task) = pairing_poll_task.take() {
                    task.abort();
                }
                client = None;
                api_key = None;
                selected_tournament_id = None;
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

fn get_i64(obj: &BTreeMap<String, Value>, key: &str) -> Option<i64> {
    match obj.get(key)? {
        Value::Int64(n) => Some(*n),
        Value::Float64(n) => Some(*n as i64),
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

fn parse_court_list(val: &Value) -> Vec<String> {
    let Value::Object(obj) = val else {
        return vec![];
    };

    let mut courts = BTreeSet::new();
    if let Some(tournament_obj) = get_obj(obj, "tournament") {
        if let Some(court_values) = get_array(tournament_obj, "courts") {
            for court_value in court_values {
                if let Value::String(court) = court_value {
                    if !court.trim().is_empty() {
                        courts.insert(court.clone());
                    }
                }
            }
        }
    }

    if let Some(matches) = get_array(obj, "matches") {
        for m in matches {
            let Value::Object(m_obj) = m else {
                continue;
            };
            if let Some(court) = get_str(m_obj, "court") {
                if !court.trim().is_empty() {
                    courts.insert(court);
                }
            }
        }
    }

    courts.into_iter().collect()
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

    let (
        sets,
        current_game_points,
        tiebreak_points,
        serving_player,
        is_tiebreak,
        is_match_complete,
        aces,
        double_faults,
        match_started_timestamp,
        match_completed_at,
    ) = if let Some(ts) = tennis_state {
        let sets = parse_sets(ts);
        let game_points = parse_game_points(ts);
        let tiebreak_points = parse_tiebreak_points(ts);
        let serving = parse_serving_player(ts);
        let tiebreak = matches!(ts.get("isTiebreak"), Some(Value::Boolean(true)));
        let complete = matches!(ts.get("isMatchComplete"), Some(Value::Boolean(true)));
        let aces = parse_u32_pair(ts, "aces");
        let double_faults = parse_u32_pair(ts, "doubleFaults");
        let match_started_timestamp = get_i64(ts, "matchStartedTimestamp").map(|v| v as u64);
        let match_completed_at = get_i64(ts, "completedAt").map(|v| v as u64);
        (
            sets,
            game_points,
            tiebreak_points,
            serving,
            tiebreak,
            complete,
            aces,
            double_faults,
            match_started_timestamp,
            match_completed_at,
        )
    } else {
        (vec![], [0, 0], [0, 0], 1, false, false, [0, 0], [0, 0], None, None)
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
        aces,
        double_faults,
        match_started_timestamp,
        match_completed_at,
    })
}

fn is_waiting_for_court_match(val: &Value) -> bool {
    let Value::Object(root) = val else {
        return false;
    };
    matches!(root.get("match"), Some(Value::Null))
}

fn parse_pairing_start(val: &Value) -> Option<(String, String, String, i64, u64)> {
    let Value::Object(obj) = val else {
        return None;
    };

    let pairing_id = get_str(obj, "pairingId")?;
    let pairing_code = get_str(obj, "pairingCode")?;
    let pairing_secret = get_str(obj, "pairingSecret")?;
    let expires_at = get_i64(obj, "expiresAt")?;
    let poll_interval = get_i64(obj, "pollIntervalMs")?.max(0) as u64;

    Some((pairing_id, pairing_code, pairing_secret, expires_at, poll_interval))
}

enum PairingPollStatus {
    Pending,
    Paired(String),
    Claimed,
    Expired,
    Invalid,
    Unknown,
}

fn parse_pairing_poll(val: &Value) -> PairingPollStatus {
    let Value::Object(obj) = val else {
        return PairingPollStatus::Unknown;
    };

    let Some(status) = get_str(obj, "status") else {
        return PairingPollStatus::Unknown;
    };

    match status.as_str() {
        "pending" => PairingPollStatus::Pending,
        "paired" => get_str(obj, "apiKey")
            .map(PairingPollStatus::Paired)
            .unwrap_or(PairingPollStatus::Unknown),
        "claimed" => PairingPollStatus::Claimed,
        "expired" => PairingPollStatus::Expired,
        "invalid" => PairingPollStatus::Invalid,
        _ => PairingPollStatus::Unknown,
    }
}

fn parse_u32_pair(obj: &BTreeMap<String, Value>, key: &str) -> [u32; 2] {
    if let Some(arr) = get_array(obj, key) {
        let p1 = arr.first().and_then(value_to_u32);
        let p2 = arr.get(1).and_then(value_to_u32);
        [p1.unwrap_or(0), p2.unwrap_or(0)]
    } else {
        [0, 0]
    }
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
