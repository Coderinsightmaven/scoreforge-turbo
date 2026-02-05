// src-tauri/src/commands/storage.rs
use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::fs;
use serde_json;
use std::io::{Write, Read};
use zip::{ZipWriter, ZipArchive};
use zip::write::FileOptions;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreboardConfig {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub filename: String,
    pub data: serde_json::Value,
    pub created_at: String,
    pub updated_at: String,
}

#[tauri::command]
pub async fn save_scoreboard(
    app: AppHandle,
    name: String,
    data: serde_json::Value,
) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;

    let scoreboards_dir = app_data_dir.join("scoreboards");

    // Create directory if it doesn't exist
    if !scoreboards_dir.exists() {
        fs::create_dir_all(&scoreboards_dir).map_err(|e| e.to_string())?;
    }

    let filename = format!("{}.json", sanitize_filename(&name));
    let file_path = scoreboards_dir.join(&filename);

    // Check if a scoreboard with this name already exists
    // If so, preserve the original ID and created_at timestamp
    let (id, created_at) = if file_path.exists() {
        // Try to read the existing scoreboard to preserve its ID and created_at
        match fs::read_to_string(&file_path) {
            Ok(existing_json) => {
                match serde_json::from_str::<ScoreboardConfig>(&existing_json) {
                    Ok(existing_config) => (existing_config.id, existing_config.created_at),
                    Err(_) => (uuid::Uuid::new_v4().to_string(), chrono::Utc::now().to_rfc3339()),
                }
            }
            Err(_) => (uuid::Uuid::new_v4().to_string(), chrono::Utc::now().to_rfc3339()),
        }
    } else {
        (uuid::Uuid::new_v4().to_string(), chrono::Utc::now().to_rfc3339())
    };

    let config = ScoreboardConfig {
        id,
        name: name.clone(),
        filename: filename.clone(), // Store the actual filename used
        data,
        created_at,
        updated_at: chrono::Utc::now().to_rfc3339(),
    };

    let json_data = serde_json::to_string_pretty(&config)
        .map_err(|e| e.to_string())?;

    fs::write(&file_path, json_data).map_err(|e| e.to_string())?;

    Ok(filename)
}

#[tauri::command]
pub async fn load_scoreboard(
    app: AppHandle,
    filename: String,
) -> Result<ScoreboardConfig, String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;
    
    let file_path = app_data_dir.join("scoreboards").join(&filename);
    
    if !file_path.exists() {
        return Err("Scoreboard file not found".to_string());
    }
    
    let json_data = fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let config: ScoreboardConfig = serde_json::from_str(&json_data)
        .map_err(|e| e.to_string())?;
    
    Ok(config)
}

#[tauri::command]
pub async fn list_scoreboards(app: AppHandle) -> Result<Vec<ScoreboardConfig>, String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;
    
    let scoreboards_dir = app_data_dir.join("scoreboards");
    
    if !scoreboards_dir.exists() {
        return Ok(vec![]);
    }
    
    let mut scoreboards = Vec::new();
    
    let entries = fs::read_dir(&scoreboards_dir).map_err(|e| e.to_string())?;
    
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        // Only process .json files
        if path.extension().and_then(|s| s.to_str()) == Some("json") {
            // Verify the file actually exists and is readable
            if !path.exists() {
                log::warn!("Skipping non-existent file: {:?}", path);
                continue;
            }
            
            match fs::read_to_string(&path) {
                Ok(json_data) => {
                    match serde_json::from_str::<ScoreboardConfig>(&json_data) {
                        Ok(mut config) => {
                            // Handle legacy configs that might not have filename field
                            if config.filename.is_empty() {
                                if let Some(filename) = path.file_name().and_then(|s| s.to_str()) {
                                    config.filename = filename.to_string();
                                } else {
                                    log::warn!("Could not determine filename for config");
                                    continue;
                                }
                            }
                            
                            // Double-check that the referenced file actually exists
                            let config_file_path = scoreboards_dir.join(&config.filename);
                            if config_file_path.exists() {
                                scoreboards.push(config);
                            } else {
                                log::warn!("Config references non-existent file: {}", config.filename);
                            }
                        },
                        Err(e) => {
                            log::warn!("Skipping invalid JSON file {:?}: {}", path, e);
                            continue;
                        }
                    }
                }
                Err(e) => {
                    log::warn!("Could not read file {:?}: {}", path, e);
                    continue;
                }
            }
        }
    }
    
    log::debug!("Returning {} valid scoreboards", scoreboards.len());
    Ok(scoreboards)
}

