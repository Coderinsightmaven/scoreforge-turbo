// src-tauri/src/state_sync.rs
use crate::state::*;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, Emitter, State};

// ==================== SYNC EVENT TYPES ====================

#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum StateUpdateEvent {
    AppStateUpdate(AppState),
    CanvasStateUpdate(CanvasState),
    ImageStateUpdate(ImageState),
    VideoStateUpdate(VideoState),
    LiveDataStateUpdate(LiveDataState),
    ScoreboardStateUpdate(ScoreboardState),
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct StateSubscription {
    pub id: String,
    pub state_types: Vec<String>, // ["app", "canvas", "image", etc.]
    pub active: bool,
}

// ==================== STATE SYNC MANAGER ====================

pub struct StateSyncManager {
    subscriptions: Mutex<HashMap<String, StateSubscription>>,
    app_handle: AppHandle,
}

impl StateSyncManager {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            subscriptions: Mutex::new(HashMap::new()),
            app_handle,
        }
    }

    pub fn subscribe(&self, subscription: StateSubscription) -> Result<String, String> {
        let mut subscriptions = self.subscriptions.lock()
            .map_err(|e| format!("Failed to lock subscriptions: {}", e))?;

        let id = subscription.id.clone();
        subscriptions.insert(id.clone(), subscription);
        Ok(id)
    }

    pub fn unsubscribe(&self, subscription_id: &str) -> Result<(), String> {
        let mut subscriptions = self.subscriptions.lock()
            .map_err(|e| format!("Failed to lock subscriptions: {}", e))?;

        subscriptions.remove(subscription_id);
        Ok(())
    }

    pub fn get_subscription(&self, subscription_id: &str) -> Result<Option<StateSubscription>, String> {
        let subscriptions = self.subscriptions.lock()
            .map_err(|e| format!("Failed to lock subscriptions: {}", e))?;

        Ok(subscriptions.get(subscription_id).cloned())
    }

    pub fn emit_state_update(&self, event: StateUpdateEvent) -> Result<(), String> {
        let event_name = match &event {
            StateUpdateEvent::AppStateUpdate(_) => "app_state_update",
            StateUpdateEvent::CanvasStateUpdate(_) => "canvas_state_update",
            StateUpdateEvent::ImageStateUpdate(_) => "image_state_update",
            StateUpdateEvent::VideoStateUpdate(_) => "video_state_update",
            StateUpdateEvent::LiveDataStateUpdate(_) => "live_data_state_update",
            StateUpdateEvent::ScoreboardStateUpdate(_) => "scoreboard_state_update",
        };

        let state_type = match &event {
            StateUpdateEvent::AppStateUpdate(_) => "app",
            StateUpdateEvent::CanvasStateUpdate(_) => "canvas",
            StateUpdateEvent::ImageStateUpdate(_) => "image",
            StateUpdateEvent::VideoStateUpdate(_) => "video",
            StateUpdateEvent::LiveDataStateUpdate(_) => "live_data",
            StateUpdateEvent::ScoreboardStateUpdate(_) => "scoreboard",
        };

        let subscriptions = self.subscriptions.lock()
            .map_err(|e| format!("Failed to lock subscriptions: {}", e))?;

        // Send to all subscribers interested in this state type
        for (subscription_id, subscription) in subscriptions.iter() {
            if subscription.active && subscription.state_types.contains(&state_type.to_string()) {
                // For now, emit globally and let frontend filter by subscription
                // TODO: Implement proper targeted emission when available
                if let Err(e) = self.app_handle.emit(
                    &format!("{}_{}", event_name, subscription_id),
                    &event
                ) {
                    log::error!("Failed to emit {} to {}: {}", event_name, subscription_id, e);
                }
            }
        }

        // Also emit globally for components that don't need subscription management
        if let Err(e) = self.app_handle.emit(event_name, &event) {
            log::error!("Failed to emit global {}: {}", event_name, e);
        }

        Ok(())
    }

    pub fn notify_app_state_change(&self, state: &AppState) -> Result<(), String> {
        self.emit_state_update(StateUpdateEvent::AppStateUpdate(state.clone()))
    }

    pub fn notify_canvas_state_change(&self, state: &CanvasState) -> Result<(), String> {
        self.emit_state_update(StateUpdateEvent::CanvasStateUpdate(state.clone()))
    }

    pub fn notify_image_state_change(&self, state: &ImageState) -> Result<(), String> {
        self.emit_state_update(StateUpdateEvent::ImageStateUpdate(state.clone()))
    }

    pub fn notify_video_state_change(&self, state: &VideoState) -> Result<(), String> {
        self.emit_state_update(StateUpdateEvent::VideoStateUpdate(state.clone()))
    }

    pub fn notify_live_data_state_change(&self, state: &LiveDataState) -> Result<(), String> {
        self.emit_state_update(StateUpdateEvent::LiveDataStateUpdate(state.clone()))
    }

    pub fn notify_scoreboard_state_change(&self, state: &ScoreboardState) -> Result<(), String> {
        self.emit_state_update(StateUpdateEvent::ScoreboardStateUpdate(state.clone()))
    }
}

