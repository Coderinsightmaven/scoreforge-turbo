use std::sync::Arc;

use crate::components::ComponentData;
use crate::data::convex::ConvexManager;
use crate::data::live_data::{ConnectionStep, LiveDataCommand};
use crate::designer::{canvas, component_library, display_panel, property_panel, toolbar};
use crate::display::renderer::show_display_viewport;
use crate::state::{AppState, ProjectState};

pub struct ScoreForgeApp {
    state: AppState,
    logo_texture: Option<egui::TextureHandle>,
}

impl ScoreForgeApp {
    pub fn new(_cc: &eframe::CreationContext<'_>) -> Self {
        let state = AppState::new();
        Self {
            state,
            logo_texture: None,
        }
    }

    fn get_logo_texture(&mut self, ctx: &egui::Context) -> egui::TextureHandle {
        if let Some(ref tex) = self.logo_texture {
            return tex.clone();
        }
        let img = image::load_from_memory(include_bytes!("../assets/icon.png"))
            .expect("Failed to load logo")
            .into_rgba8();
        let (w, h) = img.dimensions();
        let color_image = egui::ColorImage::from_rgba_unmultiplied(
            [w as usize, h as usize],
            img.as_raw(),
        );
        let tex = ctx.load_texture("logo", color_image, egui::TextureOptions::LINEAR);
        self.logo_texture = Some(tex.clone());
        tex
    }

    fn show_dialogs(&mut self, ctx: &egui::Context) {
        self.show_new_dialog(ctx);
        self.show_connect_dialog(ctx);
        self.show_match_select_dialog(ctx);
    }

    fn show_new_dialog(&mut self, ctx: &egui::Context) {
        if !self.state.show_new_dialog {
            return;
        }

        egui::Window::new("New Scoreboard")
            .collapsible(false)
            .resizable(false)
            .anchor(egui::Align2::CENTER_CENTER, [0.0, 0.0])
            .show(ctx, |ui| {
                ui.horizontal(|ui| {
                    ui.label("Name:");
                    ui.text_edit_singleline(&mut self.state.new_name);
                });
                ui.horizontal(|ui| {
                    ui.label("Width:");
                    ui.text_edit_singleline(&mut self.state.new_width);
                });
                ui.horizontal(|ui| {
                    ui.label("Height:");
                    ui.text_edit_singleline(&mut self.state.new_height);
                });
                ui.horizontal(|ui| {
                    if ui.button("Create").clicked() {
                        let width: u32 = self.state.new_width.parse().unwrap_or(1920);
                        let height: u32 = self.state.new_height.parse().unwrap_or(1080);
                        let project =
                            ProjectState::new(self.state.new_name.clone(), width, height);
                        self.state.projects.push(project);
                        self.state.active_index = self.state.projects.len() - 1;
                        self.state.show_new_dialog = false;
                    }
                    if ui.button("Cancel").clicked() {
                        self.state.show_new_dialog = false;
                    }
                });
            });
    }

    /// Global credentials dialog — enter Convex URL and API key once.
    fn show_connect_dialog(&mut self, ctx: &egui::Context) {
        if !self.state.show_connect_dialog {
            return;
        }

        egui::Window::new("ScoreForge Connection")
            .collapsible(false)
            .resizable(false)
            .anchor(egui::Align2::CENTER_CENTER, [0.0, 0.0])
            .show(ctx, |ui| {
                ui.label("Enter your Convex deployment URL and API key:");
                ui.label("These credentials are shared by all scoreboards.");
                ui.add_space(8.0);
                ui.horizontal(|ui| {
                    ui.label("URL:");
                    ui.text_edit_singleline(&mut self.state.connect_url);
                });
                ui.horizontal(|ui| {
                    ui.label("API Key:");
                    ui.text_edit_singleline(&mut self.state.connect_api_key);
                });
                ui.add_space(4.0);
                ui.horizontal(|ui| {
                    if ui.button("Save").clicked() {
                        self.state.config.last_convex_url =
                            Some(self.state.connect_url.clone());
                        self.state.config.save();
                        self.state.show_connect_dialog = false;
                        self.state
                            .push_toast("Connection settings saved".to_string(), false);
                    }
                    if ui.button("Cancel").clicked() {
                        self.state.show_connect_dialog = false;
                    }
                });
            });
    }

