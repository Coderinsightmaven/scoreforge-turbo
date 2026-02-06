use egui::Color32;

use crate::components::{ComponentData, HorizontalAlign};
use crate::state::AppState;
use crate::storage::assets::AssetEntry;

/// Action returned by the asset picker UI, applied after the component borrow ends.
enum AssetAction {
    None,
    Import,
    Select(uuid::Uuid),
    Clear,
    Delete(uuid::Uuid),
}

pub fn show_property_panel(ui: &mut egui::Ui, state: &mut AppState) {
    ui.heading("Properties");
    ui.separator();

    if state.selected_ids.len() != 1 {
        if state.selected_ids.is_empty() {
            ui.label("No component selected");
        } else {
            ui.label(format!("{} components selected", state.selected_ids.len()));
        }

        // Show component list
        ui.separator();
        ui.heading("All Components");
        let mut click_id = None;
        for comp in &state.components {
            let label = format!(
                "{} ({})",
                comp.component_type.label(),
                &comp.id.to_string()[..8]
            );
            if ui
                .selectable_label(state.selected_ids.contains(&comp.id), &label)
                .clicked()
            {
                click_id = Some(comp.id);
            }
        }
        if let Some(id) = click_id {
            state.selected_ids.clear();
            state.selected_ids.insert(id);
        }
        return;
    }

    let selected_id = *state.selected_ids.iter().next().unwrap();

    // --- Phase A: Snapshot asset list before component borrow ---
    let asset_list: Vec<AssetEntry> = state.asset_library.list_assets().into_iter().cloned().collect();

    // --- Phase B: Mutable component borrow for editing, collect AssetAction ---
    let mut action = AssetAction::None;

    let Some(comp) = state.components.iter_mut().find(|c| c.id == selected_id) else {
        ui.label("Component not found");
        return;
    };

    // Type label
    ui.label(format!("Type: {}", comp.component_type.label()));
    ui.separator();

    // Position
    ui.label("Position");
    ui.horizontal(|ui| {
        ui.label("X:");
        ui.add(egui::DragValue::new(&mut comp.position.x).speed(1.0));
        ui.label("Y:");
        ui.add(egui::DragValue::new(&mut comp.position.y).speed(1.0));
    });

    // Size
    ui.label("Size");
    ui.horizontal(|ui| {
        ui.label("W:");
        ui.add(
            egui::DragValue::new(&mut comp.size.x)
                .speed(1.0)
                .range(10.0..=f32::MAX),
        );
        ui.label("H:");
        ui.add(
            egui::DragValue::new(&mut comp.size.y)
                .speed(1.0)
                .range(10.0..=f32::MAX),
        );
    });

    ui.separator();

    // Visibility and lock
    ui.horizontal(|ui| {
        ui.checkbox(&mut comp.visible, "Visible");
        ui.checkbox(&mut comp.locked, "Locked");
    });

    // Z-index
    ui.horizontal(|ui| {
        ui.label("Z-Index:");
        ui.add(egui::DragValue::new(&mut comp.z_index).speed(1.0));
    });

    ui.separator();

    // Style
    ui.label("Style");

    ui.horizontal(|ui| {
        ui.label("Font Size:");
        ui.add(
            egui::DragValue::new(&mut comp.style.font_size)
                .speed(0.5)
                .range(1.0..=200.0),
        );
    });

    // Font color
    ui.horizontal(|ui| {
        ui.label("Font Color:");
        let mut color = color32_to_rgba(comp.style.font_color);
        if ui.color_edit_button_rgba_unmultiplied(&mut color).changed() {
            comp.style.font_color = rgba_to_color32(color);
        }
    });

    // Background color
    ui.horizontal(|ui| {
        let mut has_bg = comp.style.background_color.is_some();
        ui.checkbox(&mut has_bg, "Background");
        if has_bg {
            let mut color = color32_to_rgba(comp.style.background_color.unwrap_or(Color32::BLACK));
            if ui.color_edit_button_rgba_unmultiplied(&mut color).changed() {
                comp.style.background_color = Some(rgba_to_color32(color));
            }
        } else {
            comp.style.background_color = None;
        }
    });

    // Border
    ui.horizontal(|ui| {
        let mut has_border = comp.style.border_color.is_some();
        ui.checkbox(&mut has_border, "Border");
        if has_border {
            let mut color = color32_to_rgba(comp.style.border_color.unwrap_or(Color32::WHITE));
            if ui.color_edit_button_rgba_unmultiplied(&mut color).changed() {
                comp.style.border_color = Some(rgba_to_color32(color));
            }
            ui.add(
                egui::DragValue::new(&mut comp.style.border_width)
                    .speed(0.1)
                    .range(0.0..=20.0),
            );
        } else {
            comp.style.border_color = None;
        }
    });

    // Alignment
    ui.horizontal(|ui| {
        ui.label("Align:");
        ui.selectable_value(
            &mut comp.style.horizontal_align,
            HorizontalAlign::Left,
            "Left",
        );
        ui.selectable_value(
            &mut comp.style.horizontal_align,
            HorizontalAlign::Center,
            "Center",
        );
        ui.selectable_value(
            &mut comp.style.horizontal_align,
            HorizontalAlign::Right,
            "Right",
        );
    });

    ui.separator();

    // Type-specific data
    ui.label("Data");
    match &mut comp.data {
        ComponentData::Text { content } => {
            ui.label("Content:");
            ui.text_edit_multiline(content);
        }
        ComponentData::Image { asset_id } => {
            action = show_asset_picker(ui, asset_id, &asset_list);
        }
        ComponentData::Background { asset_id, color } => {
            ui.horizontal(|ui| {
                ui.label("Color:");
                let mut c = color32_to_rgba(*color);
                if ui.color_edit_button_rgba_unmultiplied(&mut c).changed() {
                    *color = rgba_to_color32(c);
                }
            });
            action = show_asset_picker(ui, asset_id, &asset_list);
        }
        ComponentData::TennisScore { player_number } => {
            show_player_picker(ui, player_number);
        }
        ComponentData::TennisName { player_number } => {
            show_player_picker(ui, player_number);
        }
        ComponentData::TennisDoubles { player_number } => {
            show_player_picker(ui, player_number);
        }
        ComponentData::TennisServing {
            player_number,
            indicator_color,
            indicator_size,
        } => {
            show_player_picker(ui, player_number);
            ui.horizontal(|ui| {
                ui.label("Color:");
                let mut c = color32_to_rgba(*indicator_color);
                if ui.color_edit_button_rgba_unmultiplied(&mut c).changed() {
                    *indicator_color = rgba_to_color32(c);
                }
            });
            ui.horizontal(|ui| {
                ui.label("Size:");
                ui.add(
                    egui::DragValue::new(indicator_size)
                        .speed(0.5)
                        .range(4.0..=100.0),
                );
            });
        }
    }

    // Drop the mutable borrow of comp (it's scoped to the block above via the match)
    // --- Phase C: Apply deferred action ---
    match action {
        AssetAction::None => {}
        AssetAction::Import => {
            if let Some(path) = rfd::FileDialog::new()
                .add_filter("Images", &["png", "jpg", "jpeg", "bmp", "gif", "webp"])
                .pick_file()
            {
                match state.asset_library.import_image(&path) {
                    Ok(new_id) => {
                        // Set the asset_id on the selected component
                        if let Some(comp) = state.components.iter_mut().find(|c| c.id == selected_id) {
                            match &mut comp.data {
                                ComponentData::Image { asset_id } => *asset_id = Some(new_id),
                                ComponentData::Background { asset_id, .. } => *asset_id = Some(new_id),
                                _ => {}
                            }
                        }
                        state.is_dirty = true;
                        state.push_toast("Image imported".to_string(), false);
                    }
                    Err(e) => {
                        state.push_toast(format!("Import failed: {e}"), true);
                    }
                }
            }
        }
        AssetAction::Select(new_id) => {
            if let Some(comp) = state.components.iter_mut().find(|c| c.id == selected_id) {
                match &mut comp.data {
                    ComponentData::Image { asset_id } => *asset_id = Some(new_id),
                    ComponentData::Background { asset_id, .. } => *asset_id = Some(new_id),
                    _ => {}
                }
            }
            state.is_dirty = true;
        }
        AssetAction::Clear => {
            if let Some(comp) = state.components.iter_mut().find(|c| c.id == selected_id) {
                match &mut comp.data {
                    ComponentData::Image { asset_id } => *asset_id = None,
                    ComponentData::Background { asset_id, .. } => *asset_id = None,
                    _ => {}
                }
            }
            state.is_dirty = true;
        }
        AssetAction::Delete(id) => {
            state.delete_asset(&id);
            state.is_dirty = true;
            state.push_toast("Asset deleted".to_string(), false);
        }
    }
}

