use egui::{Color32, Rect};

use crate::data::live_data::TennisLiveData;

pub fn render_serving_indicator(
    painter: &egui::Painter,
    rect: Rect,
    player_number: u8,
    indicator_color: Color32,
    indicator_size: f32,
    live_data: Option<&TennisLiveData>,
) {
    let is_serving = live_data
        .map(|d| d.serving_player == player_number)
        .unwrap_or(player_number == 1); // Default: player 1 serving in designer

    if is_serving {
        let center = rect.center();
        painter.circle_filled(center, indicator_size / 2.0, indicator_color);
    }
}
