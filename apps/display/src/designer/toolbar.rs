use crate::state::{AppState, ProjectState};

pub fn show_toolbar(ui: &mut egui::Ui, state: &mut AppState) {
    ui.horizontal(|ui| {
        if ui.button("New").clicked() {
            state.show_new_dialog = true;
        }

        if ui.button("Save").clicked() {
            save_scoreboard(state);
        }

        if ui.button("Save As").clicked() {
            save_scoreboard_as(state);
        }

        if ui.button("Load").clicked() {
            load_scoreboard(state);
        }

        ui.separator();

        // Grid controls
        ui.checkbox(&mut state.grid_enabled, "Grid");
        ui.checkbox(&mut state.snap_to_grid, "Snap");

        ui.separator();

        // Scoreboard name
        let project = state.active_project();
        ui.label(&project.scoreboard.name);
        if project.is_dirty {
            ui.colored_label(egui::Color32::YELLOW, "*");
        }
    });
}

fn save_scoreboard(state: &mut AppState) {
    let project = state.active_project();
    let file = project.to_scoreboard_file();

    let path = if let Some(existing) = &project.current_file {
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
                let project = state.active_project_mut();
                project.current_file = Some(path.clone());
                project.is_dirty = false;
                state.config.add_recent_file(path);
                state.push_toast("Scoreboard saved".to_string(), false);
            }
            Err(e) => {
                state.push_toast(format!("Save failed: {e}"), true);
            }
        }
    }
}

fn save_scoreboard_as(state: &mut AppState) {
    let project = state.active_project();
    let file = project.to_scoreboard_file();

    let path = rfd::FileDialog::new()
        .set_title("Save Scoreboard As")
        .add_filter("ScoreForge Board", &["sfb"])
        .save_file();

    if let Some(path) = path {
        match crate::storage::scoreboard::save_scoreboard(&file, &path) {
            Ok(()) => {
                let project = state.active_project_mut();
                project.current_file = Some(path.clone());
                project.is_dirty = false;
                state.config.add_recent_file(path);
                state.push_toast("Scoreboard saved".to_string(), false);
            }
            Err(e) => {
                state.push_toast(format!("Save failed: {e}"), true);
            }
        }
    }
}

fn load_scoreboard(state: &mut AppState) {
    let path = rfd::FileDialog::new()
        .set_title("Load Scoreboard")
        .add_filter("ScoreForge Board", &["sfb"])
        .pick_file();

    if let Some(path) = path {
        match crate::storage::scoreboard::load_scoreboard(&path) {
            Ok(file) => {
                let mut project = ProjectState::from_file(file);
                project.current_file = Some(path.clone());
                state.projects.push(project);
                state.active_index = state.projects.len() - 1;
                state.config.add_recent_file(path);
                state.push_toast("Scoreboard loaded".to_string(), false);
            }
            Err(e) => {
                state.push_toast(format!("Load failed: {e}"), true);
            }
        }
    }
}
