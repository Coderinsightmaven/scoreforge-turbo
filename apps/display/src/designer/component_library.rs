use egui::Vec2;

use crate::components::{ComponentType, ScoreboardComponent};
use crate::state::AppState;

pub fn show_component_library(ui: &mut egui::Ui, state: &mut AppState) {
    ui.heading("Components");
    ui.separator();

    ui.label("Static");
    for ct in &[
        ComponentType::Text,
        ComponentType::Image,
        ComponentType::Background,
    ] {
        if ui.button(ct.label()).clicked() {
            add_component(state, *ct);
        }
    }

    ui.separator();
    ui.label("Tennis");
    for ct in &[
        ComponentType::TennisGameScore,
        ComponentType::TennisSetScore,
        ComponentType::TennisMatchScore,
        ComponentType::TennisPlayerName,
        ComponentType::TennisDoublesName,
        ComponentType::TennisServingIndicator,
    ] {
        if ui.button(ct.label()).clicked() {
            add_component(state, *ct);
        }
    }
}

fn add_component(state: &mut AppState, component_type: ComponentType) {
    state.push_undo();

    let default_size = match component_type {
        ComponentType::Background => Vec2::new(
            state.scoreboard.width as f32,
            state.scoreboard.height as f32,
        ),
        ComponentType::Text => Vec2::new(200.0, 50.0),
        ComponentType::Image => Vec2::new(200.0, 200.0),
        ComponentType::TennisServingIndicator => Vec2::new(30.0, 30.0),
        _ => Vec2::new(120.0, 60.0),
    };

    let center = Vec2::new(
        state.scoreboard.width as f32 / 2.0 - default_size.x / 2.0,
        state.scoreboard.height as f32 / 2.0 - default_size.y / 2.0,
    );

    let max_z = state
        .components
        .iter()
        .map(|c| c.z_index)
        .max()
        .unwrap_or(0);

    let mut component = ScoreboardComponent::new(component_type, center, default_size);
    component.z_index = max_z + 1;

    state.selected_ids.clear();
    state.selected_ids.insert(component.id);
    state.components.push(component);
    state.is_dirty = true;
}
