use std::sync::{Arc, Mutex};

use crate::components::{ComponentData, TextureCache};
use crate::data::convex::ConvexManager;
use crate::data::live_data::{ConnectionStep, LiveDataCommand};
use crate::designer::{canvas, component_library, property_panel, toolbar};
use crate::display::renderer::{DisplayState, show_display_viewport};
use crate::state::AppState;

pub struct ScoreForgeApp {
    state: AppState,
    display_state: Arc<Mutex<DisplayState>>,
}

impl ScoreForgeApp {
    pub fn new(_cc: &eframe::CreationContext<'_>) -> Self {
        let state = AppState::new();
        let display_state = Arc::new(Mutex::new(DisplayState {
            scoreboard: state.scoreboard.clone(),
            components: Vec::new(),
            live_data: None,
            texture_cache: TextureCache::new(),
            should_close: false,
        }));

        Self {
            state,
            display_state,
        }
    }

    fn show_dialogs(&mut self, ctx: &egui::Context) {
        self.show_new_dialog(ctx);
        self.show_connect_dialog(ctx);
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
                        self.state.scoreboard.name = self.state.new_name.clone();
                        self.state.scoreboard.width = width;
                        self.state.scoreboard.height = height;
                        self.state.components.clear();
                        self.state.selected_ids.clear();
                        self.state.undo_stack.clear();
                        self.state.current_file = None;
                        self.state.is_dirty = false;
                        self.state.show_new_dialog = false;
                    }
                    if ui.button("Cancel").clicked() {
                        self.state.show_new_dialog = false;
                    }
                });
            });
    }

    fn show_connect_dialog(&mut self, ctx: &egui::Context) {
        if !self.state.show_connect_dialog {
            return;
        }

        egui::Window::new("Connect to ScoreForge")
            .collapsible(false)
            .resizable(false)
            .anchor(egui::Align2::CENTER_CENTER, [0.0, 0.0])
            .show(ctx, |ui| match &self.state.connection_step {
                ConnectionStep::Disconnected | ConnectionStep::Connecting => {
                    ui.label("Enter your Convex deployment URL and API key:");
                    ui.horizontal(|ui| {
                        ui.label("URL:");
                        ui.text_edit_singleline(&mut self.state.connect_url);
                    });
                    ui.horizontal(|ui| {
                        ui.label("API Key:");
                        ui.text_edit_singleline(&mut self.state.connect_api_key);
                    });
                    ui.horizontal(|ui| {
                        if ui.button("Connect").clicked() {
                            let manager = ConvexManager::new();
                            manager.send_command(LiveDataCommand::Connect {
                                url: self.state.connect_url.clone(),
                                api_key: self.state.connect_api_key.clone(),
                            });
                            self.state.convex_manager = Some(manager);
                            self.state.connection_step = ConnectionStep::Connecting;
                            self.state.config.last_convex_url =
                                Some(self.state.connect_url.clone());
                            self.state.config.save();
                        }
                        if ui.button("Cancel").clicked() {
                            self.state.show_connect_dialog = false;
                        }
                    });
                }
                ConnectionStep::SelectTournament => {
                    ui.label("Select a tournament:");
                    if self.state.tournament_list.is_empty() {
                        ui.spinner();
                        ui.label("Loading tournaments...");
                    }
                    for t in self.state.tournament_list.clone() {
                        if ui.button(format!("{} ({})", t.name, t.status)).clicked() {
                            if let Some(manager) = &self.state.convex_manager {
                                manager
                                    .send_command(LiveDataCommand::SelectTournament(t.id.clone()));
                            }
                            self.state.selected_tournament_id = Some(t.id);
                        }
                    }
                    if ui.button("Back").clicked() {
                        self.state.connection_step = ConnectionStep::Disconnected;
                    }
                }
                ConnectionStep::SelectMatch => {
                    ui.label("Select a match:");
                    if self.state.match_list.is_empty() {
                        ui.spinner();
                        ui.label("Loading matches...");
                    }
                    for m in self.state.match_list.clone() {
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
                            if let Some(manager) = &self.state.convex_manager {
                                manager.send_command(LiveDataCommand::SelectMatch(m.id.clone()));
                            }
                            self.state.selected_match_id = Some(m.id);
                            self.state.show_connect_dialog = false;
                        }
                    }
                    if ui.button("Back").clicked() {
                        self.state.connection_step = ConnectionStep::SelectTournament;
                    }
                }
                ConnectionStep::Live => {
                    ui.colored_label(egui::Color32::GREEN, "Connected - receiving live data");
                    if ui.button("Disconnect").clicked() {
                        if let Some(manager) = &self.state.convex_manager {
                            manager.send_command(LiveDataCommand::Disconnect);
                        }
                        self.state.connection_step = ConnectionStep::Disconnected;
                        self.state.show_connect_dialog = false;
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
        for comp in &self.state.components {
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

    fn sync_display_state(&mut self) {
        if self.state.display_active
            && let Ok(mut ds) = self.display_state.lock()
        {
            ds.scoreboard = self.state.scoreboard.clone();
            ds.components = self.state.components.clone();
            ds.live_data = self.state.live_match_data.clone();
            ds.texture_cache.sync_from(&self.state.texture_cache);
            ds.should_close = false;
        }
    }
}

impl eframe::App for ScoreForgeApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // Process Convex messages
        self.state.process_convex_messages();

        // Load textures for any components that reference assets
        self.ensure_textures_loaded(ctx);

        // Sync display state
        self.sync_display_state();

        // Show display viewport if active
        if self.state.display_active {
            show_display_viewport(ctx, &self.display_state);
        }

        // Top toolbar
        egui::TopBottomPanel::top("toolbar").show(ctx, |ui| {
            toolbar::show_toolbar(ui, &mut self.state);
        });

        // Left sidebar - component library
        egui::SidePanel::left("component_library")
            .default_width(160.0)
            .show(ctx, |ui| {
                component_library::show_component_library(ui, &mut self.state);
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

        // Request continuous repaint when live data is active
        if self.state.connection_step == ConnectionStep::Live || self.state.display_active {
            ctx.request_repaint();
        }
    }
}
