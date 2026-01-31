// src-tauri/src/commands/monitor.rs
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, AppHandle, State};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MonitorInfo {
    pub id: u32,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub is_primary: bool,
    pub scale_factor: f64,
    pub work_area_width: u32,
    pub work_area_height: u32,
    pub work_area_x: i32,
    pub work_area_y: i32,
}

#[derive(Default)]
pub struct ScoreboardInstanceStore {
    pub instances: Arc<Mutex<HashMap<String, serde_json::Value>>>,
}

#[tauri::command]
pub async fn get_available_monitors(app: AppHandle) -> Result<Vec<MonitorInfo>, String> {
    let monitors = app.available_monitors()
        .map_err(|e| e.to_string())?;
    
    let monitor_info: Vec<MonitorInfo> = monitors
        .into_iter()
        .enumerate()
        .map(|(id, monitor)| {
            let position = monitor.position();
            let size = monitor.size();
            // On macOS, the primary monitor is usually at (0,0) or the first monitor
            // We'll consider the first monitor OR any monitor at (0,0) as primary
            let is_primary = id == 0 || (position.x == 0 && position.y == 0);
            
            // Calculate work area (excluding menu bar and dock)
            // On macOS, the menu bar is typically 24-28 pixels high (scaled)
            let menu_bar_height = if is_primary { (28.0 * monitor.scale_factor()) as u32 } else { 0 };
            let dock_height = if is_primary { (80.0 * monitor.scale_factor()) as u32 } else { 0 }; // Estimate for dock
            
            let work_area_width = size.width;
            let work_area_height = size.height.saturating_sub(menu_bar_height).saturating_sub(dock_height);
            let work_area_x = position.x;
            let work_area_y = position.y + menu_bar_height as i32;
            
            MonitorInfo {
                id: id as u32,
                name: monitor.name().map_or_else(|| format!("Display {}", id + 1), |n| n.clone()),
                width: size.width,
                height: size.height,
                x: position.x,
                y: position.y,
                is_primary,
                scale_factor: monitor.scale_factor(),
                work_area_width,
                work_area_height,
                work_area_x,
                work_area_y,
            }
        })
        .collect();
    
    Ok(monitor_info)
}

#[tauri::command]
pub async fn create_scoreboard_window(
    app: AppHandle,
    store: State<'_, ScoreboardInstanceStore>,
    window_id: String,
    monitor_id: u32,
    width: u32,
    height: u32,
    _x: i32,
    _y: i32,
    offset_x: i32,
    offset_y: i32,
    scoreboard_data: Option<serde_json::Value>,
) -> Result<(), String> {
    // Get fresh monitor info to determine if we should use fullscreen
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    let monitor_list: Vec<_> = monitors.into_iter().collect();
    
    // Debug logging
    println!("Creating scoreboard window:");
    println!("  Requested monitor_id: {}", monitor_id);
    println!("  Available monitors: {}", monitor_list.len());
    for (i, monitor) in monitor_list.iter().enumerate() {
        let monitor_name = monitor.name().map_or("Unknown".to_string(), |n| n.clone());
        println!("    Monitor {}: {} at ({}, {})", i, 
                monitor_name, 
                monitor.position().x, monitor.position().y);
    }
    
    let target_monitor = monitor_list.into_iter().nth(monitor_id as usize);
    
    // Store the scoreboard data for this window
    if let Some(data) = &scoreboard_data {
        println!("🎾 [RUST] Storing scoreboard data for window: {}", window_id);
        println!("🎾 [RUST] Data has scoreForgeConfig: {}", data.get("scoreForgeConfig").is_some());
        if let Some(config) = data.get("scoreForgeConfig") {
            println!("🎾 [RUST] ScoreForge config: {:?}", config);
        }
        let mut instances = store.instances.lock().map_err(|e| e.to_string())?;
        instances.insert(window_id.clone(), scoreboard_data.unwrap());
    } else {
        println!("🎾 [RUST] No scoreboard data provided for window: {}", window_id);
    }

    // Create window in windowed mode first, then position and set fullscreen
    let window = WebviewWindowBuilder::new(
        &app,
        window_id.clone(),
        WebviewUrl::App("scoreboard.html".into()),
    )
    .title("Scoreboard Display")
    .resizable(false)
    .decorations(false)
    .always_on_top(true)
    .visible(false)
    .skip_taskbar(true)
    .fullscreen(false)
    .inner_size(width as f64, height as f64)
    .build()
    .map_err(|e| e.to_string())?;

    // Position the window at the target monitor's origin
    let (final_x, final_y) = if let Some(ref monitor) = target_monitor {
        let monitor_x = monitor.position().x;
        let monitor_y = monitor.position().y;
        (monitor_x + offset_x, monitor_y + offset_y)
    } else {
        // Fallback to primary monitor (0, 0) with offsets
        (offset_x, offset_y)
    };

    println!("  Positioning window at: ({}, {})", final_x, final_y);
    window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
        x: final_x,
        y: final_y
    })).map_err(|e| e.to_string())?;

    std::thread::sleep(std::time::Duration::from_millis(100));

    // Show the window
    window.show().map_err(|e| e.to_string())?;

    std::thread::sleep(std::time::Duration::from_millis(200));

    // Set fullscreen
    println!("  Setting fullscreen...");
    window.set_fullscreen(true).map_err(|e| e.to_string())?;

    println!("  Scoreboard window created and shown in fullscreen at ({}, {})", final_x, final_y);

    Ok(())
}

