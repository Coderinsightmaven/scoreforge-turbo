use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TennisLiveData {
    /// Individual player name (from playerName or player1Name)
    pub player1_name: String,
    pub player2_name: String,
    /// Full display name including partner for doubles (from displayName)
    pub player1_display_name: String,
    pub player2_display_name: String,
    pub sets: Vec<SetScore>,
    pub current_game_points: [u32; 2],
    pub serving_player: u8,
    pub is_tiebreak: bool,
    pub is_match_complete: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetScore {
    pub player1_games: u32,
    pub player2_games: u32,
}

#[derive(Debug, Clone)]
pub struct TournamentInfo {
    pub id: String,
    pub name: String,
    pub status: String,
}

#[derive(Debug, Clone)]
pub struct BracketInfo {
    pub id: String,
    pub name: String,
    pub status: String,
    pub match_count: usize,
    pub participant_type: String,
}

#[derive(Debug, Clone)]
pub struct MatchInfo {
    pub id: String,
    pub player1_name: String,
    pub player2_name: String,
    pub court: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone)]
pub enum LiveDataCommand {
    Connect { url: String, api_key: String },
    SelectTournament(String),
    SelectBracket(String),
    SelectMatch(String),
    Disconnect,
}

#[derive(Debug, Clone)]
pub enum LiveDataMessage {
    Connected,
    TournamentList(Vec<TournamentInfo>),
    BracketList(Vec<BracketInfo>),
    MatchList(Vec<MatchInfo>),
    MatchDataUpdated(TennisLiveData),
    Error(String),
    Disconnected,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ConnectionStep {
    Disconnected,
    Connecting,
    SelectTournament,
    SelectBracket,
    SelectMatch,
    Live,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tennis_live_data_serde_round_trip() {
        let data = TennisLiveData {
            player1_name: "Alice".to_string(),
            player2_name: "Bob".to_string(),
            player1_display_name: "Alice Smith".to_string(),
            player2_display_name: "Bob Jones".to_string(),
            sets: vec![
                SetScore { player1_games: 6, player2_games: 4 },
                SetScore { player1_games: 3, player2_games: 6 },
            ],
            current_game_points: [2, 1],
            serving_player: 1,
            is_tiebreak: false,
            is_match_complete: false,
        };
        let json = serde_json::to_string(&data).unwrap();
        let deserialized: TennisLiveData = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.player1_name, "Alice");
        assert_eq!(deserialized.player2_name, "Bob");
        assert_eq!(deserialized.sets.len(), 2);
        assert_eq!(deserialized.sets[0].player1_games, 6);
        assert_eq!(deserialized.current_game_points, [2, 1]);
        assert_eq!(deserialized.serving_player, 1);
        assert!(!deserialized.is_tiebreak);
        assert!(!deserialized.is_match_complete);
    }

    #[test]
    fn set_score_serde_round_trip() {
        let score = SetScore { player1_games: 7, player2_games: 5 };
        let json = serde_json::to_string(&score).unwrap();
        let deserialized: SetScore = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.player1_games, 7);
        assert_eq!(deserialized.player2_games, 5);
    }

    #[test]
    fn tennis_live_data_empty_sets() {
        let data = TennisLiveData {
            player1_name: "A".to_string(),
            player2_name: "B".to_string(),
            player1_display_name: "A".to_string(),
            player2_display_name: "B".to_string(),
            sets: vec![],
            current_game_points: [0, 0],
            serving_player: 2,
            is_tiebreak: false,
            is_match_complete: false,
        };
        let json = serde_json::to_string(&data).unwrap();
        let deserialized: TennisLiveData = serde_json::from_str(&json).unwrap();
        assert!(deserialized.sets.is_empty());
        assert_eq!(deserialized.serving_player, 2);
    }

    #[test]
    fn connection_step_equality() {
        assert_eq!(ConnectionStep::Disconnected, ConnectionStep::Disconnected);
        assert_ne!(ConnectionStep::Disconnected, ConnectionStep::Live);
        assert_eq!(ConnectionStep::Live, ConnectionStep::Live);
    }
}
