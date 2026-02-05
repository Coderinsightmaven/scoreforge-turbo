// src-tauri/src/lib.rs
mod commands;

use commands::*;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .manage(ScoreboardState::default())
        .manage(monitor::ScoreboardInstanceStore::default())
        .invoke_handler(tauri::generate_handler![
            // Monitor commands
            get_available_monitors,
            create_scoreboard_window,
            close_scoreboard_window,
            close_all_scoreboard_windows,
            list_scoreboard_windows,
            get_scoreboard_instance_data,
            update_scoreboard_window_position,
            update_scoreboard_window_size,
            toggle_scoreboard_fullscreen,
            set_scoreboard_fullscreen,
            // Storage commands
            save_scoreboard,
            load_scoreboard,
            list_scoreboards,
            delete_scoreboard,
            export_scoreboard,
            import_scoreboard,
            // Scoreboard commands
            update_game_state,
            get_game_state,
            update_score,
            update_time,
            update_period,
            toggle_game_active,
            reset_game,
            update_team_info,
            // Image commands
            upload_image,
            get_stored_images,
            delete_image,
            get_image_data,
            // Video commands
            upload_video,
            get_stored_videos,
            delete_video,
            get_video_data,
            // Live data commands
            fetch_live_data,
            test_api_connection,
            get_available_scoreboards,
            inspect_live_data,
            cleanup_live_data,
            check_websocket_status,
            test_websocket_connection,
            connect_websocket,
            disconnect_websocket,
            send_websocket_message,
            start_websocket_listener,
            stop_websocket_listener,
            // Live data storage commands
            save_live_data_connections,
            load_live_data_connections,
            delete_live_data_connections,
            // Export/Import commands
            export_scoreboard_as_zip,
            import_scoreboard_from_zip,
            // Court data sync commands
            start_court_data_sync,
            stop_court_data_sync,
            trigger_manual_sync,
            get_court_sync_status,
            is_court_sync_running,
            // Tennis processor commands
            process_tennis_data,
            process_tennis_data_batch,
            validate_tennis_data,
        ])
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                if let Some(window) = app.get_webview_window("main") {
                    window.open_devtools();
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
