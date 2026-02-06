use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::components::ScoreboardComponent;

mod serde_color32 {
    use egui::Color32;
    use serde::{Deserialize, Deserializer, Serialize, Serializer};

    #[derive(Serialize, Deserialize)]
    struct C(u8, u8, u8, u8);

    pub fn serialize<S: Serializer>(color: &Color32, s: S) -> Result<S::Ok, S::Error> {
        C(color.r(), color.g(), color.b(), color.a()).serialize(s)
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(d: D) -> Result<Color32, D::Error> {
        let C(r, g, b, a) = C::deserialize(d)?;
        Ok(Color32::from_rgba_unmultiplied(r, g, b, a))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreboardFile {
    pub version: u32,
    pub name: String,
    pub dimensions: (u32, u32),
    #[serde(with = "serde_color32")]
    pub background_color: egui::Color32,
    pub components: Vec<ScoreboardComponent>,
    pub bindings: HashMap<Uuid, String>,
}

pub fn save_scoreboard(file: &ScoreboardFile, path: &Path) -> Result<(), String> {
    let json =
        serde_json::to_string_pretty(file).map_err(|e| format!("Failed to serialize: {e}"))?;
    fs::write(path, json).map_err(|e| format!("Failed to write file: {e}"))
}

pub fn load_scoreboard(path: &Path) -> Result<ScoreboardFile, String> {
    let json = fs::read_to_string(path).map_err(|e| format!("Failed to read file: {e}"))?;
    let file: ScoreboardFile =
        serde_json::from_str(&json).map_err(|e| format!("Failed to parse file: {e}"))?;
    if file.version != 1 {
        return Err(format!("Unsupported file version: {}", file.version));
    }
    Ok(file)
}

// --- App Config ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub recent_files: Vec<PathBuf>,
    pub last_convex_url: Option<String>,
    pub grid_size: f32,
    pub grid_enabled: bool,
    pub snap_to_grid: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            recent_files: Vec::new(),
            last_convex_url: None,
            grid_size: 20.0,
            grid_enabled: true,
            snap_to_grid: true,
        }
    }
}

impl AppConfig {
    fn config_path() -> PathBuf {
        directories::ProjectDirs::from("com", "tempuz", "scoreforge-display")
            .map(|dirs| dirs.data_dir().join("config.json"))
            .unwrap_or_else(|| PathBuf::from("config.json"))
    }

    pub fn load() -> Self {
        let path = Self::config_path();
        if path.exists() {
            fs::read_to_string(&path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            Self::default()
        }
    }

    pub fn save(&self) {
        let path = Self::config_path();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).ok();
        }
        if let Ok(json) = serde_json::to_string_pretty(self) {
            fs::write(path, json).ok();
        }
    }

    pub fn add_recent_file(&mut self, path: PathBuf) {
        self.recent_files.retain(|p| p != &path);
        self.recent_files.insert(0, path);
        self.recent_files.truncate(10);
        self.save();
    }
}