#[tauri::command]
pub async fn close_scoreboard_window(app: AppHandle, window_id: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_id) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn close_all_scoreboard_windows(app: AppHandle) -> Result<(), String> {
    // Get all windows and close those that start with "scoreboard_"
    let windows = app.webview_windows();
    for (label, window) in windows {
        if label.starts_with("scoreboard_") {
            window.close().map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn update_scoreboard_window_position(
    app: AppHandle,
    window_id: String,
    x: i32,
    y: i32,
    offset_x: i32,
    offset_y: i32,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_id) {
        let final_x = x + offset_x;
        let final_y = y + offset_y;
        window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { 
            x: final_x, 
            y: final_y 
        }))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn update_scoreboard_window_size(
    app: AppHandle,
    window_id: String,
    width: u32,
    height: u32,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_id) {
        window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width, height }))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn toggle_scoreboard_fullscreen(app: AppHandle, window_id: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_id) {
        let is_fullscreen = window.is_fullscreen().map_err(|e| e.to_string())?;

        if is_fullscreen {
            // Get current window position before exiting fullscreen to determine which monitor it's on
            let current_pos = window.outer_position().map_err(|e| e.to_string())?;

            // Find which monitor the window is currently on
            let monitors: Vec<_> = app.available_monitors()
                .map_err(|e| e.to_string())?
                .into_iter()
                .collect();

            // Find the monitor that contains the current window position
            let target_monitor_pos = monitors.iter()
                .find(|m| {
                    let pos = m.position();
                    let size = m.size();
                    current_pos.x >= pos.x
                        && current_pos.x < pos.x + size.width as i32
                        && current_pos.y >= pos.y
                        && current_pos.y < pos.y + size.height as i32
                })
                .map(|m| {
                    let pos = m.position();
                    tauri::PhysicalPosition { x: pos.x, y: pos.y }
                })
                .unwrap_or_else(|| tauri::PhysicalPosition { x: 0, y: 0 });

            // Exiting fullscreen - reset position to monitor's origin
            window.set_fullscreen(false).map_err(|e| e.to_string())?;
            // Small delay to let fullscreen transition complete
            std::thread::sleep(std::time::Duration::from_millis(100));
            window.set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x: target_monitor_pos.x,
                y: target_monitor_pos.y
            })).map_err(|e| e.to_string())?;
        } else {
            // Entering fullscreen
            window.set_fullscreen(true).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn set_scoreboard_fullscreen(app: AppHandle, window_id: String, fullscreen: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_id) {
        window.set_fullscreen(fullscreen).map_err(|e| e.to_string())?;
    }
    Ok(())
} 

#[tauri::command]
pub async fn list_scoreboard_windows(app: AppHandle) -> Result<Vec<String>, String> {
    let windows = app.webview_windows();
    let scoreboard_windows: Vec<String> = windows
        .keys()
        .filter(|label| label.starts_with("scoreboard_"))
        .cloned()
        .collect();
    Ok(scoreboard_windows)
} 

#[tauri::command]
pub async fn get_scoreboard_instance_data(
    store: State<'_, ScoreboardInstanceStore>,
    window_id: String,
) -> Result<Option<serde_json::Value>, String> {
    println!("🎾 [RUST] get_scoreboard_instance_data for window: {}", window_id);
    let instances = store.instances.lock().map_err(|e| e.to_string())?;
    let data = instances.get(&window_id).cloned();
    if let Some(ref d) = data {
        println!("🎾 [RUST] Returning data with scoreForgeConfig: {}", d.get("scoreForgeConfig").is_some());
    } else {
        println!("🎾 [RUST] No data found for window: {}", window_id);
    }
    Ok(data)
}

 