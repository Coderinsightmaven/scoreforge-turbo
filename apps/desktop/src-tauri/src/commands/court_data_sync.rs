// src-tauri/src/commands/court_data_sync.rs
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tokio::time::interval;
use chrono::{DateTime, Utc, Duration as ChronoDuration};
use thiserror::Error;
use lazy_static::lazy_static;

#[derive(Error, Debug)]
pub enum CourtSyncError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("JSON serialization error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Sync already running")]
    AlreadyRunning,

    #[error("Sync not running")]
    NotRunning,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CourtDataEntry {
    pub data: serde_json::Value,
    pub last_updated: DateTime<Utc>,
    pub last_accessed: DateTime<Utc>,
}

#[derive(Debug)]
pub struct CourtDataManager {
    data: HashMap<String, CourtDataEntry>,
    storage_path: PathBuf,
    has_changes: bool,
}

impl CourtDataManager {
    pub fn new(storage_path: PathBuf) -> Self {
        Self {
            data: HashMap::new(),
            storage_path,
            has_changes: false,
        }
    }

    pub async fn store_court_data(&mut self, court_data: HashMap<String, serde_json::Value>) -> Result<(), CourtSyncError> {
        let now = Utc::now();

        for (court_name, data) in court_data {
            // Update last_accessed when storing new data
            self.data.insert(court_name, CourtDataEntry {
                data,
                last_updated: now,
                last_accessed: now,
            });
        }

        self.has_changes = true;
        self.persist_to_file().await?;
        Ok(())
    }

    pub async fn cleanup_expired_data(&mut self) -> Result<(), CourtSyncError> {
        let now = Utc::now();
        let max_age = Duration::from_secs(300); // 5 minutes

        let expired_courts: Vec<String> = self.data
            .iter()
            .filter(|(_, entry)| {
                now.signed_duration_since(entry.last_accessed) > ChronoDuration::from_std(max_age).unwrap_or(ChronoDuration::seconds(300))
            })
            .map(|(name, _)| name.clone())
            .collect();

        if !expired_courts.is_empty() {
            log::debug!("Cleaning up {} expired court data entries (older than 5 minutes)", expired_courts.len());
            for court in expired_courts {
                self.data.remove(&court);
                self.has_changes = true;
            }
            self.persist_to_file().await?;
        }

        Ok(())
    }

    pub async fn persist_to_file(&self) -> Result<(), CourtSyncError> {
        if !self.has_changes {
            return Ok(());
        }

        let json_data = serde_json::to_string_pretty(&self.data)?;
        tokio::fs::write(&self.storage_path, json_data).await?;
        Ok(())
    }

    pub fn get_court_names(&self) -> Vec<String> {
        self.data.keys().cloned().collect()
    }

    pub fn remove_court_data(&mut self, court_name: &str) -> bool {
        if self.data.remove(court_name).is_some() {
            self.has_changes = true;
            true
        } else {
            false
        }
    }

}

// Global state for the sync service
lazy_static! {
    static ref COURT_DATA_SYNC: Arc<Mutex<CourtDataSync>> = Arc::new(Mutex::new(
        match CourtDataSync::new() {
            Ok(sync) => sync,
            Err(e) => {
                log::error!("Failed to create CourtDataSync: {:?}", e);
                std::process::exit(1);
            }
        }
    ));
}

#[tauri::command]
pub async fn start_court_data_sync(interval_ms: u64) -> Result<String, String> {
    let sync = COURT_DATA_SYNC.lock().await;
    sync.start_sync(interval_ms).await
        .map_err(|e| format!("Failed to start sync: {:?}", e))?;
    Ok("Court data sync started".to_string())
}

#[tauri::command]
pub async fn stop_court_data_sync() -> Result<String, String> {
    let sync = COURT_DATA_SYNC.lock().await;
    sync.stop_sync().await
        .map_err(|e| format!("Failed to stop sync: {:?}", e))?;
    Ok("Court data sync stopped".to_string())
}

#[tauri::command]
pub async fn trigger_manual_sync() -> Result<String, String> {
    let sync = COURT_DATA_SYNC.lock().await;
    sync.manual_sync().await
        .map_err(|e| format!("Manual sync failed: {:?}", e))?;
    Ok("Manual sync completed".to_string())
}

#[tauri::command]
pub async fn get_court_sync_status() -> Result<CourtSyncStatus, String> {
    let sync = COURT_DATA_SYNC.lock().await;
    Ok(sync.get_status().await)
}

#[tauri::command]
pub async fn is_court_sync_running() -> Result<bool, String> {
    let sync = COURT_DATA_SYNC.lock().await;
    Ok(sync.is_running().await)
}


#[derive(Debug)]
pub struct CourtSyncState {
    pub is_running: bool,
    pub interval_ms: u64,
    pub last_sync: Option<DateTime<Utc>>,
    pub active_courts: Vec<String>,
    pub sync_task: Option<JoinHandle<()>>,
    pub error_count: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CourtSyncStatus {
    pub is_running: bool,
    pub interval_ms: u64,
    pub last_sync: Option<DateTime<Utc>>,
    pub active_courts: Vec<String>,
    pub stored_courts: Vec<String>,
    pub error_count: u64,
}

impl Default for CourtSyncState {
    fn default() -> Self {
        Self {
            is_running: false,
            interval_ms: 2000,
            last_sync: None,
            active_courts: Vec::new(),
            sync_task: None,
            error_count: 0,
        }
    }
}

pub struct CourtDataSync {
    state: Arc<Mutex<CourtSyncState>>,
    data_manager: Arc<Mutex<CourtDataManager>>,
}

impl CourtDataSync {
    pub fn new() -> Result<Self, CourtSyncError> {
        let storage_path = Self::get_storage_path()?;
        let data_manager = CourtDataManager::new(storage_path);

        Ok(Self {
            state: Arc::new(Mutex::new(CourtSyncState::default())),
            data_manager: Arc::new(Mutex::new(data_manager)),
        })
    }