    /// Per-tab match selection dialog — shown when a project's show_connect_dialog is true.
    /// Uses global credentials; skips URL/key entry entirely.
    fn show_match_select_dialog(&mut self, ctx: &egui::Context) {
        if !self.state.has_projects() {
            return;
        }

        if !self.state.active_project().show_connect_dialog {
            return;
        }

        // Snapshot data before egui closure to avoid borrow issues
        let connection_step = self.state.active_project().connection_step.clone();
        let tournament_list = self.state.active_project().tournament_list.clone();
        let is_doubles = self.state.active_project().is_doubles_scoreboard();
        let bracket_list: Vec<_> = self
            .state
            .active_project()
            .bracket_list
            .iter()
            .filter(|b| {
                if is_doubles {
                    b.participant_type == "doubles"
                } else {
                    b.participant_type == "individual"
                }
            })
            .cloned()
            .collect();
        let match_list = self.state.active_project().match_list.clone();

        egui::Window::new("Select Match")
            .collapsible(false)
            .resizable(true)
            .default_height(400.0)
            .anchor(egui::Align2::CENTER_CENTER, [0.0, 0.0])
            .show(ctx, |ui| match &connection_step {
                ConnectionStep::Disconnected => {
                    // No credentials configured yet
                    if self.state.connect_url.is_empty() || self.state.connect_api_key.is_empty() {
                        ui.label("No connection configured.");
                        ui.label("Set your Convex URL and API key first.");
                        if ui.button("Open Settings").clicked() {
                            self.state.active_project_mut().show_connect_dialog = false;
                            self.state.show_connect_dialog = true;
                        }
                        if ui.button("Cancel").clicked() {
                            self.state.active_project_mut().show_connect_dialog = false;
                        }
                    } else {
                        // Auto-connect using global credentials
                        ui.label("Connecting...");
                        ui.spinner();
                        let url = self.state.connect_url.clone();
                        let api_key = self.state.connect_api_key.clone();
                        let manager = ConvexManager::new();
                        manager.send_command(LiveDataCommand::Connect { url, api_key });
                        let project = self.state.active_project_mut();
                        project.convex_manager = Some(manager);
                        project.connection_step = ConnectionStep::Connecting;
                    }
                }
                ConnectionStep::Connecting => {
                    ui.label("Connecting...");
                    ui.spinner();
                    if ui.button("Cancel").clicked() {
                        let project = self.state.active_project_mut();
                        if let Some(manager) = &project.convex_manager {
                            manager.send_command(LiveDataCommand::Disconnect);
                        }
                        project.show_connect_dialog = false;
                    }
                }
                ConnectionStep::SelectTournament => {
                    ui.label("Select a tournament:");
                    if tournament_list.is_empty() {
                        ui.spinner();
                        ui.label("Loading tournaments...");
                    }
                    egui::ScrollArea::vertical().max_height(350.0).show(ui, |ui| {
                        for t in &tournament_list {
                            if ui.button(format!("{} ({})", t.name, t.status)).clicked() {
                                let project = self.state.active_project_mut();
                                if let Some(manager) = &project.convex_manager {
                                    manager.send_command(LiveDataCommand::SelectTournament(
                                        t.id.clone(),
                                    ));
                                }
                                project.selected_tournament_id = Some(t.id.clone());
                            }
                        }
                    });
                    if ui.button("Cancel").clicked() {
                        self.state.active_project_mut().show_connect_dialog = false;
                    }
                }
                ConnectionStep::SelectBracket => {
                    ui.label("Select a bracket:");
                    if bracket_list.is_empty() {
                        ui.spinner();
                        ui.label("Loading brackets...");
                    }
                    egui::ScrollArea::vertical().max_height(350.0).show(ui, |ui| {
                        for b in &bracket_list {
                            let label = format!(
                                "{} ({}) - {} matches",
                                b.name, b.status, b.match_count
                            );
                            if ui.button(&label).clicked() {
                                let project = self.state.active_project_mut();
                                if let Some(manager) = &project.convex_manager {
                                    manager.send_command(LiveDataCommand::SelectBracket(
                                        b.id.clone(),
                                    ));
                                }
                                project.selected_bracket_id = Some(b.id.clone());
                            }
                        }
                    });
                    if ui.button("Back").clicked() {
                        self.state.active_project_mut().connection_step =
                            ConnectionStep::SelectTournament;
                    }
                }
                ConnectionStep::SelectMatch => {
                    ui.label("Select a match:");
                    if match_list.is_empty() {
                        ui.spinner();
                        ui.label("Loading matches...");
                    }
                    egui::ScrollArea::vertical().max_height(350.0).show(ui, |ui| {
                        for m in &match_list {
                            let court_str = m
                                .court
                                .as_deref()
                                .map(|c| format!(" - Court {c}"))
                                .unwrap_or_default();
                            let label = format!(
                                "{} vs {} ({}){}",
                                m.player1_name, m.player2_name, m.status, court_str
                            );
                            if ui.button(&label).clicked() {
                                let project = self.state.active_project_mut();
                                if let Some(manager) = &project.convex_manager {
                                    manager
                                        .send_command(LiveDataCommand::SelectMatch(m.id.clone()));
                                }
                                project.selected_match_id = Some(m.id.clone());
                                project.show_connect_dialog = false;
                            }
                        }
                    });
                    if ui.button("Back").clicked() {
                        self.state.active_project_mut().connection_step =
                            ConnectionStep::SelectBracket;
                    }
                }
                ConnectionStep::Live => {
                    ui.colored_label(egui::Color32::GREEN, "Connected - receiving live data");
                    if ui.button("Close").clicked() {
                        self.state.active_project_mut().show_connect_dialog = false;
                    }
                }
            });
    }

