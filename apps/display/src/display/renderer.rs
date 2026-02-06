use std::sync::{Arc, Mutex};

use egui::{Pos2, Rect, Vec2, ViewportBuilder, ViewportId};
use uuid::Uuid;

use crate::components::{RenderContext, ScoreboardComponent, TextureCache, render_component};
use crate::data::live_data::TennisLiveData;
use crate::state::Scoreboard;

/// Shared state for the display viewport
pub struct DisplayState {
    pub scoreboard: Scoreboard,
    pub components: Vec<ScoreboardComponent>,
    pub live_data: Option<TennisLiveData>,
    pub texture_cache: TextureCache,
    pub should_close: bool,
    pub fullscreen: bool,
    pub offset_x: i32,
    pub offset_y: i32,
}

impl Default for DisplayState {
    fn default() -> Self {
        Self {
            scoreboard: Scoreboard::default(),
            components: Vec::new(),
            live_data: None,
            texture_cache: TextureCache::new(),
            should_close: false,
            fullscreen: false,
            offset_x: 0,
            offset_y: 0,
        }
    }
}

pub fn show_display_viewport(
    ctx: &egui::Context,
    display_state: &Arc<Mutex<DisplayState>>,
    project_id: Uuid,
    project_name: &str,
) {
    let viewport_id = ViewportId::from_hash_of(&format!("scoreforge_display_{}", project_id));
    let display_state = Arc::clone(display_state);

    let (fullscreen, width, height, offset_x, offset_y) = {
        let state = display_state.lock().unwrap();
        (
            state.fullscreen,
            state.scoreboard.width,
            state.scoreboard.height,
            state.offset_x,
            state.offset_y,
        )
    };

    let title = format!("Display - {}", project_name);

    let mut builder = ViewportBuilder::default()
        .with_title(title)
        .with_decorations(false);

    if fullscreen {
        builder = builder.with_fullscreen(true);
    } else {
        builder = builder
            .with_inner_size(Vec2::new(width as f32, height as f32))
            .with_position(Pos2::new(offset_x as f32, offset_y as f32));
    }

    ctx.show_viewport_deferred(
        viewport_id,
        builder,
        move |ctx, _class| {
            let state = display_state.lock().unwrap();

            if state.should_close {
                ctx.send_viewport_cmd(egui::ViewportCommand::Close);
                return;
            }

            egui::CentralPanel::default()
                .frame(egui::Frame::NONE.fill(state.scoreboard.background_color))
                .show(ctx, |ui| {
                    render_display(ui, &state);
                });

            // Escape to close
            if ctx.input(|i| i.key_pressed(egui::Key::Escape)) {
                ctx.send_viewport_cmd(egui::ViewportCommand::Close);
            }
        },
    );
}

fn render_display(ui: &mut egui::Ui, state: &std::sync::MutexGuard<'_, DisplayState>) {
    let available = ui.available_size();
    let sb_w = state.scoreboard.width as f32;
    let sb_h = state.scoreboard.height as f32;

    // Compute scale to fit scoreboard in available space
    let scale_x = available.x / sb_w;
    let scale_y = available.y / sb_h;
    let scale = scale_x.min(scale_y);

    // Center the scoreboard (letterbox/pillarbox)
    let offset_x = (available.x - sb_w * scale) / 2.0;
    let offset_y = (available.y - sb_h * scale) / 2.0;
    let pan = Vec2::new(offset_x, offset_y);

    let (_, painter) = ui.allocate_painter(available, egui::Sense::hover());

    // Draw scoreboard background
    let sb_rect = Rect::from_min_size(
        Pos2::new(pan.x, pan.y),
        Vec2::new(sb_w * scale, sb_h * scale),
    );
    painter.rect_filled(sb_rect, 0.0, state.scoreboard.background_color);

    // Sort and render components
    let mut sorted_indices: Vec<usize> = (0..state.components.len()).collect();
    sorted_indices.sort_by_key(|&i| state.components[i].z_index);

    for &idx in &sorted_indices {
        let comp = &state.components[idx];
        if !comp.visible {
            continue;
        }
        render_component(
            comp,
            &painter,
            &RenderContext::Display,
            state.live_data.as_ref(),
            &state.texture_cache,
            scale,
            pan,
        );
    }
}
