use egui::{Color32, Pos2, Rect, Sense, Vec2};

use crate::components::{RenderContext, canvas_to_screen, render_component, screen_to_canvas};
use crate::state::{AppState, DragState};

pub fn show_canvas(ui: &mut egui::Ui, state: &mut AppState) {
    let available = ui.available_size();
    let (response, painter) = ui.allocate_painter(available, Sense::click_and_drag());
    let canvas_origin = response.rect.min.to_vec2();

    // Auto-fit scoreboard to canvas on first view
    if state.active_project().needs_fit_to_view {
        fit_to_view(state, available);
    }

    let project = state.active_project();

    // Adjust pan to include canvas widget offset
    let effective_pan = project.canvas_pan + canvas_origin;

    // Handle zoom (scroll wheel)
    let scroll_delta = ui.input(|i| i.smooth_scroll_delta.y);
    if scroll_delta != 0.0 && response.hovered() {
        let zoom_factor = if scroll_delta > 0.0 { 1.1 } else { 1.0 / 1.1 };
        let project = state.active_project_mut();
        let new_zoom = (project.canvas_zoom * zoom_factor).clamp(0.02, 20.0);

        // Zoom toward cursor
        if let Some(pointer) = ui.input(|i| i.pointer.hover_pos()) {
            let pointer_canvas = screen_to_canvas(
                pointer.to_vec2() - canvas_origin,
                project.canvas_zoom,
                project.canvas_pan,
            );
            project.canvas_zoom = new_zoom;
            project.canvas_pan =
                pointer.to_vec2() - canvas_origin - pointer_canvas * project.canvas_zoom;
        } else {
            project.canvas_zoom = new_zoom;
        }
    }

    // Handle pan (middle mouse drag)
    if response.dragged_by(egui::PointerButton::Middle) {
        state.active_project_mut().canvas_pan += response.drag_delta();
    }

    let project = state.active_project();
    let canvas_zoom = project.canvas_zoom;

    // Draw scoreboard background
    let sb_pos = canvas_to_screen(Vec2::ZERO, canvas_zoom, effective_pan);
    let sb_size = Vec2::new(
        project.scoreboard.width as f32 * canvas_zoom,
        project.scoreboard.height as f32 * canvas_zoom,
    );
    let sb_rect = Rect::from_min_size(Pos2::new(sb_pos.x, sb_pos.y), sb_size);
    painter.rect_filled(sb_rect, 0.0, project.scoreboard.background_color);
    painter.rect_stroke(
        sb_rect,
        0.0,
        egui::Stroke::new(1.0, Color32::from_gray(80)),
        egui::epaint::StrokeKind::Outside,
    );

    // Sort components by z_index for rendering
    let mut sorted_indices: Vec<usize> = (0..project.components.len()).collect();
    sorted_indices.sort_by_key(|&i| project.components[i].z_index);

    // Render components
    for &idx in &sorted_indices {
        let comp = &project.components[idx];
        if !comp.visible {
            continue;
        }
        let ctx = RenderContext::Designer {
            is_selected: project.selected_ids.contains(&comp.id),
        };
        render_component(
            comp,
            &painter,
            &ctx,
            project.live_match_data.as_ref(),
            &state.texture_cache,
            canvas_zoom,
            effective_pan,
        );
    }

    // Draw grid above components so it's always visible
    if state.grid_enabled {
        draw_grid(&painter, &sb_rect, state.grid_size, canvas_zoom);
    }

    // Draw resize handles for selected components
    let project = state.active_project();
    for &idx in &sorted_indices {
        let comp = &project.components[idx];
        if project.selected_ids.contains(&comp.id) {
            draw_resize_handles(&painter, comp, canvas_zoom, effective_pan);
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

    let project = state.active_project();
    let canvas_pos = screen_to_canvas(
        pointer.to_vec2() - canvas_origin,
        project.canvas_zoom,
        project.canvas_pan,
    );

    let ctrl = ui.input(|i| i.modifiers.ctrl || i.modifiers.command);

    // Find topmost component under cursor (iterate in reverse z-order)
    let mut sorted: Vec<usize> = (0..project.components.len()).collect();
    sorted.sort_by_key(|&i| std::cmp::Reverse(project.components[i].z_index));

    let mut hit = None;
    for &idx in &sorted {
        let comp = &project.components[idx];
        if !comp.visible {
            continue;
        }
        let comp_rect = comp.rect();
        if comp_rect.contains(Pos2::new(canvas_pos.x, canvas_pos.y)) {
            hit = Some(comp.id);
            break;
        }
    }

    let project = state.active_project_mut();
    if let Some(id) = hit {
        if ctrl {
            if project.selected_ids.contains(&id) {
                project.selected_ids.remove(&id);
            } else {
                project.selected_ids.insert(id);
            }
        } else {
            project.selected_ids.clear();
            project.selected_ids.insert(id);
        }
    } else if !ctrl {
        project.selected_ids.clear();
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

        let project = state.active_project();
        let canvas_pos = screen_to_canvas(
            pointer.to_vec2() - canvas_origin,
            project.canvas_zoom,
            project.canvas_pan,
        );

        // Check if drag started on a selected component
        let on_selected = project.components.iter().any(|c| {
            project.selected_ids.contains(&c.id)
                && c.visible
                && !c.locked
                && c.rect().contains(Pos2::new(canvas_pos.x, canvas_pos.y))
        });

        if on_selected {
            let start_positions: Vec<(uuid::Uuid, Vec2)> = project
                .components
                .iter()
                .filter(|c| project.selected_ids.contains(&c.id))
                .map(|c| (c.id, c.position))
                .collect();

            let project = state.active_project_mut();
            project.push_undo();
            project.drag_state = Some(DragState {
                start_mouse: canvas_pos,
                start_positions,
            });
        }
    }

    let project = state.active_project();
    if let Some(drag) = &project.drag_state
        && response.dragged_by(egui::PointerButton::Primary)
    {
        let Some(pointer) = ui.input(|i| i.pointer.interact_pos()) else {
            return;
        };
        let canvas_pos = screen_to_canvas(
            pointer.to_vec2() - canvas_origin,
            project.canvas_zoom,
            project.canvas_pan,
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

        let project = state.active_project_mut();
        for (id, start) in &start_positions {
            if let Some(comp) = project.components.iter_mut().find(|c| c.id == *id) {
                comp.position = Vec2::new(snap_fn(start.x + delta.x), snap_fn(start.y + delta.y));
            }
        }
        project.is_dirty = true;
    }

    if response.drag_stopped_by(egui::PointerButton::Primary)
        && state.active_project().drag_state.is_some()
    {
        state.active_project_mut().drag_state = None;
    }
}

fn handle_keyboard(ui: &egui::Ui, state: &mut AppState) {
    if ui.input(|i| i.key_pressed(egui::Key::Delete) || i.key_pressed(egui::Key::Backspace))
        && !state.active_project().selected_ids.is_empty()
    {
        let project = state.active_project_mut();
        project.push_undo();
        let selected = project.selected_ids.clone();
        project.components.retain(|c| !selected.contains(&c.id));
        project.selected_ids.clear();
        project.is_dirty = true;
    }

    // Ctrl+C - Copy
    if ui.input(|i| i.modifiers.command && i.key_pressed(egui::Key::C)) {
        let project = state.active_project();
        state.clipboard = project
            .components
            .iter()
            .filter(|c| project.selected_ids.contains(&c.id))
            .cloned()
            .collect();
    }

    // Ctrl+V - Paste
    if ui.input(|i| i.modifiers.command && i.key_pressed(egui::Key::V))
        && !state.clipboard.is_empty()
    {
        let pasted = state.clipboard.clone();
        let project = state.active_project_mut();
        project.push_undo();
        project.selected_ids.clear();
        let offset = Vec2::new(20.0, 20.0);
        for mut comp in pasted {
            comp.id = uuid::Uuid::new_v4();
            comp.position += offset;
            project.selected_ids.insert(comp.id);
            project.components.push(comp);
        }
        project.is_dirty = true;
    }

    // Ctrl+Z - Undo
    if ui.input(|i| i.modifiers.command && i.key_pressed(egui::Key::Z)) {
        state.active_project_mut().undo();
    }

    // Ctrl+S - Save
    if ui.input(|i| i.modifiers.command && i.key_pressed(egui::Key::S)) {
        let project = state.active_project();
        let file = project.to_scoreboard_file();
        let path = project.current_file.clone();
        if let Some(path) = path {
            match crate::storage::scoreboard::save_scoreboard(&file, &path) {
                Ok(()) => {
                    state.active_project_mut().is_dirty = false;
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
        let project = state.active_project_mut();
        let selected = project.selected_ids.clone();
        for id in selected {
            if let Some(comp) = project.components.iter_mut().find(|c| c.id == id) {
                comp.z_index -= 1;
            }
        }
    }

    // ] - Bring forward
    if ui.input(|i| i.key_pressed(egui::Key::CloseBracket)) {
        let project = state.active_project_mut();
        let selected = project.selected_ids.clone();
        for id in selected {
            if let Some(comp) = project.components.iter_mut().find(|c| c.id == id) {
                comp.z_index += 1;
            }
        }
    }

    // Ctrl+0 - Fit to view
    if ui.input(|i| i.modifiers.command && i.key_pressed(egui::Key::Num0)) {
        state.active_project_mut().needs_fit_to_view = true;
    }

    // Escape - clear selection
    if ui.input(|i| i.key_pressed(egui::Key::Escape)) {
        state.active_project_mut().selected_ids.clear();
    }
}

fn fit_to_view(state: &mut AppState, available: Vec2) {
    let project = state.active_project();
    let sb_width = project.scoreboard.width as f32;
    let sb_height = project.scoreboard.height as f32;

    if sb_width <= 0.0 || sb_height <= 0.0 || available.x <= 0.0 || available.y <= 0.0 {
        state.active_project_mut().needs_fit_to_view = false;
        return;
    }

    let padding = 0.9; // 90% of available space
    let zoom_x = available.x / sb_width * padding;
    let zoom_y = available.y / sb_height * padding;
    let zoom = zoom_x.min(zoom_y).clamp(0.02, 20.0);

    // Center the scoreboard in the available space
    let pan_x = (available.x - sb_width * zoom) / 2.0;
    let pan_y = (available.y - sb_height * zoom) / 2.0;

    let project = state.active_project_mut();
    project.canvas_zoom = zoom;
    project.canvas_pan = Vec2::new(pan_x, pan_y);
    project.needs_fit_to_view = false;
}
