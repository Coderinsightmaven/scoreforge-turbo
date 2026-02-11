use egui::Rect;

use super::{ComponentStyle, ComponentType};
use crate::data::live_data::TennisLiveData;

fn points_to_display(points: u32) -> &'static str {
    match points {
        0 => "0",
        1 => "15",
        2 => "30",
        3 => "40",
        _ => "AD",
    }
}

pub fn render_tennis_score(
    painter: &egui::Painter,
    rect: Rect,
    score_type: &ComponentType,
    player_number: u8,
    set_number: u8,
    style: &ComponentStyle,
    live_data: Option<&TennisLiveData>,
    zoom: f32,
) {
    let idx = if player_number == 1 { 0 } else { 1 };

    let display_text = if let Some(data) = live_data {
        match score_type {
            ComponentType::TennisGameScore => {
                if data.is_tiebreak {
                    data.tiebreak_points[idx].to_string()
                } else {
                    points_to_display(data.current_game_points[idx]).to_string()
                }
            }
            ComponentType::TennisSetScore => {
                // set_number 0 = current (last) set, 1+ = specific set
                let set = if set_number == 0 {
                    data.sets.last()
                } else {
                    data.sets.get((set_number - 1) as usize)
                };
                if let Some(s) = set {
                    let games = if idx == 0 {
                        s.player1_games
                    } else {
                        s.player2_games
                    };
                    games.to_string()
                } else {
                    String::new()
                }
            }
            ComponentType::TennisMatchScore => {
                let sets_won = data
                    .sets
                    .iter()
                    .filter(|s| {
                        if idx == 0 {
                            s.player1_games > s.player2_games
                        } else {
                            s.player2_games > s.player1_games
                        }
                    })
                    .count();
                sets_won.to_string()
            }
            _ => "?".to_string(),
        }
    } else {
        // Placeholder when no live data
        match score_type {
            ComponentType::TennisGameScore => "0".to_string(),
            ComponentType::TennisSetScore => "0".to_string(),
            ComponentType::TennisMatchScore => "0".to_string(),
            _ => "?".to_string(),
        }
    };

    super::text::render_aligned_text(painter, rect, &display_text, style, zoom);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn points_to_display_zero() {
        assert_eq!(points_to_display(0), "0");
    }

    #[test]
    fn points_to_display_fifteen() {
        assert_eq!(points_to_display(1), "15");
    }

    #[test]
    fn points_to_display_thirty() {
        assert_eq!(points_to_display(2), "30");
    }

    #[test]
    fn points_to_display_forty() {
        assert_eq!(points_to_display(3), "40");
    }

    #[test]
    fn points_to_display_advantage() {
        assert_eq!(points_to_display(4), "AD");
        assert_eq!(points_to_display(5), "AD");
        assert_eq!(points_to_display(100), "AD");
    }
}
