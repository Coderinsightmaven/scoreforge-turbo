// src-tauri/src/commands/storage_commands.rs
use crate::state::*;
use crate::storage::StateStorage;
use tauri::{command, AppHandle, State, Emitter};

// Managed state for the storage layer
pub struct ManagedStateStorage(pub StateStorage);

// ==================== STORAGE COMMANDS ====================

#[command]
pub async fn save_app_state(
    state: State<'_, ManagedAppState>,
    storage: State<'_, ManagedStateStorage>
) -> Result<(), String> {
    let app_state = state.0.lock()
        .map_err(|e| format!("Failed to lock app state: {}", e))?;
    storage.0.save_app_state(&*app_state)?;
    Ok(())
}

#[command]
pub async fn load_app_state(
    state: State<'_, ManagedAppState>,
    storage: State<'_, ManagedStateStorage>
) -> Result<AppState, String> {
    let loaded_state = storage.0.load_app_state()?;
    let mut current_state = state.0.lock()
        .map_err(|e| format!("Failed to lock app state: {}", e))?;
    *current_state = loaded_state.clone();
    Ok(loaded_state)
}

#[command]
pub async fn save_canvas_state(
    state: State<'_, ManagedCanvasState>,
    storage: State<'_, ManagedStateStorage>
) -> Result<(), String> {
    let canvas_state = state.0.lock()
        .map_err(|e| format!("Failed to lock canvas state: {}", e))?;
    storage.0.save_canvas_state(&*canvas_state)?;
    Ok(())
}

#[command]
pub async fn load_canvas_state(
    state: State<'_, ManagedCanvasState>,
    storage: State<'_, ManagedStateStorage>
) -> Result<CanvasState, String> {
    let loaded_state = storage.0.load_canvas_state()?;
    let mut current_state = state.0.lock()
        .map_err(|e| format!("Failed to lock canvas state: {}", e))?;
    *current_state = loaded_state.clone();
    Ok(loaded_state)
}

#[command]
pub async fn save_image_state(
    state: State<'_, ManagedImageState>,
    storage: State<'_, ManagedStateStorage>
) -> Result<(), String> {
    let image_state = state.0.lock()
        .map_err(|e| format!("Failed to lock image state: {}", e))?;
    storage.0.save_image_state(&*image_state)?;
    Ok(())
}

#[command]
pub async fn load_image_state(
    state: State<'_, ManagedImageState>,
    storage: State<'_, ManagedStateStorage>
) -> Result<ImageState, String> {
    let loaded_state = storage.0.load_image_state()?;
    let mut current_state = state.0.lock()
        .map_err(|e| format!("Failed to lock image state: {}", e))?;
    *current_state = loaded_state.clone();
    Ok(loaded_state)
}

#[command]
pub async fn save_video_state(
    state: State<'_, ManagedVideoState>,
    storage: State<'_, ManagedStateStorage>
) -> Result<(), String> {
    let video_state = state.0.lock()
        .map_err(|e| format!("Failed to lock video state: {}", e))?;
    storage.0.save_video_state(&*video_state)?;
    Ok(())
}

#[command]
pub async fn load_video_state(
    state: State<'_, ManagedVideoState>,
    storage: State<'_, ManagedStateStorage>
) -> Result<VideoState, String> {
    let loaded_state = storage.0.load_video_state()?;
    let mut current_state = state.0.lock()
        .map_err(|e| format!("Failed to lock video state: {}", e))?;
    *current_state = loaded_state.clone();
    Ok(loaded_state)
}

#[command]
pub async fn save_live_data_state(
    state: State<'_, ManagedLiveDataState>,
    storage: State<'_, ManagedStateStorage>
) -> Result<(), String> {
    let live_data_state = state.0.lock()
        .map_err(|e| format!("Failed to lock live data state: {}", e))?;
    storage.0.save_live_data_state(&*live_data_state)?;
    Ok(())
}

#[command]
pub async fn load_live_data_state(
    state: State<'_, ManagedLiveDataState>,
    storage: State<'_, ManagedStateStorage>
) -> Result<LiveDataState, String> {
    let loaded_state = storage.0.load_live_data_state()?;
    let mut current_state = state.0.lock()
        .map_err(|e| format!("Failed to lock live data state: {}", e))?;
    *current_state = loaded_state.clone();
    Ok(loaded_state)
}

#[command]
pub async fn save_scoreboard_state(
    state: State<'_, ManagedScoreboardState>,
    storage: State<'_, ManagedStateStorage>
) -> Result<(), String> {
    let scoreboard_state = state.0.lock()
        .map_err(|e| format!("Failed to lock scoreboard state: {}", e))?;
    storage.0.save_scoreboard_state(&*scoreboard_state)?;
    Ok(())
}

