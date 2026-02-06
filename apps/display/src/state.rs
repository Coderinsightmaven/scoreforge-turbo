use std::collections::{HashMap, HashSet};
use std::path::PathBuf;

use egui::{Color32, Vec2};
use uuid::Uuid;

use crate::components::{ComponentData, ScoreboardComponent, TextureCache};
use crate::data::convex::ConvexManager;
use crate::data::live_data::{
    ConnectionStep, LiveDataMessage, MatchInfo, TennisLiveData, TournamentInfo,
};
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

pub struct AppState {
    // Scoreboard
    pub scoreboard: Scoreboard,
    pub components: Vec<ScoreboardComponent>,

    // Canvas interaction
    pub selected_ids: HashSet<Uuid>,
    pub drag_state: Option<DragState>,
    pub canvas_zoom: f32,
    pub canvas_pan: Vec2,

    // Grid
    pub grid_enabled: bool,
    pub grid_size: f32,
    pub snap_to_grid: bool,

    // Clipboard
    pub clipboard: Vec<ScoreboardComponent>,

    // Undo
    pub undo_stack: Vec<Vec<ScoreboardComponent>>,

    // Assets
    pub asset_library: AssetLibrary,
    pub texture_cache: TextureCache,

    // Live data
    pub convex_manager: Option<ConvexManager>,
    pub connection_step: ConnectionStep,
    pub tournament_list: Vec<TournamentInfo>,
    pub match_list: Vec<MatchInfo>,
    pub selected_tournament_id: Option<String>,
    pub selected_match_id: Option<String>,
    pub live_match_data: Option<TennisLiveData>,
    pub component_bindings: HashMap<Uuid, String>,

    // Persistence
    pub current_file: Option<PathBuf>,
    pub is_dirty: bool,
    pub config: AppConfig,

    // UI dialogs
    pub show_connect_dialog: bool,
    pub show_new_dialog: bool,

    // Connect dialog fields
    pub connect_url: String,
    pub connect_api_key: String,

    // New scoreboard dialog fields
    pub new_name: String,
    pub new_width: String,
    pub new_height: String,

    // Toasts
    pub toasts: Vec<Toast>,

    // Display viewport
    pub display_active: bool,
    pub display_fullscreen: bool,
    pub display_offset_x: String,
    pub display_offset_y: String,
}

impl AppState {
    pub fn new() -> Self {
        let config = AppConfig::load();
        let connect_url = config.last_convex_url.clone().unwrap_or_default();

        Self {
            scoreboard: Scoreboard::default(),
            components: Vec::new(),
            selected_ids: HashSet::new(),
            drag_state: None,
            canvas_zoom: 0.5,
            canvas_pan: Vec2::new(50.0, 50.0),
            grid_enabled: config.grid_enabled,
            grid_size: config.grid_size,
            snap_to_grid: config.snap_to_grid,
            clipboard: Vec::new(),
            undo_stack: Vec::new(),
            asset_library: AssetLibrary::new(),
            texture_cache: TextureCache::new(),
            convex_manager: None,
            connection_step: ConnectionStep::Disconnected,
            tournament_list: Vec::new(),
            match_list: Vec::new(),
            selected_tournament_id: None,
            selected_match_id: None,
            live_match_data: None,
            component_bindings: HashMap::new(),
            current_file: None,
            is_dirty: false,
            config,
            show_connect_dialog: false,
            show_new_dialog: false,
            connect_url,
            connect_api_key: String::new(),
            new_name: "Untitled".to_string(),
            new_width: "1920".to_string(),
            new_height: "1080".to_string(),
            toasts: Vec::new(),
            display_active: false,
            display_fullscreen: false,
            display_offset_x: "0".to_string(),
            display_offset_y: "0".to_string(),
        }
    }

    pub fn push_toast(&mut self, message: String, is_error: bool) {
        self.toasts.push(Toast {
            message,
            is_error,
            created_at: std::time::Instant::now(),
        });
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

    pub fn load_from_file(&mut self, file: ScoreboardFile) {
        self.scoreboard.name = file.name;
        self.scoreboard.width = file.dimensions.0;
        self.scoreboard.height = file.dimensions.1;
        self.scoreboard.background_color = file.background_color;
        self.components = file.components;
        self.component_bindings = file.bindings;
        self.selected_ids.clear();
        self.undo_stack.clear();
        self.is_dirty = false;
    }

    pub fn delete_asset(&mut self, id: &Uuid) {
        // Remove from asset library (deletes file + index entry)
        self.asset_library.delete_asset(id).ok();
        // Remove from texture cache
        self.texture_cache.remove(id);
        // Clear references in all components
        for comp in &mut self.components {
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

    pub fn process_convex_messages(&mut self) {
        // Collect messages first to avoid borrow conflict
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
                    self.push_toast(err, true);
                }
                LiveDataMessage::Disconnected => {
                    self.connection_step = ConnectionStep::Disconnected;
                    self.live_match_data = None;
                }
            }
        }
    }
}