#[tauri::command]
pub async fn delete_scoreboard(
    app: AppHandle,
    filename: String,
) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;
    
    let file_path = app_data_dir.join("scoreboards").join(&filename);
    
    if !file_path.exists() {
        return Err("Scoreboard file not found".to_string());
    }
    
    fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn export_scoreboard(
    app: AppHandle,
    filename: String,
    export_path: String,
) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;
    
    let source_path = app_data_dir.join("scoreboards").join(&filename);
    let export_path = PathBuf::from(export_path);
    
    if !source_path.exists() {
        return Err("Scoreboard file not found".to_string());
    }
    
    fs::copy(&source_path, &export_path).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
pub async fn export_scoreboard_as_zip(
    app: AppHandle,
    filename: String,
) -> Result<Vec<u8>, String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;
    
    let scoreboard_path = app_data_dir.join("scoreboards").join(&filename);
    
    if !scoreboard_path.exists() {
        return Err("Scoreboard file not found".to_string());
    }
    
    // Read the scoreboard configuration
    let scoreboard_content = fs::read_to_string(&scoreboard_path)
        .map_err(|e| format!("Failed to read scoreboard file: {}", e))?;
    
    let scoreboard_config: serde_json::Value = serde_json::from_str(&scoreboard_content)
        .map_err(|e| format!("Failed to parse scoreboard config: {}", e))?;
    
    // Create in-memory zip
    let mut zip_data = Vec::new();
    {
        let mut zip = ZipWriter::new(std::io::Cursor::new(&mut zip_data));
        let options: FileOptions<'_, ()> = FileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated)
            .unix_permissions(0o755);
        
        // Add the scoreboard configuration
        zip.start_file("scoreboard.json", options)
            .map_err(|e| format!("Failed to create scoreboard.json in zip: {}", e))?;
        zip.write_all(scoreboard_content.as_bytes())
            .map_err(|e| format!("Failed to write scoreboard.json: {}", e))?;
        
        // Collect all image IDs used in the scoreboard
        let mut used_image_ids = std::collections::HashSet::new();
        
        // Components are nested under "data" in the saved scoreboard structure
        if let Some(data) = scoreboard_config.get("data") {
            if let Some(components) = data.get("components").and_then(|c| c.as_array()) {
                for component in components {
                    if let Some(component_data) = component.get("data") {
                        if let Some(image_id) = component_data.get("imageId").and_then(|id| id.as_str()) {
                            used_image_ids.insert(image_id.to_string());
                            log::debug!("Found image ID in component: {}", image_id);
                        }
                    }
                }
            }
        }
        
        log::debug!("Found {} image IDs in scoreboard: {:?}", used_image_ids.len(), used_image_ids);
        
        // If there are images, add them to the zip
        if !used_image_ids.is_empty() {
            log::debug!("Attempting to add {} images to ZIP", used_image_ids.len());
            // Load image metadata
            let images_dir = app_data_dir.join("images");
            let metadata_file = images_dir.join("metadata.json");
            
            log::debug!("Looking for image metadata at: {:?}", metadata_file);
            if metadata_file.exists() {
                log::debug!("Image metadata file found, reading content...");
                let metadata_content = fs::read_to_string(&metadata_file)
                    .map_err(|e| format!("Failed to read image metadata: {}", e))?;
                
                let images: Vec<serde_json::Value> = serde_json::from_str(&metadata_content)
                    .map_err(|e| format!("Failed to parse image metadata: {}", e))?;
                
                log::debug!("Loaded {} images from metadata", images.len());
                
                // Add used images to zip
                for image in &images {
                    if let Some(id) = image.get("id").and_then(|id| id.as_str()) {
                        if used_image_ids.contains(id) {
                            log::debug!("Processing image with ID: {}", id);
                            if let Some(path) = image.get("path").and_then(|p| p.as_str()) {
                                log::debug!("Image path: {}", path);
                                let image_path = PathBuf::from(path);
                                if image_path.exists() {
                                    log::debug!("Image file exists, reading data...");
                                    let image_data = fs::read(&image_path)
                                        .map_err(|e| format!("Failed to read image file {}: {}", path, e))?;
                                    
                                    let filename = image_path.file_name()
                                        .and_then(|n| n.to_str())
                                        .unwrap_or("unknown");
                                    
                                    log::debug!("Adding image to ZIP: images/{}", filename);
                                    zip.start_file(&format!("images/{}", filename), options)
                                        .map_err(|e| format!("Failed to create image file in zip: {}", e))?;
                                    zip.write_all(&image_data)
                                        .map_err(|e| format!("Failed to write image data: {}", e))?;
                                    
                                    log::debug!("Successfully added image {} to ZIP", filename);
                                } else {
                                    log::warn!("Image file does not exist at path: {}", path);
                                }
                            } else {
                                log::warn!("No path found for image ID: {}", id);
                            }
                        }
                    }
                }
                
                // Add image metadata for used images
                let used_images: Vec<serde_json::Value> = images.into_iter()
                    .filter(|img| {
                        img.get("id")
                            .and_then(|id| id.as_str())
                            .map(|id| used_image_ids.contains(id))
                            .unwrap_or(false)
                    })
                    .collect();
                
                if !used_images.is_empty() {
                    log::debug!("Adding metadata for {} used images to ZIP", used_images.len());
                    let metadata_json = serde_json::to_string_pretty(&used_images)
                        .map_err(|e| format!("Failed to serialize image metadata: {}", e))?;
                    
                    zip.start_file("images/metadata.json", options)
                        .map_err(|e| format!("Failed to create metadata.json in zip: {}", e))?;
                    zip.write_all(metadata_json.as_bytes())
                        .map_err(|e| format!("Failed to write metadata.json: {}", e))?;
                    
                    log::debug!("Successfully added image metadata to ZIP");
                } else {
                    log::debug!("No used images found in metadata");
                }
            } else {
                log::warn!("Image metadata file not found at: {:?}", metadata_file);
            }
        } else {
            log::debug!("No images found in scoreboard components");
        }
        
        zip.finish()
            .map_err(|e| format!("Failed to finalize zip: {}", e))?;
    }
    
    Ok(zip_data)
}

