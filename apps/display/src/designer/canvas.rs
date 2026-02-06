use egui::{Color32, Pos2, Rect, Sense, Vec2};

use crate::components::{RenderContext, canvas_to_screen, render_component, screen_to_canvas};
use crate::state::{AppState, DragState};

pub fn show_canvas(ui: &mut egui::Ui, state: &mut AppState) {
    let available = ui.available_size();
    let (response, painter) = ui.allocate_painter(available, Sense::click_and_drag());
    let canvas_origin = response.rect.min.to_vec2();

    // Adjust pan to include canvas widget offset
    let effective_pan = state.canvas_pan + canvas_origin;

    // Handle zoom (scroll wheel)
    let scroll_delta = ui.input(|i| i.smooth_scroll_delta.y);
    if scroll_delta != 0.0 && response.hovered() {
        let zoom_factor = if scroll_delta > 0.0 { 1.1 } else { 1.0 / 1.1 };
        let new_zoom = (state.canvas_zoom * zoom_factor).clamp(0.1, 5.0);

        // Zoom toward cursor
        if let Some(pointer) = ui.input(|i| i.pointer.hover_pos()) {
            let pointer_canvas = screen_to_canvas(
                pointer.to_vec2() - canvas_origin,
                state.canvas_zoom,
                state.canvas_pan,
            );
            state.canvas_zoom = new_zoom;
            state.canvas_pan =
                pointer.to_vec2() - canvas_origin - pointer_canvas * state.canvas_zoom;
        } else {
            state.canvas_zoom = new_zoom;
        }
    }

    // Handle pan (middle mouse drag)
    if response.dragged_by(egui::PointerButton::Middle) {
        state.canvas_pan += response.drag_delta();
    }

    // Draw scoreboard background
    let sb_pos = canvas_to_screen(Vec2::ZERO, state.canvas_zoom, effective_pan);
    let sb_size = Vec2::new(
        state.scoreboard.width as f32 * state.canvas_zoom,
        state.scoreboard.height as f32 * state.canvas_zoom,
    );
    let sb_rect = Rect::from_min_size(Pos2::new(sb_pos.x, sb_pos.y), sb_size);
    painter.rect_filled(sb_rect, 0.0, state.scoreboard.background_color);
    painter.rect_stroke(
        sb_rect,
        0.0,
        egui::Stroke::new(1.0, Color32::from_gray(80)),
        egui::epaint::StrokeKind::Outside,
    );

    // Draw grid
    if state.grid_enabled {
        draw_grid(&painter, &sb_rect, state.grid_size, state.canvas_zoom);
    }

    // Sort components by z_index for rendering
    let mut sorted_indices: Vec<usize> = (0..state.components.len()).collect();
    sorted_indices.sort_by_key(|&i| state.components[i].z_index);

    // Render components
    for &idx in &sorted_indices {
        let comp = &state.components[idx];
        if !comp.visible {
            continue;
        }
        let ctx = RenderContext::Designer {
            is_selected: state.selected_ids.contains(&comp.id),
        };
        render_component(
            comp,
            &painter,
            &ctx,
            state.live_match_data.as_ref(),
            &state.texture_cache,
            state.canvas_zoom,
            effective_pan,
        );
    }

    // Draw resize handles for selected components
    for &idx in &sorted_indices {
        let comp = &state.components[idx];
        if state.selected_ids.contains(&comp.id) {
            draw_resize_handles(&painter, comp, state.canvas_zoom, effective_pan);
        }
    }

    // Handle interactions
    handle_click_select(ui, &response, state, canvas_origin);
    handle_drag_move(ui, &response, state, canvas_origin);
    handle_keyboard(ui, state);
}