    fn show_toasts(&mut self, ctx: &egui::Context) {
        // Remove expired toasts (older than 3 seconds)
        self.state
            .toasts
            .retain(|t| t.created_at.elapsed().as_secs() < 3);

        if self.state.toasts.is_empty() {
            return;
        }

        egui::Area::new(egui::Id::new("toasts"))
            .anchor(egui::Align2::RIGHT_BOTTOM, [-10.0, -10.0])
            .show(ctx, |ui| {
                for toast in &self.state.toasts {
                    let color = if toast.is_error {
                        egui::Color32::from_rgb(220, 50, 50)
                    } else {
                        egui::Color32::from_rgb(50, 180, 50)
                    };
                    egui::Frame::NONE
                        .fill(egui::Color32::from_gray(30))
                        .stroke(egui::Stroke::new(1.0, color))
                        .inner_margin(8.0)
                        .corner_radius(4.0)
                        .show(ui, |ui| {
                            ui.colored_label(color, &toast.message);
                        });
                }
            });
    }

    fn ensure_textures_loaded(&mut self, ctx: &egui::Context) {
        // Load textures for all projects (so switching tabs is instant)
        for project in &self.state.projects {
            for comp in &project.components {
                let asset_id = match &comp.data {
                    ComponentData::Image { asset_id } => asset_id.as_ref(),
                    ComponentData::Background { asset_id, .. } => asset_id.as_ref(),
                    _ => None,
                };
                if let Some(id) = asset_id
                    && !self.state.texture_cache.contains(id)
                    && let Some(path) = self.state.asset_library.get_asset_path(id)
                {
                    self.state.texture_cache.ensure_loaded(ctx, *id, &path);
                }
            }
        }
    }

    /// Sync display state for all projects that have an active display.
    fn sync_all_display_states(&self) {
        for project in &self.state.projects {
            if project.display_active {
                if let Ok(mut ds) = project.display_state.lock() {
                    ds.scoreboard = project.scoreboard.clone();
                    ds.components = project.components.clone();
                    ds.live_data = project.live_match_data.clone();
                    ds.texture_cache.sync_from(&self.state.texture_cache);
                    ds.should_close = false;
                    ds.fullscreen = project.display_fullscreen;
                    ds.offset_x = project.display_offset_x.parse().unwrap_or(0);
                    ds.offset_y = project.display_offset_y.parse().unwrap_or(0);
                }
            }
        }
    }