fn show_player_picker(ui: &mut egui::Ui, player_number: &mut u8) {
    ui.horizontal(|ui| {
        ui.label("Player:");
        ui.selectable_value(player_number, 1, "Player 1");
        ui.selectable_value(player_number, 2, "Player 2");
    });
}

fn show_asset_picker(
    ui: &mut egui::Ui,
    current_asset_id: &Option<uuid::Uuid>,
    asset_list: &[AssetEntry],
) -> AssetAction {
    let mut action = AssetAction::None;

    // Show current asset info
    if let Some(id) = current_asset_id {
        if let Some(entry) = asset_list.iter().find(|a| a.id == *id) {
            ui.label(format!(
                "Image: {} ({}x{})",
                entry.original_name, entry.width, entry.height
            ));
        } else {
            ui.colored_label(Color32::YELLOW, format!("Image: missing asset {}", &id.to_string()[..8]));
        }
        if ui.button("Remove Image").clicked() {
            action = AssetAction::Clear;
        }
    } else {
        ui.label("No image selected");
    }

    if ui.button("Import Image...").clicked() {
        action = AssetAction::Import;
    }

    // Show library list
    if !asset_list.is_empty() {
        ui.separator();
        ui.label("Asset Library");
        for entry in asset_list {
            let selected = current_asset_id.as_ref() == Some(&entry.id);
            let label = format!("{} ({}x{})", entry.original_name, entry.width, entry.height);
            ui.horizontal(|ui| {
                if ui.selectable_label(selected, &label).clicked() && !selected {
                    action = AssetAction::Select(entry.id);
                }
                if ui.small_button("X").on_hover_text("Delete asset").clicked() {
                    action = AssetAction::Delete(entry.id);
                }
            });
        }
    }

    action
}

fn color32_to_rgba(c: Color32) -> [f32; 4] {
    [
        c.r() as f32 / 255.0,
        c.g() as f32 / 255.0,
        c.b() as f32 / 255.0,
        c.a() as f32 / 255.0,
    ]
}

fn rgba_to_color32(c: [f32; 4]) -> Color32 {
    Color32::from_rgba_unmultiplied(
        (c[0] * 255.0) as u8,
        (c[1] * 255.0) as u8,
        (c[2] * 255.0) as u8,
        (c[3] * 255.0) as u8,
    )
}