fn draw_grid(painter: &egui::Painter, sb_rect: &Rect, grid_size: f32, zoom: f32) {
    let step = grid_size * zoom;
    if step < 4.0 {
        return; // Too small to draw
    }

    let grid_color = Color32::from_rgba_premultiplied(255, 255, 255, 15);

    let mut x = sb_rect.left();
    while x <= sb_rect.right() {
        painter.line_segment(
            [Pos2::new(x, sb_rect.top()), Pos2::new(x, sb_rect.bottom())],
            egui::Stroke::new(1.0, grid_color),
        );
        x += step;
    }

    let mut y = sb_rect.top();
    while y <= sb_rect.bottom() {
        painter.line_segment(
            [Pos2::new(sb_rect.left(), y), Pos2::new(sb_rect.right(), y)],
            egui::Stroke::new(1.0, grid_color),
        );
        y += step;
    }
}

fn draw_resize_handles(
    painter: &egui::Painter,
    comp: &crate::components::ScoreboardComponent,
    zoom: f32,
    pan: Vec2,
) {
    let screen_pos = canvas_to_screen(comp.position, zoom, pan);
    let screen_size = comp.size * zoom;
    let rect = Rect::from_min_size(Pos2::new(screen_pos.x, screen_pos.y), screen_size);

    let handle_size = 6.0;
    let positions = [
        rect.left_top(),
        Pos2::new(rect.center().x, rect.top()),
        rect.right_top(),
        Pos2::new(rect.right(), rect.center().y),
        rect.right_bottom(),
        Pos2::new(rect.center().x, rect.bottom()),
        rect.left_bottom(),
        Pos2::new(rect.left(), rect.center().y),
    ];

    for pos in &positions {
        let handle_rect = Rect::from_center_size(*pos, Vec2::splat(handle_size));
        painter.rect_filled(handle_rect, 0.0, Color32::WHITE);
        painter.rect_stroke(
            handle_rect,
            0.0,
            egui::Stroke::new(1.0, Color32::from_rgb(59, 130, 246)),
            egui::epaint::StrokeKind::Outside,
        );
    }
}

fn handle_click_select(
    ui: &egui::Ui,
    response: &egui::Response,
    state: &mut AppState,
    canvas_origin: Vec2,
) {
    if !response.clicked() {
        return;
    }

    let Some(pointer) = ui.input(|i| i.pointer.interact_pos()) else {
        return;
    };

    let canvas_pos = screen_to_canvas(
        pointer.to_vec2() - canvas_origin,
        state.canvas_zoom,
        state.canvas_pan,
    );

    let ctrl = ui.input(|i| i.modifiers.ctrl || i.modifiers.command);

    // Find topmost component under cursor (iterate in reverse z-order)
    let mut sorted: Vec<usize> = (0..state.components.len()).collect();
    sorted.sort_by_key(|&i| std::cmp::Reverse(state.components[i].z_index));

    let mut hit = None;
    for &idx in &sorted {
        let comp = &state.components[idx];
        if !comp.visible {
            continue;
        }
        let comp_rect = comp.rect();
        if comp_rect.contains(Pos2::new(canvas_pos.x, canvas_pos.y)) {
            hit = Some(comp.id);
            break;
        }
    }

    if let Some(id) = hit {
        if ctrl {
            if state.selected_ids.contains(&id) {
                state.selected_ids.remove(&id);
            } else {
                state.selected_ids.insert(id);
            }
        } else {
            state.selected_ids.clear();
            state.selected_ids.insert(id);
        }
    } else if !ctrl {
        state.selected_ids.clear();
    }
}

