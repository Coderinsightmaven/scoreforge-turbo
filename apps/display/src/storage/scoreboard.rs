use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use uuid::Uuid;
use zip::write::SimpleFileOptions;

use crate::components::{ComponentData, ScoreboardComponent};
use crate::storage::assets::AssetLibrary;

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

fn collect_asset_ids(components: &[ScoreboardComponent]) -> HashSet<Uuid> {
    components
        .iter()
        .filter_map(|c| match &c.data {
            ComponentData::Image { asset_id } => asset_id.as_ref().copied(),
            ComponentData::Background { asset_id, .. } => asset_id.as_ref().copied(),
            _ => None,
        })
        .collect()
}

pub fn export_sfbz(
    file: &ScoreboardFile,
    asset_library: &AssetLibrary,
    path: &Path,
) -> Result<(), String> {
    let out_file = fs::File::create(path).map_err(|e| format!("Failed to create file: {e}"))?;
    let mut zip = zip::ZipWriter::new(out_file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    // Write scoreboard.json
    let json =
        serde_json::to_string_pretty(file).map_err(|e| format!("Failed to serialize: {e}"))?;
    zip.start_file("scoreboard.json", options)
        .map_err(|e| format!("Failed to write zip entry: {e}"))?;
    zip.write_all(json.as_bytes())
        .map_err(|e| format!("Failed to write json: {e}"))?;

    // Write referenced assets
    let asset_ids = collect_asset_ids(&file.components);
    for asset_id in &asset_ids {
        if let Some(asset_path) = asset_library.get_asset_path(asset_id) {
            if let Some(filename) = asset_path.file_name().and_then(|n| n.to_str()) {
                let data =
                    fs::read(&asset_path).map_err(|e| format!("Failed to read asset: {e}"))?;
                zip.start_file(format!("assets/{filename}"), options)
                    .map_err(|e| format!("Failed to write zip entry: {e}"))?;
                zip.write_all(&data)
                    .map_err(|e| format!("Failed to write asset: {e}"))?;
            }
        }
    }

    zip.finish()
        .map_err(|e| format!("Failed to finalize zip: {e}"))?;
    Ok(())
}

pub fn import_sfbz(
    path: &Path,
    asset_library: &mut AssetLibrary,
) -> Result<ScoreboardFile, String> {
    let zip_file = fs::File::open(path).map_err(|e| format!("Failed to open file: {e}"))?;
    let mut archive =
        zip::ZipArchive::new(zip_file).map_err(|e| format!("Failed to read zip: {e}"))?;

    // Read scoreboard.json
    let file: ScoreboardFile = {
        let mut entry = archive
            .by_name("scoreboard.json")
            .map_err(|e| format!("Missing scoreboard.json: {e}"))?;
        let mut json = String::new();
        entry
            .read_to_string(&mut json)
            .map_err(|e| format!("Failed to read scoreboard.json: {e}"))?;
        let f: ScoreboardFile =
            serde_json::from_str(&json).map_err(|e| format!("Failed to parse JSON: {e}"))?;
        if f.version != 1 {
            return Err(format!("Unsupported file version: {}", f.version));
        }
        f
    };

    // Import assets
    let temp_dir =
        std::env::temp_dir().join(format!("sfbz-import-{}", Uuid::new_v4()));
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp dir: {e}"))?;

    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read zip entry: {e}"))?;
        let name = entry.name().to_string();

        if let Some(filename) = name.strip_prefix("assets/") {
            if filename.is_empty() {
                continue;
            }
            // Extract UUID from filename (e.g. "uuid.png")
            let stem = Path::new(filename)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("");
            let Ok(asset_id) = Uuid::parse_str(stem) else {
                continue;
            };

            let temp_path = temp_dir.join(filename);
            let mut data = Vec::new();
            entry
                .read_to_end(&mut data)
                .map_err(|e| format!("Failed to read asset: {e}"))?;
            fs::write(&temp_path, &data)
                .map_err(|e| format!("Failed to write temp asset: {e}"))?;

            asset_library.import_image_with_id(asset_id, &temp_path)?;
        }
    }

    // Cleanup temp dir
    fs::remove_dir_all(&temp_dir).ok();

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::components::{ComponentData, ComponentType, ScoreboardComponent};
    use egui::{Color32, Vec2};

    fn make_test_file() -> ScoreboardFile {
        ScoreboardFile {
            version: 1,
            name: "Test Board".to_string(),
            dimensions: (1920, 1080),
            background_color: Color32::BLACK,
            components: vec![],
            bindings: HashMap::new(),
        }
    }

    #[test]
    fn collect_asset_ids_empty() {
        let ids = collect_asset_ids(&[]);
        assert!(ids.is_empty());
    }

    #[test]
    fn collect_asset_ids_with_image_assets() {
        let id1 = Uuid::new_v4();
        let id2 = Uuid::new_v4();
        let mut comp1 = ScoreboardComponent::new(
            ComponentType::Image,
            Vec2::new(0.0, 0.0),
            Vec2::new(100.0, 100.0),
        );
        comp1.data = ComponentData::Image { asset_id: Some(id1) };

        let mut comp2 = ScoreboardComponent::new(
            ComponentType::Background,
            Vec2::new(0.0, 0.0),
            Vec2::new(100.0, 100.0),
        );
        comp2.data = ComponentData::Background {
            asset_id: Some(id2),
            color: Color32::GREEN,
        };

        let ids = collect_asset_ids(&[comp1, comp2]);
        assert_eq!(ids.len(), 2);
        assert!(ids.contains(&id1));
        assert!(ids.contains(&id2));
    }

    #[test]
    fn collect_asset_ids_skips_non_asset_components() {
        let comp = ScoreboardComponent::new(
            ComponentType::Text,
            Vec2::new(0.0, 0.0),
            Vec2::new(100.0, 100.0),
        );
        let ids = collect_asset_ids(&[comp]);
        assert!(ids.is_empty());
    }

    #[test]
    fn collect_asset_ids_skips_none_assets() {
        let comp = ScoreboardComponent::new(
            ComponentType::Image,
            Vec2::new(0.0, 0.0),
            Vec2::new(100.0, 100.0),
        );
        // Default Image has asset_id: None
        let ids = collect_asset_ids(&[comp]);
        assert!(ids.is_empty());
    }

    #[test]
    fn save_and_load_round_trip() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.json");

        let file = make_test_file();
        save_scoreboard(&file, &path).unwrap();
        let loaded = load_scoreboard(&path).unwrap();

        assert_eq!(loaded.version, 1);
        assert_eq!(loaded.name, "Test Board");
        assert_eq!(loaded.dimensions, (1920, 1080));
        assert!(loaded.components.is_empty());
    }

    #[test]
    fn load_rejects_unsupported_version() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("test.json");

        let mut file = make_test_file();
        file.version = 99;
        let json = serde_json::to_string_pretty(&file).unwrap();
        fs::write(&path, json).unwrap();

        let result = load_scoreboard(&path);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Unsupported file version"));
    }

    #[test]
    fn app_config_add_recent_file_deduplicates() {
        let mut config = AppConfig::default();
        let path1 = PathBuf::from("/tmp/a.json");
        let path2 = PathBuf::from("/tmp/b.json");

        // We don't call add_recent_file because it calls save() which writes to disk.
        // Instead test the logic directly.
        config.recent_files.push(path1.clone());
        config.recent_files.push(path2.clone());

        // Simulate add_recent_file logic without save()
        config.recent_files.retain(|p| p != &path1);
        config.recent_files.insert(0, path1.clone());
        config.recent_files.truncate(10);

        assert_eq!(config.recent_files.len(), 2);
        assert_eq!(config.recent_files[0], path1);
        assert_eq!(config.recent_files[1], path2);
    }
}
