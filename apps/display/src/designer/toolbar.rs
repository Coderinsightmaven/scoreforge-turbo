use crate::state::AppState;

pub fn show_toolbar(ui: &mut egui::Ui, state: &mut AppState) {
    ui.horizontal(|ui| {
        if ui.button("New").clicked() {
            state.show_new_dialog = true;
        }

        if ui.button("Save").clicked() {
            save_scoreboard(state);
        }

        if ui.button("Load").clicked() {
            load_scoreboard(state);
        }

        ui.separator();

        if ui.button("Connect").clicked() {
            state.show_connect_dialog = true;
        }

        ui.checkbox(&mut state.display_fullscreen, "Fullscreen");

        if !state.display_fullscreen {
            ui.label("X:");
            let offset_x_response = ui.add(
                egui::TextEdit::singleline(&mut state.display_offset_x)
                    .desired_width(50.0),
            );
            if offset_x_response.changed() {
                // Strip non-numeric chars except leading minus
                state.display_offset_x = sanitize_int_input(&state.display_offset_x);
            }
            ui.label("Y:");
            let offset_y_response = ui.add(
                egui::TextEdit::singleline(&mut state.display_offset_y)
                    .desired_width(50.0),
            );
            if offset_y_response.changed() {
                state.display_offset_y = sanitize_int_input(&state.display_offset_y);
            }
        }

        if state.display_active {
            if ui.button("Close Display").clicked() {
                state.display_active = false;
            }
            ui.colored_label(egui::Color32::GREEN, "●");
        } else if ui.button("Launch Display").clicked() {
            state.display_active = true;
        }

        ui.separator();

        // Grid controls
        ui.checkbox(&mut state.grid_enabled, "Grid");
        ui.checkbox(&mut state.snap_to_grid, "Snap");

        ui.separator();

        // Scoreboard name
        ui.label(&state.scoreboard.name);
        if state.is_dirty {
            ui.colored_label(egui::Color32::YELLOW, "*");
        }
    });
}

fn save_scoreboard(state: &mut AppState) {
    let file = state.to_scoreboard_file();

    let path = if let Some(existing) = &state.current_file {
        Some(existing.clone())
    } else {
        rfd::FileDialog::new()
            .set_title("Save Scoreboard")
            .add_filter("ScoreForge Board", &["sfb"])
            .save_file()
    };

    if let Some(path) = path {
        match crate::storage::scoreboard::save_scoreboard(&file, &path) {
            Ok(()) => {
                state.current_file = Some(path.clone());
                state.is_dirty = false;
                state.config.add_recent_file(path);
                state.push_toast("Scoreboard saved".to_string(), false);
            }
            Err(e) => {
                state.push_toast(format!("Save failed: {e}"), true);
            }
        }
    }
}

fn sanitize_int_input(input: &str) -> String {
    let mut result = String::new();
    for (i, c) in input.chars().enumerate() {
        if c == '-' && i == 0 {
            result.push(c);
        } else if c.is_ascii_digit() {
            result.push(c);
        }
    }
    result
}

fn load_scoreboard(state: &mut AppState) {
    let path = rfd::FileDialog::new()
        .set_title("Load Scoreboard")
        .add_filter("ScoreForge Board", &["sfb"])
        .pick_file();

    if let Some(path) = path {
        match crate::storage::scoreboard::load_scoreboard(&path) {
            Ok(file) => {
                state.load_from_file(file);
                state.current_file = Some(path.clone());
                state.config.add_recent_file(path);
                state.push_toast("Scoreboard loaded".to_string(), false);
            }
            Err(e) => {
                state.push_toast(format!("Load failed: {e}"), true);
            }
        }
    }
}