// ==================== MANAGED STATE SYNC ====================

pub struct ManagedStateSync(pub Mutex<StateSyncManager>);

// ==================== SYNC COMMANDS ====================

#[tauri::command]
pub async fn subscribe_to_state_updates(
    subscription: StateSubscription,
    state_sync: State<'_, ManagedStateSync>
) -> Result<String, String> {
    let sync_manager = state_sync.0.lock()
        .map_err(|e| format!("Failed to lock state sync: {}", e))?;
    sync_manager.subscribe(subscription)
}

#[tauri::command]
pub async fn unsubscribe_from_state_updates(
    subscription_id: String,
    state_sync: State<'_, ManagedStateSync>
) -> Result<(), String> {
    let sync_manager = state_sync.0.lock()
        .map_err(|e| format!("Failed to lock state sync: {}", e))?;
    sync_manager.unsubscribe(&subscription_id)
}

#[tauri::command]
pub async fn get_state_subscription(
    subscription_id: String,
    state_sync: State<'_, ManagedStateSync>
) -> Result<Option<StateSubscription>, String> {
    let sync_manager = state_sync.0.lock()
        .map_err(|e| format!("Failed to lock state sync: {}", e))?;
    sync_manager.get_subscription(&subscription_id)
}

// ==================== STATE CHANGE NOTIFIERS ====================

pub fn setup_state_change_notifications(app: &AppHandle) -> Result<(), String> {
    // This function sets up listeners that will notify subscribers when state changes
    // In a real implementation, you'd modify the state command functions to call these
    // after successful state mutations

    // For example, you could modify the state_commands.rs functions to emit notifications
    // after successful operations, or set up reactive subscriptions

    Ok(())
}

// ==================== AUTO-NOTIFICATION HELPERS ====================

pub fn notify_all_state_changes(
    app: &AppHandle,
    app_state: &AppState,
    canvas_state: &CanvasState,
    image_state: &ImageState,
    video_state: &VideoState,
    live_data_state: &LiveDataState,
    scoreboard_state: &ScoreboardState,
) -> Result<(), String> {
    if let Some(sync) = app.try_state::<ManagedStateSync>() {
        let sync_manager = sync.0.lock()
            .map_err(|e| format!("Failed to lock state sync: {}", e))?;

        sync_manager.notify_app_state_change(app_state)?;
        sync_manager.notify_canvas_state_change(canvas_state)?;
        sync_manager.notify_image_state_change(image_state)?;
        sync_manager.notify_video_state_change(video_state)?;
        sync_manager.notify_live_data_state_change(live_data_state)?;
        sync_manager.notify_scoreboard_state_change(scoreboard_state)?;
    }

    Ok(())
}
