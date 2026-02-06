use egui::{Color32, Rect};
use uuid::Uuid;

use super::TextureCache;

pub fn render_background(
    painter: &egui::Painter,
    rect: Rect,
    asset_id: &Option<Uuid>,
    color: Color32,
    texture_cache: &TextureCache,
) {
    // Always fill with the background color first
    painter.rect_filled(rect, 0.0, color);

    // If there's an image, draw it on top
    if let Some(id) = asset_id
        && let Some(texture) = texture_cache.get(id)
    {
        let uv = Rect::from_min_max(egui::pos2(0.0, 0.0), egui::pos2(1.0, 1.0));
        painter.image(texture.id(), rect, uv, Color32::WHITE);
    }
}
