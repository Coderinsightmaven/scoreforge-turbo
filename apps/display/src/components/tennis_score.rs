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
    style: &ComponentStyle,
    live_data: Option<&TennisLiveData>,
    zoom: f32,
) {
    let idx = if player_number == 1 { 0 } else { 1 };

    let display_text = if let Some(data) = live_data {
        match score_type {
            ComponentType::TennisGameScore => {
                points_to_display(data.current_game_points[idx]).to_string()
            }
            ComponentType::TennisSetScore => {
                if let Some(current_set) = data.sets.last() {
                    let games = if idx == 0 {
                        current_set.player1_games
                    } else {
                        current_set.player2_games
                    };
                    games.to_string()
                } else {
                    "0".to_string()
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

    let font = egui::FontId::proportional(style.font_size * zoom);
    let center = rect.center();
    painter.text(
        center,
        egui::Align2::CENTER_CENTER,
        &display_text,
        font,
        style.font_color,
    );
}