    fn show_start_screen(&mut self, ctx: &egui::Context) {
        egui::CentralPanel::default()
            .frame(egui::Frame::NONE.fill(egui::Color32::from_gray(20)))
            .show(ctx, |ui| {
                ui.vertical_centered(|ui| {
                    ui.add_space(ui.available_height() * 0.10);

                    let logo = self.get_logo_texture(ctx);
                    ui.add(egui::Image::new(&logo).fit_to_exact_size(egui::vec2(100.0, 100.0)));
                    ui.add_space(12.0);

                    ui.heading("ScoreForge Display");
                    ui.add_space(20.0);

                    // --- Create New ---
                    egui::Frame::NONE
                        .fill(egui::Color32::from_gray(30))
                        .inner_margin(16.0)
                        .corner_radius(6.0)
                        .show(ui, |ui| {
                            ui.set_width(340.0);
                            ui.label(
                                egui::RichText::new("New Scoreboard")
                                    .strong()
                                    .size(14.0),
                            );
                            ui.add_space(8.0);
                            ui.horizontal(|ui| {
                                ui.label("Name:");
                                ui.text_edit_singleline(&mut self.state.new_name);
                            });
                            ui.horizontal(|ui| {
                                ui.label("Width:");
                                ui.add(
                                    egui::TextEdit::singleline(&mut self.state.new_width)
                                        .desired_width(80.0),
                                );
                                ui.label("Height:");
                                ui.add(
                                    egui::TextEdit::singleline(&mut self.state.new_height)
                                        .desired_width(80.0),
                                );
                            });
                            ui.add_space(4.0);
                            if ui.button("Create").clicked() {
                                let width: u32 =
                                    self.state.new_width.parse().unwrap_or(1920);
                                let height: u32 =
                                    self.state.new_height.parse().unwrap_or(1080);
                                let project = ProjectState::new(
                                    self.state.new_name.clone(),
                                    width,
                                    height,
                                );
                                self.state.projects.push(project);
                                self.state.active_index = self.state.projects.len() - 1;
                            }
                        });

                    ui.add_space(12.0);

                    // --- Open Existing ---
                    if ui.button("Open Existing Scoreboard...").clicked() {
                        let path = rfd::FileDialog::new()
                            .set_title("Open Scoreboard")
                            .add_filter("ScoreForge Board", &["sfb"])
                            .pick_file();
                        if let Some(path) = path {
                            match crate::storage::scoreboard::load_scoreboard(&path) {
                                Ok(file) => {
                                    let mut project = ProjectState::from_file(file);
                                    project.current_file = Some(path.clone());
                                    self.state.projects.push(project);
                                    self.state.active_index = self.state.projects.len() - 1;
                                    self.state.config.add_recent_file(path);
                                }
                                Err(e) => {
                                    self.state.push_toast(format!("Load failed: {e}"), true);
                                }
                            }
                        }
                    }

                    // --- Import Bundle ---
                    if ui.button("Import Scoreboard Bundle...").clicked() {
                        let path = rfd::FileDialog::new()
                            .set_title("Import Scoreboard Bundle")
                            .add_filter("ScoreForge Board Zip", &["sfbz"])
                            .pick_file();
                        if let Some(path) = path {
                            match crate::storage::scoreboard::import_sfbz(
                                &path,
                                &mut self.state.asset_library,
                            ) {
                                Ok(file) => {
                                    let project = ProjectState::from_file(file);
                                    self.state.projects.push(project);
                                    self.state.active_index = self.state.projects.len() - 1;
                                    self.state
                                        .push_toast("Scoreboard imported".to_string(), false);
                                }
                                Err(e) => {
                                    self.state
                                        .push_toast(format!("Import failed: {e}"), true);
                                }
                            }
                        }
                    }

                    // --- Recent Files ---
                    let recent: Vec<_> = self
                        .state
                        .config
                        .recent_files
                        .iter()
                        .filter(|p| p.exists())
                        .cloned()
                        .collect();

                    if !recent.is_empty() {
                        ui.add_space(16.0);
                        ui.label(
                            egui::RichText::new("Recent")
                                .strong()
                                .color(egui::Color32::from_gray(160)),
                        );
                        ui.add_space(4.0);
                        for path in &recent {
                            let label = path
                                .file_stem()
                                .map(|s| s.to_string_lossy().to_string())
                                .unwrap_or_else(|| path.display().to_string());
                            if ui
                                .button(&label)
                                .on_hover_text(path.display().to_string())
                                .clicked()
                            {
                                match crate::storage::scoreboard::load_scoreboard(path) {
                                    Ok(file) => {
                                        let mut project = ProjectState::from_file(file);
                                        project.current_file = Some(path.clone());
                                        self.state.projects.push(project);
                                        self.state.active_index =
                                            self.state.projects.len() - 1;
                                        self.state.config.add_recent_file(path.clone());
                                    }
                                    Err(e) => {
                                        self.state
                                            .push_toast(format!("Load failed: {e}"), true);
                                    }
                                }
                            }
                        }
                    }
                });
            });
    }

