// src-tauri/src/commands/videos.rs
use std::path::PathBuf;
use std::fs;
use tauri::{AppHandle, Manager, command};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use base64::{Engine as _, engine::general_purpose};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct StoredVideo {
    pub id: String,
    pub name: String,
    pub original_name: String,
    pub path: String,
    pub size: u64,
    pub r#type: String,
    pub duration: Option<f64>, // in seconds
    pub uploaded_at: chrono::DateTime<chrono::Utc>,
    pub thumbnail: Option<String>,
}

fn get_videos_dir(app: &AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let app_data_dir = app.path().app_data_dir()?;
    let videos_dir = app_data_dir.join("videos");
    
    if !videos_dir.exists() {
        fs::create_dir_all(&videos_dir)?;
    }
    
    Ok(videos_dir)
}

fn get_metadata_file(app: &AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let videos_dir = get_videos_dir(app)?;
    Ok(videos_dir.join("metadata.json"))
}

fn load_video_metadata(app: &AppHandle) -> Result<Vec<StoredVideo>, Box<dyn std::error::Error>> {
    let metadata_file = get_metadata_file(app)?;
    
    if !metadata_file.exists() {
        return Ok(Vec::new());
    }
    
    let content = fs::read_to_string(metadata_file)?;
    let videos: Vec<StoredVideo> = serde_json::from_str(&content)?;
    Ok(videos)
}

fn save_video_metadata(app: &AppHandle, videos: &[StoredVideo]) -> Result<(), Box<dyn std::error::Error>> {
    let metadata_file = get_metadata_file(app)?;
    let content = serde_json::to_string_pretty(videos)?;
    fs::write(metadata_file, content)?;
    Ok(())
}

fn create_video_thumbnail(video_data: &[u8], _video_type: &str) -> Option<String> {
    // For now, just return the first 1000 characters of base64 as a simple thumbnail
    // In a real implementation, you'd want to use a video processing library
    // to extract actual video frames and create thumbnails
    if video_data.len() > 1000 {
        let thumbnail_data = &video_data[..1000];
        Some(general_purpose::STANDARD.encode(thumbnail_data))
    } else {
        Some(general_purpose::STANDARD.encode(video_data))
    }
}

#[command]
pub async fn upload_video(
    app: AppHandle,
    file_name: String,
    file_data: String,
    file_type: String,
    file_size: u64,
) -> Result<StoredVideo, String> {
    // Decode base64 data
    let video_data = general_purpose::STANDARD
        .decode(&file_data)
        .map_err(|e| format!("Failed to decode video data: {}", e))?;
    
    // Generate unique ID and filename
    let id = Uuid::new_v4().to_string();
    let file_extension = file_name.split('.').last().unwrap_or("mp4");
    let stored_filename = format!("{}.{}", id, file_extension);
    
    // Get videos directory
    let videos_dir = get_videos_dir(&app)
        .map_err(|e| format!("Failed to get videos directory: {}", e))?;
    
    // Save video file
    let file_path = videos_dir.join(&stored_filename);
    fs::write(&file_path, &video_data)
        .map_err(|e| format!("Failed to save video file: {}", e))?;
    
    // Create thumbnail
    let thumbnail = create_video_thumbnail(&video_data, &file_type);
    
    // Create metadata entry
    let stored_video = StoredVideo {
        id: id.clone(),
        name: stored_filename.clone(),
        original_name: file_name,
        path: file_path.to_string_lossy().to_string(),
        size: file_size,
        r#type: file_type,
        duration: None, // TODO: Extract actual duration if needed
        uploaded_at: chrono::Utc::now(),
        thumbnail,
    };
    
    // Load existing metadata
    let mut videos = load_video_metadata(&app)
        .map_err(|e| format!("Failed to load metadata: {}", e))?;
    
    // Add new video
    videos.push(stored_video.clone());
    
    // Save updated metadata
    save_video_metadata(&app, &videos)
        .map_err(|e| format!("Failed to save metadata: {}", e))?;
    
    Ok(stored_video)
}

#[command]
pub async fn get_stored_videos(app: AppHandle) -> Result<Vec<StoredVideo>, String> {
    load_video_metadata(&app)
        .map_err(|e| format!("Failed to load videos: {}", e))
}

#[command]
pub async fn delete_video(app: AppHandle, video_id: String) -> Result<(), String> {
    // Load existing metadata
    let mut videos = load_video_metadata(&app)
        .map_err(|e| format!("Failed to load metadata: {}", e))?;
    
    // Find the video to delete
    let video_index = videos.iter()
        .position(|video| video.id == video_id)
        .ok_or("Video not found")?;
    
    let video = &videos[video_index];
    
    // Delete the actual file
    if let Err(e) = fs::remove_file(&video.path) {
        log::error!("Failed to delete video file {}: {}", video.path, e);
    }
    
    // Remove from metadata
    videos.remove(video_index);
    
    // Save updated metadata
    save_video_metadata(&app, &videos)
        .map_err(|e| format!("Failed to save metadata: {}", e))?;
    
    Ok(())
}

#[command]
pub async fn get_video_data(app: AppHandle, video_id: String) -> Result<String, String> {
    // Load metadata to find the video
    let videos = load_video_metadata(&app)
        .map_err(|e| format!("Failed to load metadata: {}", e))?;
    
    let video = videos.iter()
        .find(|video| video.id == video_id)
        .ok_or("Video not found")?;
    
    // Read the video file
    let video_data = fs::read(&video.path)
        .map_err(|e| format!("Failed to read video file: {}", e))?;
    
    // Encode as base64
    let base64_data = general_purpose::STANDARD.encode(&video_data);
    Ok(format!("data:{};base64,{}", video.r#type, base64_data))
}