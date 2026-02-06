use egui::{FontId, Rect};

use super::{ComponentStyle, HorizontalAlign};

pub fn render_text(
    painter: &egui::Painter,
    rect: Rect,
    content: &str,
    style: &ComponentStyle,
    zoom: f32,
) {
    let font = FontId::proportional(style.font_size * zoom);
    let galley = painter.layout(content.to_string(), font, style.font_color, rect.width());

    let text_pos_x = match style.horizontal_align {
        HorizontalAlign::Left => rect.left(),
        HorizontalAlign::Center => rect.center().x - galley.size().x / 2.0,
        HorizontalAlign::Right => rect.right() - galley.size().x,
    };

    // Vertically center
    let y_offset = (rect.height() - galley.size().y) / 2.0;
    let final_pos = egui::pos2(text_pos_x, rect.top() + y_offset.max(0.0));

    painter.galley(final_pos, galley, style.font_color);
}