#[tauri::command]
pub async fn import_scoreboard_from_zip(
    app: AppHandle,
    zip_data: Vec<u8>,
) -> Result<ScoreboardConfig, String> {
    // Create a cursor from the zip data
    let cursor = std::io::Cursor::new(zip_data.clone());
    let mut archive = ZipArchive::new(cursor)
        .map_err(|e| format!("Failed to read ZIP file: {}", e))?;
    
    // First pass: validate structure and read scoreboard.json
    let mut scoreboard_content = String::new();
    let mut has_scoreboard = false;
    
    // Find and read scoreboard.json
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .map_err(|e| format!("Failed to read file from ZIP: {}", e))?;
        
        if file.name() == "scoreboard.json" {
            file.read_to_string(&mut scoreboard_content)
                .map_err(|e| format!("Failed to read scoreboard.json: {}", e))?;
            has_scoreboard = true;
            break;
        }
    }
    
    if !has_scoreboard {
        return Err("Invalid ZIP: missing scoreboard.json".to_string());
    }
    
    // Parse scoreboard configuration
    let mut scoreboard_config: ScoreboardConfig = serde_json::from_str(&scoreboard_content)
        .map_err(|e| format!("Invalid scoreboard.json format: {}", e))?;
    
    // Generate new unique name if a scoreboard with the same name exists
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;
    let scoreboards_dir = app_data_dir.join("scoreboards");
    
    let mut final_name = scoreboard_config.name.clone();
    let mut counter = 1;
    while scoreboards_dir.join(&format!("{}.json", final_name)).exists() {
        final_name = format!("{} ({})", scoreboard_config.name, counter);
        counter += 1;
    }
    scoreboard_config.name = final_name;
    
    // Second pass: handle images if they exist
    let mut imported_image_mapping = std::collections::HashMap::new();
    
    // Reset archive for second pass
    let cursor = std::io::Cursor::new(&zip_data);
    let mut archive = ZipArchive::new(cursor)
        .map_err(|e| format!("Failed to re-read ZIP file: {}", e))?;
    
    // Check if we have images to import
    let has_images = (0..archive.len()).any(|i| {
        if let Ok(file) = archive.by_index(i) {
            file.name().starts_with("images/") && file.name() != "images/" && file.name() != "images/metadata.json"
        } else {
            false
        }
    });
    
    if has_images {
        // Import images
        let images_dir = app_data_dir.join("images");
        if !images_dir.exists() {
            fs::create_dir_all(&images_dir)
                .map_err(|e| format!("Failed to create images directory: {}", e))?;
        }
        
        // Load existing image metadata
        let metadata_file = images_dir.join("metadata.json");
        let mut existing_images: Vec<serde_json::Value> = if metadata_file.exists() {
            let content = fs::read_to_string(&metadata_file)
                .map_err(|e| format!("Failed to read existing image metadata: {}", e))?;
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            Vec::new()
        };
        
        // Read image metadata from ZIP
        let mut image_metadata_content = String::new();
        for i in 0..archive.len() {
            let mut file = archive.by_index(i)
                .map_err(|e| format!("Failed to read file from ZIP: {}", e))?;
            
            if file.name() == "images/metadata.json" {
                file.read_to_string(&mut image_metadata_content)
                    .map_err(|e| format!("Failed to read image metadata: {}", e))?;
                break;
            }
        }
        
        if !image_metadata_content.is_empty() {
            let zip_images: Vec<serde_json::Value> = serde_json::from_str(&image_metadata_content)
                .map_err(|e| format!("Invalid image metadata format: {}", e))?;
            
            // Import each image
            for zip_image in zip_images {
                if let Some(old_id) = zip_image.get("id").and_then(|id| id.as_str()) {
                    if let Some(original_name) = zip_image.get("name").and_then(|name| name.as_str()) {
                        // Generate new unique ID to avoid conflicts
                        let new_id = Uuid::new_v4().to_string();
                        let file_extension = original_name.split('.').last().unwrap_or("png");
                        let new_filename = format!("{}.{}", new_id, file_extension);
                        
                        // Find and extract the image file from ZIP
                        let zip_image_path = format!("images/{}", original_name);
                        for i in 0..archive.len() {
                            let mut file = archive.by_index(i)
                                .map_err(|e| format!("Failed to read file from ZIP: {}", e))?;
                            
                            if file.name() == zip_image_path {
                                let mut image_data = Vec::new();
                                file.read_to_end(&mut image_data)
                                    .map_err(|e| format!("Failed to read image data: {}", e))?;
                                
                                // Save image to disk
                                let new_image_path = images_dir.join(&new_filename);
                                fs::write(&new_image_path, &image_data)
                                    .map_err(|e| format!("Failed to save imported image: {}", e))?;
                                
                                // Create new metadata entry
                                let mut new_image_metadata = zip_image.clone();
                                if let Some(metadata_obj) = new_image_metadata.as_object_mut() {
                                    metadata_obj.insert("id".to_string(), serde_json::Value::String(new_id.clone()));
                                    metadata_obj.insert("name".to_string(), serde_json::Value::String(new_filename.clone()));
                                    metadata_obj.insert("path".to_string(), serde_json::Value::String(new_image_path.to_string_lossy().to_string()));
                                    metadata_obj.insert("uploadedAt".to_string(), serde_json::Value::String(chrono::Utc::now().to_rfc3339()));
                                }
                                
                                existing_images.push(new_image_metadata);
                                imported_image_mapping.insert(old_id.to_string(), new_id);
                                break;
                            }
                        }
                    }
                }
            }
            
            // Save updated image metadata
            let updated_metadata = serde_json::to_string_pretty(&existing_images)
                .map_err(|e| format!("Failed to serialize image metadata: {}", e))?;
            fs::write(&metadata_file, updated_metadata)
                .map_err(|e| format!("Failed to save updated image metadata: {}", e))?;
        }
    }
    
    // Update scoreboard configuration to use new image IDs
    if let Some(components) = scoreboard_config.data.get_mut("components").and_then(|c| c.as_array_mut()) {
        for component in components {
            if let Some(data) = component.get_mut("data").and_then(|d| d.as_object_mut()) {
                if let Some(image_id) = data.get("imageId").and_then(|id| id.as_str()) {
                    if let Some(new_id) = imported_image_mapping.get(image_id) {
                        data.insert("imageId".to_string(), serde_json::Value::String(new_id.clone()));
                    }
                }
            }
        }
    }
    
    // Save the imported scoreboard
    if !scoreboards_dir.exists() {
        fs::create_dir_all(&scoreboards_dir)
            .map_err(|e| format!("Failed to create scoreboards directory: {}", e))?;
    }
    
    let scoreboard_file = scoreboards_dir.join(&format!("{}.json", scoreboard_config.name));
    let updated_scoreboard_content = serde_json::to_string_pretty(&scoreboard_config)
        .map_err(|e| format!("Failed to serialize updated scoreboard: {}", e))?;
    
    fs::write(&scoreboard_file, updated_scoreboard_content)
        .map_err(|e| format!("Failed to save imported scoreboard: {}", e))?;
    
    Ok(scoreboard_config)
}

