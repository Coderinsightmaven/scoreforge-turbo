use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use egui::{Color32, Vec2};
use uuid::Uuid;

use crate::components::{ComponentData, ScoreboardComponent, TextureCache};
use crate::data::convex::ConvexManager;
use crate::data::live_data::{
    ConnectionStep, LiveDataMessage, MatchInfo, TennisLiveData, TournamentInfo,
};
use crate::display::renderer::DisplayState;
use crate::storage::assets::AssetLibrary;
use crate::storage::scoreboard::{AppConfig, ScoreboardFile};

#[derive(Debug, Clone)]
pub struct Scoreboard {
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub background_color: Color32,
}

impl Default for Scoreboard {
    fn default() -> Self {
        Self {
            name: "Untitled".to_string(),
            width: 1920,
            height: 1080,
            background_color: Color32::BLACK,
        }
    }
}

#[derive(Debug, Clone)]
pub struct DragState {
    pub start_mouse: Vec2,
    pub start_positions: Vec<(Uuid, Vec2)>,
}

pub struct Toast {
    pub message: String,
    pub is_error: bool,
    pub created_at: std::time::Instant,
}

#[derive(Debug, Clone)]
pub struct MonitorInfo {
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

/// Per-tab project state. Each open scoreboard gets its own ProjectState.
pub struct ProjectState {
    // Stable identifier for unique viewport IDs
    pub id: Uuid,

    // Scoreboard
    pub scoreboard: Scoreboard,
    pub components: Vec<ScoreboardComponent>,
    pub component_bindings: HashMap<Uuid, String>,

    // Canvas interaction
    pub selected_ids: HashSet<Uuid>,
    pub drag_state: Option<DragState>,
    pub canvas_zoom: f32,
    pub canvas_pan: Vec2,
    pub needs_fit_to_view: bool,

    // Undo
    pub undo_stack: Vec<Vec<ScoreboardComponent>>,

    // Live data connection (per-project)
    pub convex_manager: Option<ConvexManager>,
    pub connection_step: ConnectionStep,
    pub tournament_list: Vec<TournamentInfo>,
    pub match_list: Vec<MatchInfo>,
    pub selected_tournament_id: Option<String>,
    pub selected_match_id: Option<String>,
    pub live_match_data: Option<TennisLiveData>,

    // Connect dialog (per-project)
    pub show_connect_dialog: bool,

    // Display viewport (per-project)
    pub display_active: bool,
    pub display_fullscreen: bool,
    pub display_offset_x: String,
    pub display_offset_y: String,
    pub selected_monitor: Option<usize>,
    pub display_state: Arc<Mutex<DisplayState>>,

    // Persistence
    pub current_file: Option<PathBuf>,
    pub is_dirty: bool,
}

impl ProjectState {
    pub fn new(name: String, width: u32, height: u32) -> Self {
        Self {
            id: Uuid::new_v4(),
            scoreboard: Scoreboard {
                name,
                width,
                height,
                background_color: Color32::BLACK,
            },
            components: Vec::new(),
            component_bindings: HashMap::new(),
            selected_ids: HashSet::new(),
            drag_state: None,
            canvas_zoom: 0.5,
            canvas_pan: Vec2::new(50.0, 50.0),
            needs_fit_to_view: true,
            undo_stack: Vec::new(),
            convex_manager: None,
            connection_step: ConnectionStep::Disconnected,
            tournament_list: Vec::new(),
            match_list: Vec::new(),
            selected_tournament_id: None,
            selected_match_id: None,
            live_match_data: None,
            show_connect_dialog: false,
            display_active: false,
            display_fullscreen: false,
            display_offset_x: "0".to_string(),
            display_offset_y: "0".to_string(),
            selected_monitor: None,
            display_state: Arc::new(Mutex::new(DisplayState::default())),
            current_file: None,
            is_dirty: false,
        }
    }

    pub fn from_file(file: ScoreboardFile) -> Self {
        Self {
            id: Uuid::new_v4(),
            scoreboard: Scoreboard {
                name: file.name,
                width: file.dimensions.0,
                height: file.dimensions.1,
                background_color: file.background_color,
            },
            components: file.components,
            component_bindings: file.bindings,
            selected_ids: HashSet::new(),
            drag_state: None,
            canvas_zoom: 0.5,
            canvas_pan: Vec2::new(50.0, 50.0),
            needs_fit_to_view: true,
            undo_stack: Vec::new(),
            convex_manager: None,
            connection_step: ConnectionStep::Disconnected,
            tournament_list: Vec::new(),
            match_list: Vec::new(),
            selected_tournament_id: None,
            selected_match_id: None,
            live_match_data: None,
            show_connect_dialog: false,
            display_active: false,
            display_fullscreen: false,
            display_offset_x: "0".to_string(),
            display_offset_y: "0".to_string(),
            selected_monitor: None,
            display_state: Arc::new(Mutex::new(DisplayState::default())),
            current_file: None,
            is_dirty: false,
        }
    }

    pub fn push_undo(&mut self) {
        self.undo_stack.push(self.components.clone());
        if self.undo_stack.len() > 50 {
            self.undo_stack.remove(0);
        }
    }

    pub fn undo(&mut self) {
        if let Some(prev) = self.undo_stack.pop() {
            self.components = prev;
            self.selected_ids.clear();
            self.is_dirty = true;
        }
    }

