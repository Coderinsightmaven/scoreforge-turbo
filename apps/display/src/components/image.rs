use egui::Rect;
use uuid::Uuid;

use super::TextureCache;

pub fn render_image(
    painter: &egui::Painter,
    rect: Rect,
    asset_id: &Option<Uuid>,
    texture_cache: &TextureCache,
) {
    if let Some(id) = asset_id {
        if let Some(texture) = texture_cache.get(id) {
            let uv = Rect::from_min_max(egui::pos2(0.0, 0.0), egui::pos2(1.0, 1.0));
            painter.image(texture.id(), rect, uv, egui::Color32::WHITE);
        } else {
            // Placeholder when texture not loaded
            painter.rect_filled(rect, 0.0, egui::Color32::from_gray(60));
            let center = rect.center();
            painter.text(
                center,
                egui::Align2::CENTER_CENTER,
                "Loading...",
                egui::FontId::proportional(14.0),
                egui::Color32::WHITE,
            );
        }
    } else {
        // No image selected
        painter.rect_filled(rect, 0.0, egui::Color32::from_gray(40));
        let center = rect.center();
        painter.text(
            center,
            egui::Align2::CENTER_CENTER,
            "No Image",
            egui::FontId::proportional(14.0),
            egui::Color32::GRAY,
        );
    }
}
