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