fn handle_drag_move(
    ui: &egui::Ui,
    response: &egui::Response,
    state: &mut AppState,
    canvas_origin: Vec2,
) {
    if response.drag_started_by(egui::PointerButton::Primary) {
        let Some(pointer) = ui.input(|i| i.pointer.interact_pos()) else {
            return;
        };

        let canvas_pos = screen_to_canvas(
            pointer.to_vec2() - canvas_origin,
            state.canvas_zoom,
            state.canvas_pan,
        );

        // Check if drag started on a selected component
        let on_selected = state.components.iter().any(|c| {
            state.selected_ids.contains(&c.id)
                && c.visible
                && !c.locked
                && c.rect().contains(Pos2::new(canvas_pos.x, canvas_pos.y))
        });

        if on_selected {
            let start_positions: Vec<(uuid::Uuid, Vec2)> = state
                .components
                .iter()
                .filter(|c| state.selected_ids.contains(&c.id))
                .map(|c| (c.id, c.position))
                .collect();

            state.push_undo();
            state.drag_state = Some(DragState {
                start_mouse: canvas_pos,
                start_positions,
            });
        }
    }

    if let Some(drag) = &state.drag_state
        && response.dragged_by(egui::PointerButton::Primary)
    {
        let Some(pointer) = ui.input(|i| i.pointer.interact_pos()) else {
            return;
        };
        let canvas_pos = screen_to_canvas(
            pointer.to_vec2() - canvas_origin,
            state.canvas_zoom,
            state.canvas_pan,
        );
        let delta = canvas_pos - drag.start_mouse;
        let start_positions = drag.start_positions.clone();

        // Pre-compute snapped values before mutably borrowing components
        let snap = state.snap_to_grid;
        let grid_size = state.grid_size;
        let snap_fn = |v: f32| -> f32 {
            if snap {
                (v / grid_size).round() * grid_size
            } else {
                v
            }
        };

        for (id, start) in &start_positions {
            if let Some(comp) = state.components.iter_mut().find(|c| c.id == *id) {
                comp.position = Vec2::new(snap_fn(start.x + delta.x), snap_fn(start.y + delta.y));
            }
        }
        state.is_dirty = true;
    }

    if response.drag_stopped_by(egui::PointerButton::Primary) && state.drag_state.is_some() {
        state.drag_state = None;
    }
}

fn handle_keyboard(ui: &egui::Ui, state: &mut AppState) {
    if ui.input(|i| i.key_pressed(egui::Key::Delete) || i.key_pressed(egui::Key::Backspace))
        && !state.selected_ids.is_empty()
    {
        state.push_undo();
        state
            .components
            .retain(|c| !state.selected_ids.contains(&c.id));
        state.selected_ids.clear();
        state.is_dirty = true;
    }

    // Ctrl+C - Copy
    if ui.input(|i| i.modifiers.command && i.key_pressed(egui::Key::C)) {
        state.clipboard = state
            .components
            .iter()
            .filter(|c| state.selected_ids.contains(&c.id))
            .cloned()
            .collect();
    }

    // Ctrl+V - Paste
    if ui.input(|i| i.modifiers.command && i.key_pressed(egui::Key::V))
        && !state.clipboard.is_empty()
    {
        state.push_undo();
        state.selected_ids.clear();
        let offset = Vec2::new(20.0, 20.0);
        for mut comp in state.clipboard.clone() {
            comp.id = uuid::Uuid::new_v4();
            comp.position += offset;
            state.selected_ids.insert(comp.id);
            state.components.push(comp);
        }
        state.is_dirty = true;
    }

    // Ctrl+Z - Undo
    if ui.input(|i| i.modifiers.command && i.key_pressed(egui::Key::Z)) {
        state.undo();
    }

    // Ctrl+S - Save
    if ui.input(|i| i.modifiers.command && i.key_pressed(egui::Key::S)) {
        let file = state.to_scoreboard_file();
        if let Some(path) = &state.current_file.clone() {
            match crate::storage::scoreboard::save_scoreboard(&file, path) {
                Ok(()) => {
                    state.is_dirty = false;
                    state.push_toast("Saved".to_string(), false);
                }
                Err(e) => {
                    state.push_toast(format!("Save failed: {e}"), true);
                }
            }
        }
    }

    // [ - Send back
    if ui.input(|i| i.key_pressed(egui::Key::OpenBracket)) {
        for id in state.selected_ids.clone() {
            if let Some(comp) = state.components.iter_mut().find(|c| c.id == id) {
                comp.z_index -= 1;
            }
        }
    }

    // ] - Bring forward
    if ui.input(|i| i.key_pressed(egui::Key::CloseBracket)) {
        for id in state.selected_ids.clone() {
            if let Some(comp) = state.components.iter_mut().find(|c| c.id == id) {
                comp.z_index += 1;
            }
        }
    }

    // Escape - clear selection
    if ui.input(|i| i.key_pressed(egui::Key::Escape)) {
        state.selected_ids.clear();
    }
}
