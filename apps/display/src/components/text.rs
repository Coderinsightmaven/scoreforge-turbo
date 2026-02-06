use egui::{FontId, Pos2, Rect};

use super::{ComponentStyle, HorizontalAlign};

pub fn render_text(
    painter: &egui::Painter,
    rect: Rect,
    content: &str,
    style: &ComponentStyle,
    zoom: f32,
) {
    render_aligned_text(painter, rect, content, style, zoom);
}

/// Shared text rendering that respects horizontal alignment and vertically centers.
pub fn render_aligned_text(
    painter: &egui::Painter,
    rect: Rect,
    content: &str,
    style: &ComponentStyle,
    zoom: f32,
) {
    if content.is_empty() {
        return;
    }

    let font_size = if style.auto_fit_text {
        compute_auto_fit_size(painter, content, style, rect, zoom)
    } else {
        style.font_size * zoom
    };

    let font = FontId::proportional(font_size);
    let galley = painter.layout_no_wrap(content.to_string(), font, style.font_color);

    // Horizontal alignment within the component rect
    let text_x = match style.horizontal_align {
        HorizontalAlign::Left => rect.left(),
        HorizontalAlign::Center => rect.left() + (rect.width() - galley.size().x) / 2.0,
        HorizontalAlign::Right => rect.right() - galley.size().x,
    };

    // Vertically center
    let y_offset = (rect.height() - galley.size().y) / 2.0;
    let final_pos = Pos2::new(text_x, rect.top() + y_offset.max(0.0));

    painter.galley(final_pos, galley, style.font_color);
}

/// Compute the largest font size that fits the text within the rect.
fn compute_auto_fit_size(
    painter: &egui::Painter,
    content: &str,
    style: &ComponentStyle,
    rect: Rect,
    zoom: f32,
) -> f32 {
    // Measure at a reference size, then scale proportionally
    let reference_size = 100.0;
    let ref_font = FontId::proportional(reference_size);
    let ref_galley = painter.layout_no_wrap(content.to_string(), ref_font, style.font_color);

    let ref_w = ref_galley.size().x;
    let ref_h = ref_galley.size().y;

    if ref_w <= 0.0 || ref_h <= 0.0 {
        return style.font_size * zoom;
    }

    let scale_x = rect.width() / ref_w;
    let scale_y = rect.height() / ref_h;
    let fitted = reference_size * scale_x.min(scale_y);

    // Clamp to a reasonable minimum
    fitted.max(1.0)
}