#[tauri::command]
pub async fn import_scoreboard(
    app: AppHandle,
    import_path: String,
) -> Result<ScoreboardConfig, String> {
    let app_data_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?;
    
    let import_path = PathBuf::from(import_path);
    
    if !import_path.exists() {
        return Err("Import file not found".to_string());
    }
    
    let json_data = fs::read_to_string(&import_path).map_err(|e| e.to_string())?;
    let mut config: ScoreboardConfig = serde_json::from_str(&json_data)
        .map_err(|e| e.to_string())?;
    
    // Generate new ID and update timestamps
    config.id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    config.updated_at = now;
    
    // Save to app data directory
    let scoreboards_dir = app_data_dir.join("scoreboards");
    fs::create_dir_all(&scoreboards_dir).map_err(|e| e.to_string())?;
    
    let filename = format!("{}.json", sanitize_filename(&config.name));
    let file_path = scoreboards_dir.join(&filename);
    
    let json_data = serde_json::to_string_pretty(&config)
        .map_err(|e| e.to_string())?;
    
    fs::write(&file_path, json_data).map_err(|e| e.to_string())?;
    
    Ok(config)
}

fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| match c {
            'a'..='z' | 'A'..='Z' | '0'..='9' | '-' | '_' => c,
            _ => '_',
        })
        .collect()
}

