use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use egui::{Color32, Vec2};
use uuid::Uuid;

use crate::components::{ComponentData, ScoreboardComponent, TextureCache};
use crate::data::convex::ConvexManager;
use crate::data::live_data::{ConnectionStep, LiveDataMessage, TennisLiveData, TournamentInfo};
use crate::display::renderer::DisplayState;
use crate::flags::FlagCache;
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
    pub scale_factor: f32,
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
    pub court_list: Vec<String>,
    pub selected_tournament_id: Option<String>,
    pub selected_court: Option<String>,
    pub live_match_data: Option<TennisLiveData>,
    pub pairing_code: Option<String>,
    pub pairing_expires_at: Option<i64>,
    pub paired_api_key: Option<String>,

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
            court_list: Vec::new(),
            selected_tournament_id: None,
            selected_court: None,
            live_match_data: None,
            pairing_code: None,
            pairing_expires_at: None,
            paired_api_key: None,
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
            court_list: Vec::new(),
            selected_tournament_id: None,
            selected_court: None,
            live_match_data: None,
            pairing_code: None,
            pairing_expires_at: None,
            paired_api_key: None,
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
                LiveDataMessage::PairingStarted {
                    pairing_code,
                    expires_at,
                } => {
                    self.pairing_code = Some(pairing_code);
                    self.pairing_expires_at = Some(expires_at);
                    self.connection_step = ConnectionStep::Pairing;
                }
                LiveDataMessage::PairingCompleted { api_key } => {
                    self.pairing_code = None;
                    self.pairing_expires_at = None;
                    self.paired_api_key = Some(api_key);
                    self.connection_step = ConnectionStep::Disconnected;
                }
                LiveDataMessage::PairingExpired => {
                    self.pairing_code = None;
                    self.pairing_expires_at = None;
                    self.connection_step = ConnectionStep::Disconnected;
                    toasts.push(Toast {
                        message: "Pairing code expired. Start pairing again.".to_string(),
                        is_error: true,
                        created_at: std::time::Instant::now(),
                    });
                }
                LiveDataMessage::Connected => {
                    self.connection_step = ConnectionStep::SelectTournament;
                }
                LiveDataMessage::TournamentList(list) => {
                    self.tournament_list = list;
                    self.connection_step = ConnectionStep::SelectTournament;
                }
                LiveDataMessage::CourtList(list) => {
                    self.court_list = list;
                    self.connection_step = ConnectionStep::SelectCourt;
                }
                LiveDataMessage::MatchDataUpdated(data) => {
                    self.live_match_data = Some(data);
                    self.connection_step = ConnectionStep::Live;
                }
                LiveDataMessage::CourtNoActiveMatch => {
                    self.live_match_data = None;
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
    pub flag_cache: FlagCache,

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
        let connect_api_key = config.last_api_key.clone().unwrap_or_default();
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
            flag_cache: FlagCache::new(),
            config,
            show_new_dialog: false,
            show_connect_dialog: false,
            connect_url,
            connect_api_key,
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
                    scale_factor: d.scale_factor,
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
                    ComponentData::Background { asset_id, .. } if asset_id.as_ref() == Some(id) => {
                        *asset_id = None;
                    }
                    _ => {}
                }
            }
        }
    }

    /// Process Convex messages for all projects.
    pub fn process_all_convex_messages(&mut self) {
        let mut paired_key: Option<String> = None;
        for project in &mut self.projects {
            project.process_convex_messages(&mut self.toasts);
            if paired_key.is_none() {
                paired_key = project.paired_api_key.take();
            }
        }

        if let Some(api_key) = paired_key {
            self.connect_api_key = api_key.clone();
            self.config.last_api_key = Some(api_key);
            self.config.save();
            self.push_toast("Device paired successfully".to_string(), false);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn project_state_new_defaults() {
        let state = ProjectState::new("Test".to_string(), 1920, 1080);
        assert_eq!(state.scoreboard.name, "Test");
        assert_eq!(state.scoreboard.width, 1920);
        assert_eq!(state.scoreboard.height, 1080);
        assert_eq!(state.scoreboard.background_color, Color32::BLACK);
        assert!(state.components.is_empty());
        assert!(state.selected_ids.is_empty());
        assert!(state.undo_stack.is_empty());
        assert_eq!(state.canvas_zoom, 0.5);
        assert!(!state.is_dirty);
        assert!(state.current_file.is_none());
        assert_eq!(state.connection_step, ConnectionStep::Disconnected);
    }

    #[test]
    fn push_undo_stores_state() {
        let mut state = ProjectState::new("Test".to_string(), 800, 600);
        assert_eq!(state.undo_stack.len(), 0);

        state.push_undo();
        assert_eq!(state.undo_stack.len(), 1);

        state.push_undo();
        assert_eq!(state.undo_stack.len(), 2);
    }

    #[test]
    fn push_undo_caps_at_50() {
        let mut state = ProjectState::new("Test".to_string(), 800, 600);
        for _ in 0..60 {
            state.push_undo();
        }
        assert_eq!(state.undo_stack.len(), 50);
    }

    #[test]
    fn undo_restores_previous_components() {
        let mut state = ProjectState::new("Test".to_string(), 800, 600);

        // Push initial state (empty components)
        state.push_undo();

        // Add a component
        let comp = ScoreboardComponent::new(
            crate::components::ComponentType::Text,
            Vec2::new(10.0, 20.0),
            Vec2::new(100.0, 50.0),
        );
        state.components.push(comp);
        assert_eq!(state.components.len(), 1);

        // Undo should restore to empty
        state.undo();
        assert!(state.components.is_empty());
        assert!(state.is_dirty);
    }

    #[test]
    fn undo_with_empty_stack_does_nothing() {
        let mut state = ProjectState::new("Test".to_string(), 800, 600);
        let comp = ScoreboardComponent::new(
            crate::components::ComponentType::Text,
            Vec2::new(0.0, 0.0),
            Vec2::new(50.0, 50.0),
        );
        state.components.push(comp);

        state.undo(); // empty stack, should be a no-op
        assert_eq!(state.components.len(), 1);
        assert!(!state.is_dirty);
    }

    #[test]
    fn undo_clears_selection() {
        let mut state = ProjectState::new("Test".to_string(), 800, 600);
        state.push_undo();

        let id = Uuid::new_v4();
        state.selected_ids.insert(id);

        state.undo();
        assert!(state.selected_ids.is_empty());
    }

    #[test]
    fn to_scoreboard_file_preserves_data() {
        let mut state = ProjectState::new("My Scoreboard".to_string(), 1280, 720);
        let comp = ScoreboardComponent::new(
            crate::components::ComponentType::TennisGameScore,
            Vec2::new(100.0, 200.0),
            Vec2::new(80.0, 40.0),
        );
        state.components.push(comp);

        let file = state.to_scoreboard_file();
        assert_eq!(file.version, 1);
        assert_eq!(file.name, "My Scoreboard");
        assert_eq!(file.dimensions, (1280, 720));
        assert_eq!(file.components.len(), 1);
    }
}
