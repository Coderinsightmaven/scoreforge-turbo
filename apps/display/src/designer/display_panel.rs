use crate::data::convex::ConvexManager;
use crate::data::live_data::{ConnectionStep, LiveDataCommand};
use crate::state::AppState;

pub fn show_display_panel(ui: &mut egui::Ui, state: &mut AppState) {
    ui.heading("Display");
    ui.separator();

    // --- Connection section ---
    ui.label(egui::RichText::new("Connection").strong());

    let connection_step = state.active_project().connection_step.clone();

    let has_credentials = !state.connect_url.is_empty() && !state.connect_api_key.is_empty();

    match &connection_step {
        ConnectionStep::Disconnected => {
            ui.horizontal(|ui| {
                ui.colored_label(egui::Color32::from_rgb(150, 150, 150), "\u{25cf}");
                ui.label("Disconnected");
            });
            if has_credentials {
                if ui.button("Connect").clicked() {
                    // Open the per-tab match selection dialog, which auto-connects
                    state.active_project_mut().show_connect_dialog = true;
                }
            } else {
                ui.label("No credentials configured.");
                if ui.button("Set Credentials").clicked() {
                    state.show_connect_dialog = true;
                }
            }
        }
        ConnectionStep::Connecting => {
            ui.horizontal(|ui| {
                ui.colored_label(egui::Color32::YELLOW, "\u{25cf}");
                ui.label("Connecting...");
            });
        }
        ConnectionStep::SelectTournament | ConnectionStep::SelectBracket | ConnectionStep::SelectMatch => {
            ui.horizontal(|ui| {
                ui.colored_label(egui::Color32::YELLOW, "\u{25cf}");
                ui.label("Selecting...");
            });
            if ui.button("Open Selection").clicked() {
                state.active_project_mut().show_connect_dialog = true;
            }
            if ui.button("Disconnect").clicked() {
                if let Some(manager) = &state.active_project().convex_manager {
                    manager.send_command(LiveDataCommand::Disconnect);
                }
            }
        }
        ConnectionStep::Live => {
            ui.horizontal(|ui| {
                ui.colored_label(egui::Color32::GREEN, "\u{25cf}");
                ui.label("Connected");
            });
            if ui.button("Disconnect").clicked() {
                if let Some(manager) = &state.active_project().convex_manager {
                    manager.send_command(LiveDataCommand::Disconnect);
                }
            }
        }
    }

    if ui.button("Settings").clicked() {
        state.show_connect_dialog = true;
    }

    ui.separator();

    // --- Match section (visible when connected and has live data) ---
    if connection_step == ConnectionStep::Live {
        ui.label(egui::RichText::new("Match").strong());

        let project = state.active_project();
        if let Some(data) = &project.live_match_data {
            ui.label(format!("{} vs {}", data.player1_name, data.player2_name));
        }

        if ui.button("Change Match").clicked() {
            // Go back to tournament selection, reconnect using global credentials
            let url = state.connect_url.clone();
            let api_key = state.connect_api_key.clone();
            let project = state.active_project_mut();
            project.connection_step = ConnectionStep::SelectTournament;
            project.show_connect_dialog = true;
            // Re-connect to refresh tournament list
            let manager = ConvexManager::new();
            manager.send_command(LiveDataCommand::Connect { url, api_key });
            project.convex_manager = Some(manager);
        }

        ui.separator();
    }

    // --- Scoreboard swap ---
    ui.label(egui::RichText::new("Scoreboard").strong());

    {
        let project = state.active_project();
        if let Some(path) = &project.current_file {
            ui.label(
                path.file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_else(|| "Untitled".to_string()),
            );
        } else {
            ui.label(&project.scoreboard.name);
        }
    }

    if ui.button("Swap Scoreboard").clicked() {
        if let Some(path) = rfd::FileDialog::new()
            .set_title("Swap Scoreboard")
            .add_filter("ScoreForge Board", &["sfb"])
            .pick_file()
        {
            match crate::storage::scoreboard::load_scoreboard(&path) {
                Ok(file) => {
                    let project = state.active_project_mut();
                    project.scoreboard.name = file.name;
                    project.scoreboard.width = file.dimensions.0;
                    project.scoreboard.height = file.dimensions.1;
                    project.scoreboard.background_color = file.background_color;
                    project.components = file.components;
                    project.component_bindings = file.bindings;
                    project.selected_ids.clear();
                    project.undo_stack.clear();
                    project.current_file = Some(path.clone());
                    project.is_dirty = false;
                    project.needs_fit_to_view = true;
                    if let Ok(mut ds) = project.display_state.lock() {
                        ds.needs_resize = true;
                    }
                    state.config.add_recent_file(path);
                    state.push_toast("Scoreboard swapped".to_string(), false);
                }
                Err(e) => {
                    state.push_toast(format!("Swap failed: {e}"), true);
                }
            }
        }
    }

    ui.separator();

    // --- Display section ---
    ui.label(egui::RichText::new("Display Window").strong());

    let display_active = state.active_project().display_active;

    if display_active {
        if ui.button("Close Display").clicked() {
            let project = state.active_project_mut();
            project.display_active = false;
            if let Ok(mut ds) = project.display_state.lock() {
                ds.should_close = true;
            }
        }
    } else if ui.button("Launch Display").clicked() {
        state.active_project_mut().display_active = true;
    }

    let project = state.active_project_mut();

    ui.checkbox(&mut project.display_fullscreen, "Fullscreen");

    // Monitor selector
    let monitors = state.monitors.clone();
    let project = state.active_project_mut();

    if monitors.is_empty() {
        ui.label("No monitors detected");
    } else {
        let current_label = match project.selected_monitor {
            Some(idx) if idx < monitors.len() => {
                let m = &monitors[idx];
                format!("{} ({}x{}) @{}x", m.name, m.width, m.height, m.scale_factor)
            }
            _ => "Select monitor...".to_string(),
        };

        egui::ComboBox::from_label("Monitor")
            .selected_text(current_label)
            .show_ui(ui, |ui| {
                for (i, monitor) in monitors.iter().enumerate() {
                    let label = format!(
                        "{} ({}x{}) @{}x",
                        monitor.name, monitor.width, monitor.height, monitor.scale_factor,
                    );
                    if ui
                        .selectable_value(&mut project.selected_monitor, Some(i), label)
                        .clicked()
                    {
                        project.display_offset_x = monitor.x.to_string();
                        project.display_offset_y = monitor.y.to_string();
                        if let Ok(mut ds) = project.display_state.lock() {
                            ds.target_scale_factor = monitor.scale_factor;
                            ds.needs_resize = true;
                        }
                    }
                }
            });
    }

    if ui.small_button("Refresh monitors").clicked() {
        state.monitors = AppState::detect_monitors();
    }

    if !state.active_project().display_fullscreen {
        let project = state.active_project_mut();
        ui.horizontal(|ui| {
            ui.label("X:");
            let offset_x_response = ui.add(
                egui::TextEdit::singleline(&mut project.display_offset_x).desired_width(50.0),
            );
            if offset_x_response.changed() {
                project.display_offset_x = sanitize_int_input(&project.display_offset_x);
            }
        });
        ui.horizontal(|ui| {
            ui.label("Y:");
            let offset_y_response = ui.add(
                egui::TextEdit::singleline(&mut project.display_offset_y).desired_width(50.0),
            );
            if offset_y_response.changed() {
                project.display_offset_y = sanitize_int_input(&project.display_offset_y);
            }
        });
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