    fn get_storage_path() -> Result<PathBuf, CourtSyncError> {
        let mut path = std::env::current_dir()?;
        path.push("court_data.json");
        Ok(path)
    }

    pub async fn start_sync(&self, interval_ms: u64) -> Result<(), CourtSyncError> {
        let mut state = self.state.lock().await;

        if state.is_running {
            return Err(CourtSyncError::AlreadyRunning);
        }

        state.is_running = true;
        state.interval_ms = interval_ms;

        let state_clone = Arc::clone(&self.state);
        let data_manager_clone = Arc::clone(&self.data_manager);

        let handle = tokio::spawn(async move {
            let mut interval_timer = interval(Duration::from_millis(interval_ms));
            interval_timer.tick().await; // First tick is immediate

            loop {
                interval_timer.tick().await;

                let state = state_clone.lock().await;
                if !state.is_running {
                    break;
                }

                drop(state); // Release lock before sync

                if let Err(e) = Self::perform_sync(&state_clone, &data_manager_clone).await {
                    log::error!("Sync error: {:?}", e);
                    let mut state = state_clone.lock().await;
                    state.error_count += 1;
                }
            }
        });

        state.sync_task = Some(handle);
        log::info!("Started court data sync service (interval: {}ms)", interval_ms);
        Ok(())
    }

    pub async fn stop_sync(&self) -> Result<(), CourtSyncError> {
        let mut state = self.state.lock().await;

        if !state.is_running {
            return Err(CourtSyncError::NotRunning);
        }

        state.is_running = false;

        if let Some(handle) = state.sync_task.take() {
            handle.abort();
        }

        log::info!("Stopped court data sync service");
        Ok(())
    }

    pub async fn manual_sync(&self) -> Result<(), CourtSyncError> {
        let state = Arc::clone(&self.state);
        let data_manager = Arc::clone(&self.data_manager);
        Self::perform_sync(&state, &data_manager).await
    }

    async fn perform_sync(
        state: &Arc<Mutex<CourtSyncState>>,
        data_manager: &Arc<Mutex<CourtDataManager>>,
    ) -> Result<(), CourtSyncError> {
        // Get active displayed courts (this would be implemented to call the frontend)
        let active_courts = Self::get_active_displayed_courts().await?;

        // Fetch court data using existing live_data command
        let court_data = Self::fetch_court_data(active_courts.clone()).await?;

        if !court_data.is_empty() {
            // Store the data
            let mut manager = data_manager.lock().await;
            manager.store_court_data(court_data).await?;
            log::debug!("Synced active court data: {:?}", active_courts);

            // Update last sync time
            let mut state = state.lock().await;
            state.last_sync = Some(Utc::now());
            state.active_courts = active_courts.clone();

            // Cleanup undisplayed courts
            Self::cleanup_undisplayed_courts(&mut manager, active_courts).await?;

            // Cleanup expired data (older than 5 minutes)
            manager.cleanup_expired_data().await?;
        } else {
            log::debug!("No active court data to sync");
        }

        Ok(())
    }

    async fn get_active_displayed_courts() -> Result<Vec<String>, CourtSyncError> {
        // This should be called via Tauri invoke from the frontend
        // For now, return empty vec which will fall back to all courts
        // FIXME: Implement frontend integration to get actual active courts
        Ok(Vec::new())
    }

    async fn fetch_court_data(_active_courts: Vec<String>) -> Result<HashMap<String, serde_json::Value>, CourtSyncError> {
        // Court data sync is no longer used - ScoreForge uses HTTP polling from frontend
        // This function is kept for backward compatibility but returns empty data
        Ok(HashMap::new())
    }

    async fn cleanup_undisplayed_courts(
        manager: &mut CourtDataManager,
        active_courts: Vec<String>,
    ) -> Result<(), CourtSyncError> {
        let active_set: HashSet<String> = active_courts.into_iter().collect();
        let stored_courts = manager.get_court_names();

        let courts_to_remove: Vec<String> = stored_courts
            .into_iter()
            .filter(|court_name| !active_set.contains(court_name))
            .collect();

        if !courts_to_remove.is_empty() {
            log::debug!("Cleaning up data for {} undisplayed courts: {:?}", courts_to_remove.len(), courts_to_remove);
            for court_name in &courts_to_remove {
                manager.remove_court_data(court_name);
            }
            manager.persist_to_file().await?;
            log::debug!("Removed data for {} undisplayed courts", courts_to_remove.len());
        } else {
            log::debug!("No undisplayed courts to clean up");
        }

        Ok(())
    }

    pub async fn get_status(&self) -> CourtSyncStatus {
        let state = self.state.lock().await;
        let manager = self.data_manager.lock().await;

        CourtSyncStatus {
            is_running: state.is_running,
            interval_ms: state.interval_ms,
            last_sync: state.last_sync,
            active_courts: state.active_courts.clone(),
            stored_courts: manager.get_court_names(),
            error_count: state.error_count,
        }
    }

    pub async fn is_running(&self) -> bool {
        let state = self.state.lock().await;
        state.is_running
    }
}