    pub fn to_scoreboard_file(&self) -> ScoreboardFile {
        ScoreboardFile {
            version: 1,
            name: self.scoreboard.name.clone(),
            dimensions: (self.scoreboard.width, self.scoreboard.height),
            background_color: self.scoreboard.background_color,
            components: self.components.clone(),
            bindings: self.component_bindings.clone(),
        }
    }

    /// Process Convex messages for this project's connection.
    pub fn process_convex_messages(&mut self, toasts: &mut Vec<Toast>) {
        let messages: Vec<LiveDataMessage> = if let Some(manager) = &mut self.convex_manager {
            let mut msgs = Vec::new();
            while let Some(msg) = manager.try_recv() {
                msgs.push(msg);
            }
            msgs
        } else {
            return;
        };

        for msg in messages {
            match msg {
                LiveDataMessage::Connected => {
                    self.connection_step = ConnectionStep::SelectTournament;
                }
                LiveDataMessage::TournamentList(list) => {
                    self.tournament_list = list;
                    self.connection_step = ConnectionStep::SelectTournament;
                }
                LiveDataMessage::MatchList(list) => {
                    self.match_list = list;
                    self.connection_step = ConnectionStep::SelectMatch;
                }
                LiveDataMessage::MatchDataUpdated(data) => {
                    self.live_match_data = Some(data);
                    self.connection_step = ConnectionStep::Live;
                }
                LiveDataMessage::Error(err) => {
                    toasts.push(Toast {
                        message: err,
                        is_error: true,
                        created_at: std::time::Instant::now(),
                    });
                }
                LiveDataMessage::Disconnected => {
                    self.connection_step = ConnectionStep::Disconnected;
                    self.live_match_data = None;
                }
            }
        }
    }
}

pub struct AppState {
    // Open projects (tabs)
    pub projects: Vec<ProjectState>,
    pub active_index: usize,

    // Grid (global settings)
    pub grid_enabled: bool,
    pub grid_size: f32,
    pub snap_to_grid: bool,

    // Clipboard (global, copy between tabs)
    pub clipboard: Vec<ScoreboardComponent>,

    // Assets (global)
    pub asset_library: AssetLibrary,
    pub texture_cache: TextureCache,

    // Persistence
    pub config: AppConfig,

    // UI dialogs
    pub show_new_dialog: bool,
    pub show_connect_dialog: bool,

    // Connect credentials (global — entered once, shared by all tabs)
    pub connect_url: String,
    pub connect_api_key: String,

    // New scoreboard dialog fields
    pub new_name: String,
    pub new_width: String,
    pub new_height: String,

    // Toasts
    pub toasts: Vec<Toast>,

    // Monitor list (global)
    pub monitors: Vec<MonitorInfo>,
}

impl AppState {
    pub fn new() -> Self {
        let config = AppConfig::load();
        let connect_url = config.last_convex_url.clone().unwrap_or_default();
        let monitors = Self::detect_monitors();

        Self {
            projects: Vec::new(),
            active_index: 0,
            grid_enabled: config.grid_enabled,
            grid_size: config.grid_size,
            snap_to_grid: config.snap_to_grid,
            clipboard: Vec::new(),
            asset_library: AssetLibrary::new(),
            texture_cache: TextureCache::new(),
            config,
            show_new_dialog: false,
            show_connect_dialog: false,
            connect_url,
            connect_api_key: String::new(),
            new_name: "Untitled".to_string(),
            new_width: "1920".to_string(),
            new_height: "1080".to_string(),
            toasts: Vec::new(),
            monitors,
        }
    }

    pub fn detect_monitors() -> Vec<MonitorInfo> {
        match display_info::DisplayInfo::all() {
            Ok(displays) => displays
                .into_iter()
                .enumerate()
                .map(|(i, d)| MonitorInfo {
                    name: if d.name.is_empty() {
                        format!("Display {}", i + 1)
                    } else {
                        d.name
                    },
                    x: d.x,
                    y: d.y,
                    width: d.width,
                    height: d.height,
                })
                .collect(),
            Err(_) => Vec::new(),
        }
    }

    /// Whether any project is open (replaces old `project_open` field).
    pub fn has_projects(&self) -> bool {
        !self.projects.is_empty()
    }

    pub fn active_project(&self) -> &ProjectState {
        &self.projects[self.active_index]
    }

    pub fn active_project_mut(&mut self) -> &mut ProjectState {
        &mut self.projects[self.active_index]
    }

    pub fn push_toast(&mut self, message: String, is_error: bool) {
        self.toasts.push(Toast {
            message,
            is_error,
            created_at: std::time::Instant::now(),
        });
    }

    pub fn delete_asset(&mut self, id: &Uuid) {
        // Remove from asset library (deletes file + index entry)
        self.asset_library.delete_asset(id).ok();
        // Remove from texture cache
        self.texture_cache.remove(id);
        // Clear references in all open projects
        for project in &mut self.projects {
            for comp in &mut project.components {
                match &mut comp.data {
                    ComponentData::Image { asset_id } if asset_id.as_ref() == Some(id) => {
                        *asset_id = None;
                    }
                    ComponentData::Background { asset_id, .. }
                        if asset_id.as_ref() == Some(id) =>
                    {
                        *asset_id = None;
                    }
                    _ => {}
                }
            }
        }
    }

    /// Process Convex messages for all projects.
    pub fn process_all_convex_messages(&mut self) {
        for project in &mut self.projects {
            project.process_convex_messages(&mut self.toasts);
        }
    }
}