    fn show_tab_bar(&mut self, ctx: &egui::Context) {
        egui::TopBottomPanel::top("tab_bar")
            .frame(
                egui::Frame::NONE
                    .fill(egui::Color32::from_gray(25))
                    .inner_margin(egui::Margin::symmetric(4, 2)),
            )
            .show(ctx, |ui| {
                ui.horizontal(|ui| {
                    let mut switch_to: Option<usize> = None;
                    let mut close_idx: Option<usize> = None;

                    for (i, project) in self.state.projects.iter().enumerate() {
                        let is_active = i == self.state.active_index;
                        let dirty = if project.is_dirty { "*" } else { "" };
                        let label = format!("{}{}", project.scoreboard.name, dirty);

                        let bg = if is_active {
                            egui::Color32::from_gray(45)
                        } else {
                            egui::Color32::from_gray(30)
                        };

                        egui::Frame::NONE
                            .fill(bg)
                            .inner_margin(egui::Margin::symmetric(8, 4))
                            .corner_radius(egui::CornerRadius {
                                nw: 4,
                                ne: 4,
                                sw: 0,
                                se: 0,
                            })
                            .show(ui, |ui| {
                                ui.horizontal(|ui| {
                                    if ui
                                        .selectable_label(is_active, &label)
                                        .clicked()
                                        && !is_active
                                    {
                                        switch_to = Some(i);
                                    }
                                    if ui.small_button("x").clicked() {
                                        close_idx = Some(i);
                                    }
                                });
                            });
                    }

                    if let Some(idx) = switch_to {
                        self.state.active_index = idx;
                    }

                    if let Some(idx) = close_idx {
                        // Clean up display and connection for the closing tab
                        let project = &self.state.projects[idx];
                        if let Ok(mut ds) = project.display_state.lock() {
                            ds.should_close = true;
                        }
                        if let Some(manager) = &project.convex_manager {
                            manager.send_command(LiveDataCommand::Disconnect);
                        }

                        self.state.projects.remove(idx);
                        if self.state.projects.is_empty() {
                            self.state.active_index = 0;
                        } else if self.state.active_index >= self.state.projects.len() {
                            self.state.active_index = self.state.projects.len() - 1;
                        }
                    }
                });
            });
    }
}

impl eframe::App for ScoreForgeApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // Process Convex messages for all projects
        self.state.process_all_convex_messages();

        if !self.state.has_projects() {
            self.show_start_screen(ctx);
            self.show_toasts(ctx);
            return;
        }

        // Load textures for any components that reference assets
        self.ensure_textures_loaded(ctx);

        // Sync display state for all active displays
        self.sync_all_display_states();

        // Show display viewport for each project that has display_active
        // Collect data needed first to avoid borrow issues
        let display_infos: Vec<_> = self
            .state
            .projects
            .iter()
            .filter(|p| p.display_active)
            .map(|p| (Arc::clone(&p.display_state), p.id, p.scoreboard.name.clone()))
            .collect();

        for (ds, project_id, project_name) in display_infos {
            show_display_viewport(ctx, &ds, project_id, &project_name);
        }

        // Top toolbar
        egui::TopBottomPanel::top("toolbar").show(ctx, |ui| {
            toolbar::show_toolbar(ui, &mut self.state);
        });

        // Tab bar (shown when there are projects open)
        self.show_tab_bar(ctx);

        // Left sidebar - component library
        egui::SidePanel::left("component_library")
            .default_width(160.0)
            .show(ctx, |ui| {
                component_library::show_component_library(ui, &mut self.state);
            });

        // Right sidebar - display panel (before property panel so it's to the left)
        egui::SidePanel::right("display_panel")
            .default_width(200.0)
            .show(ctx, |ui| {
                egui::ScrollArea::vertical().show(ui, |ui| {
                    display_panel::show_display_panel(ui, &mut self.state);
                });
            });

        // Right sidebar - property panel
        egui::SidePanel::right("property_panel")
            .default_width(250.0)
            .show(ctx, |ui| {
                egui::ScrollArea::vertical().show(ui, |ui| {
                    property_panel::show_property_panel(ui, &mut self.state);
                });
            });

        // Center - canvas
        egui::CentralPanel::default()
            .frame(egui::Frame::NONE.fill(egui::Color32::from_gray(20)))
            .show(ctx, |ui| {
                canvas::show_canvas(ui, &mut self.state);
            });

        // Dialogs
        self.show_dialogs(ctx);

        // Toasts
        self.show_toasts(ctx);

        // Request continuous repaint when any project has live data or active display
        let needs_repaint = self.state.projects.iter().any(|p| {
            p.connection_step == ConnectionStep::Live || p.display_active
        });
        if needs_repaint {
            ctx.request_repaint();
        }
    }
}