#[command]
pub async fn load_scoreboard_state(
    state: State<'_, ManagedScoreboardState>,
    storage: State<'_, ManagedStateStorage>
) -> Result<ScoreboardState, String> {
    let loaded_state = storage.0.load_scoreboard_state()?;
    let mut current_state = state.0.lock()
        .map_err(|e| format!("Failed to lock scoreboard state: {}", e))?;
    *current_state = loaded_state.clone();
    Ok(loaded_state)
}

#[command]
pub async fn save_all_states(
    app_state: State<'_, ManagedAppState>,
    canvas_state: State<'_, ManagedCanvasState>,
    image_state: State<'_, ManagedImageState>,
    video_state: State<'_, ManagedVideoState>,
    live_data_state: State<'_, ManagedLiveDataState>,
    scoreboard_state: State<'_, ManagedScoreboardState>,
    storage: State<'_, ManagedStateStorage>
) -> Result<(), String> {
    let app = app_state.0.lock()
        .map_err(|e| format!("Failed to lock app state: {}", e))?;
    let canvas = canvas_state.0.lock()
        .map_err(|e| format!("Failed to lock canvas state: {}", e))?;
    let image = image_state.0.lock()
        .map_err(|e| format!("Failed to lock image state: {}", e))?;
    let video = video_state.0.lock()
        .map_err(|e| format!("Failed to lock video state: {}", e))?;
    let live_data = live_data_state.0.lock()
        .map_err(|e| format!("Failed to lock live data state: {}", e))?;
    let scoreboard = scoreboard_state.0.lock()
        .map_err(|e| format!("Failed to lock scoreboard state: {}", e))?;

    storage.0.save_all_states(&*app, &*canvas, &*image, &*video, &*live_data, &*scoreboard)?;
    Ok(())
}

#[command]
pub async fn load_all_states(
    app_state: State<'_, ManagedAppState>,
    canvas_state: State<'_, ManagedCanvasState>,
    image_state: State<'_, ManagedImageState>,
    video_state: State<'_, ManagedVideoState>,
    live_data_state: State<'_, ManagedLiveDataState>,
    scoreboard_state: State<'_, ManagedScoreboardState>,
    storage: State<'_, ManagedStateStorage>
) -> Result<(), String> {
    let (app, canvas, image, video, live_data, scoreboard) = storage.0.load_all_states()?;

    *app_state.0.lock()
        .map_err(|e| format!("Failed to lock app state: {}", e))? = app;
    *canvas_state.0.lock()
        .map_err(|e| format!("Failed to lock canvas state: {}", e))? = canvas;
    *image_state.0.lock()
        .map_err(|e| format!("Failed to lock image state: {}", e))? = image;
    *video_state.0.lock()
        .map_err(|e| format!("Failed to lock video state: {}", e))? = video;
    *live_data_state.0.lock()
        .map_err(|e| format!("Failed to lock live data state: {}", e))? = live_data;
    *scoreboard_state.0.lock()
        .map_err(|e| format!("Failed to lock scoreboard state: {}", e))? = scoreboard;

    Ok(())
}

#[command]
pub async fn create_state_backup(
    backup_name: String,
    storage: State<'_, ManagedStateStorage>
) -> Result<(), String> {
    storage.0.create_backup(&backup_name)?;
    Ok(())
}

#[command]
pub async fn restore_state_backup(
    backup_name: String,
    storage: State<'_, ManagedStateStorage>
) -> Result<(), String> {
    storage.0.restore_backup(&backup_name)?;
    Ok(())
}

#[command]
pub async fn list_state_backups(
    storage: State<'_, ManagedStateStorage>
) -> Result<Vec<String>, String> {
    storage.0.list_backups()
}

#[command]
pub async fn clear_old_state_backups(
    keep_last_n: usize,
    storage: State<'_, ManagedStateStorage>
) -> Result<(), String> {
    storage.0.clear_old_backups(keep_last_n)?;
    Ok(())
}

// ==================== AUTO-SAVE SETUP ====================

pub fn setup_auto_save(
    app_handle: &AppHandle,
    storage: &StateStorage,
    interval_seconds: u64,
) -> Result<(), String> {
    let app_handle = app_handle.clone();
    let storage = storage.clone();

    std::thread::spawn(move || {
        let rt = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,
            Err(e) => {
                log::error!("Failed to create tokio runtime for auto-save: {}", e);
                return;
            }
        };
        rt.block_on(async {
            let mut interval = tokio::time::interval(std::time::Duration::from_secs(interval_seconds));

            loop {
                interval.tick().await;

                // Get all current states and save them
                // Note: This is a simplified version. In production, you'd want to
                // emit events to the main thread to handle the state access safely
                let _ = app_handle.emit("request_state_save", ());

                // Small delay to allow the main thread to handle the event
                tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            }
        });
    });

    Ok(())
}