// Live Data Connection Storage
#[derive(serde::Serialize, serde::Deserialize)]
pub struct LiveDataConnectionData {
    pub id: String,
    pub name: String,
    pub provider: String,
    #[serde(rename = "apiUrl")]
    pub api_url: String,
    #[serde(rename = "token")]
    pub token: String,
    #[serde(rename = "pollInterval")]
    pub poll_interval: u32,
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: Option<String>,
    #[serde(rename = "lastUpdated")]
    pub last_updated: Option<String>,
    #[serde(rename = "lastError")]
    pub last_error: Option<String>,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct LiveDataBinding {
    #[serde(rename = "componentId")]
    pub component_id: String,
    #[serde(rename = "connectionId")]
    pub connection_id: String,
    #[serde(rename = "dataPath")]
    pub data_path: String,
    #[serde(rename = "updateInterval")]
    pub update_interval: Option<u32>,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct LiveDataState {
    pub connections: Vec<LiveDataConnectionData>,
    #[serde(rename = "componentBindings")]
    pub component_bindings: Vec<LiveDataBinding>,
}

#[tauri::command]
pub async fn save_live_data_connections(app: AppHandle, connections_data: LiveDataState) -> Result<(), String> {
    use tauri::path::BaseDirectory;
    
    let app_data_dir = app.path().resolve("", BaseDirectory::AppData)
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let live_data_dir = app_data_dir.join("live_data");
    
    // Create live_data directory if it doesn't exist
    if !live_data_dir.exists() {
        fs::create_dir_all(&live_data_dir)
            .map_err(|e| format!("Failed to create live_data directory: {}", e))?;
    }
    
    let file_path = live_data_dir.join("connections.json");
    let json_data = serde_json::to_string_pretty(&connections_data)
        .map_err(|e| format!("Failed to serialize live data connections: {}", e))?;
    
    fs::write(&file_path, json_data)
        .map_err(|e| format!("Failed to write live data connections file: {}", e))?;
    
    log::debug!("Live data connections saved to: {:?}", file_path);
    Ok(())
}

#[tauri::command]
pub async fn load_live_data_connections(app: AppHandle) -> Result<LiveDataState, String> {
    use tauri::path::BaseDirectory;
    
    let app_data_dir = app.path().resolve("", BaseDirectory::AppData)
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let file_path = app_data_dir.join("live_data").join("connections.json");
    
    if !file_path.exists() {
        // Return empty state if file doesn't exist
        return Ok(LiveDataState {
            connections: vec![],
            component_bindings: vec![],
        });
    }
    
    let json_data = fs::read_to_string(&file_path)
        .map_err(|e| format!("Failed to read live data connections file: {}", e))?;
    
    let connections_data: LiveDataState = serde_json::from_str(&json_data)
        .map_err(|e| format!("Failed to parse live data connections: {}", e))?;
    
    log::debug!("Live data connections loaded from: {:?}", file_path);
    Ok(connections_data)
}

#[tauri::command]
pub async fn delete_live_data_connections(app: AppHandle) -> Result<(), String> {
    use tauri::path::BaseDirectory;
    
    let app_data_dir = app.path().resolve("", BaseDirectory::AppData)
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    let file_path = app_data_dir.join("live_data").join("connections.json");
    
    if file_path.exists() {
        fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete live data connections file: {}", e))?;
        log::debug!("Live data connections file deleted");
    }
    
    Ok(())
} 