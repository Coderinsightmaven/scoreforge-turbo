use egui::Rect;

use super::ComponentStyle;
use crate::data::live_data::TennisLiveData;

pub fn render_tennis_name(
    painter: &egui::Painter,
    rect: Rect,
    player_number: u8,
    is_doubles: bool,
    style: &ComponentStyle,
    live_data: Option<&TennisLiveData>,
    zoom: f32,
) {
    let display_text = if let Some(data) = live_data {
        if is_doubles {
            // Use the full display name which already includes both partners
            if player_number == 1 {
                data.player1_display_name.clone()
            } else {
                data.player2_display_name.clone()
            }
        } else {
            // Use the individual player name
            if player_number == 1 {
                data.player1_name.clone()
            } else {
                data.player2_name.clone()
            }
        }
    } else {
        // Placeholder
        if is_doubles {
            format!("Player {} / Partner", player_number)
        } else {
            format!("Player {}", player_number)
        }
    };

    super::text::render_aligned_text(painter, rect, &display_text, style, zoom);
}
