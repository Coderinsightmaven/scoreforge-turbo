// src-tauri/src/commands/images.rs
use std::path::PathBuf;
use std::fs;
use tauri::{AppHandle, Manager, command};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use base64::{Engine as _, engine::general_purpose};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StoredImage {
    pub id: String,
    pub name: String,
    pub original_name: String,
    pub path: String,
    pub size: u64,
    pub r#type: String,
    pub uploaded_at: chrono::DateTime<chrono::Utc>,
    pub thumbnail: Option<String>,
}

fn get_images_dir(app: &AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let app_data_dir = app.path().app_data_dir()?;
    let images_dir = app_data_dir.join("images");
    
    if !images_dir.exists() {
        fs::create_dir_all(&images_dir)?;
    }
    
    Ok(images_dir)
}

fn get_metadata_file(app: &AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let images_dir = get_images_dir(app)?;
    Ok(images_dir.join("metadata.json"))
}

fn load_image_metadata(app: &AppHandle) -> Result<Vec<StoredImage>, Box<dyn std::error::Error>> {
    let metadata_file = get_metadata_file(app)?;
    
    if !metadata_file.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(metadata_file)?;
    let images: Vec<StoredImage> = serde_json::from_str(&content)?;
    Ok(images)
}

fn save_image_metadata(app: &AppHandle, images: &[StoredImage]) -> Result<(), Box<dyn std::error::Error>> {
    let metadata_file = get_metadata_file(app)?;
    let content = serde_json::to_string_pretty(images)?;
    fs::write(metadata_file, content)?;
    Ok(())
}

fn create_thumbnail(image_data: &[u8], _image_type: &str) -> Option<String> {
    // For now, just return the first 1000 characters of base64 as a simple thumbnail
    // In a real implementation, you'd want to use an image processing library
    // to create actual thumbnails
    if image_data.len() > 1000 {
        let thumbnail_data = &image_data[..1000];
        Some(general_purpose::STANDARD.encode(thumbnail_data))
    } else {
        Some(general_purpose::STANDARD.encode(image_data))
    }
}

#[command]
pub async fn upload_image(
    app: AppHandle,
    file_name: String,
    file_data: String,
    file_type: String,
    file_size: u64,
) -> Result<StoredImage, String> {
    // Decode base64 data
    let image_data = general_purpose::STANDARD
        .decode(&file_data)
        .map_err(|e| format!("Failed to decode image data: {}", e))?;
    
    // Generate unique ID and filename
    let id = Uuid::new_v4().to_string();
    let file_extension = file_name.split('.').last().unwrap_or("png");
    let stored_filename = format!("{}.{}", id, file_extension);
    
    // Get images directory
    let images_dir = get_images_dir(&app)
        .map_err(|e| format!("Failed to get images directory: {}", e))?;
    
    // Save image file
    let file_path = images_dir.join(&stored_filename);
    fs::write(&file_path, &image_data)
        .map_err(|e| format!("Failed to save image file: {}", e))?;
    
    // Create thumbnail
    let thumbnail = create_thumbnail(&image_data, &file_type);
    
    // Create metadata entry
    let stored_image = StoredImage {
        id: id.clone(),
        name: stored_filename.clone(),
        original_name: file_name,
        path: file_path.to_string_lossy().to_string(),
        size: file_size,
        r#type: file_type,
        uploaded_at: chrono::Utc::now(),
        thumbnail,
    };
    
    // Load existing metadata
    let mut images = load_image_metadata(&app)
        .map_err(|e| format!("Failed to load metadata: {}", e))?;
    
    // Add new image
    images.push(stored_image.clone());
    
    // Save updated metadata
    save_image_metadata(&app, &images)
        .map_err(|e| format!("Failed to save metadata: {}", e))?;
    
    Ok(stored_image)
}

#[command]
pub async fn get_stored_images(app: AppHandle) -> Result<Vec<StoredImage>, String> {
    load_image_metadata(&app)
        .map_err(|e| format!("Failed to load images: {}", e))
}

#[command]
pub async fn delete_image(app: AppHandle, image_id: String) -> Result<(), String> {
    // Load existing metadata
    let mut images = load_image_metadata(&app)
        .map_err(|e| format!("Failed to load metadata: {}", e))?;
    
    // Find the image to delete
    let image_index = images.iter()
        .position(|img| img.id == image_id)
        .ok_or("Image not found")?;
    
    let image = &images[image_index];
    
    // Delete the actual file
    if let Err(e) = fs::remove_file(&image.path) {
        log::error!("Failed to delete image file {}: {}", image.path, e);
    }
    
    // Remove from metadata
    images.remove(image_index);
    
    // Save updated metadata
    save_image_metadata(&app, &images)
        .map_err(|e| format!("Failed to save metadata: {}", e))?;
    
    Ok(())
}

#[command]
pub async fn get_image_data(app: AppHandle, image_id: String) -> Result<String, String> {
    // Load metadata to find the image
    let images = load_image_metadata(&app)
        .map_err(|e| format!("Failed to load metadata: {}", e))?;
    
    let image = images.iter()
        .find(|img| img.id == image_id)
        .ok_or("Image not found")?;
    
    // Read the image file
    let image_data = fs::read(&image.path)
        .map_err(|e| format!("Failed to read image file: {}", e))?;
    
    // Encode as base64
    let base64_data = general_purpose::STANDARD.encode(&image_data);
    Ok(format!("data:{};base64,{}", image.r#type, base64_data))
} 