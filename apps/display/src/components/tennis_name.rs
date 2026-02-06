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
        if player_number == 1 {
            if is_doubles {
                if let Some(partner) = &data.player1_partner {
                    format!("{} / {}", data.player1_name, partner)
                } else {
                    data.player1_name.clone()
                }
            } else {
                data.player1_name.clone()
            }
        } else if is_doubles {
            if let Some(partner) = &data.player2_partner {
                format!("{} / {}", data.player2_name, partner)
            } else {
                data.player2_name.clone()
            }
        } else {
            data.player2_name.clone()
        }
    } else {
        // Placeholder
        if is_doubles {
            format!("Player {} / Partner", player_number)
        } else {
            format!("Player {}", player_number)
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
