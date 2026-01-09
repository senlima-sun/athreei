//! Sync-related Tauri commands
//!
//! Provides IPC commands for cloud sync operations.

use crate::sync::{ConflictResolution, SyncConfig, SyncConflict, SyncManagerState, SyncState};
use serde::{Deserialize, Serialize};
use tauri::State;

/// Input for enabling sync
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnableSyncInput {
    /// Authentication token
    pub auth_token: String,
    /// Optional custom server URL
    pub server_url: Option<String>,
}

/// Get current sync status
#[tauri::command]
pub async fn sync_status(
    sync_manager: State<'_, SyncManagerState>,
) -> Result<SyncState, String> {
    Ok(sync_manager.get_state().await)
}

/// Enable sync with authentication
#[tauri::command]
pub async fn sync_enable(
    input: EnableSyncInput,
    sync_manager: State<'_, SyncManagerState>,
) -> Result<(), String> {
    // Update config if custom server URL provided
    if let Some(server_url) = input.server_url {
        let mut config = sync_manager.get_config().await;
        config.server_url = server_url;
        sync_manager.set_config(config).await;
    }

    sync_manager.enable(input.auth_token).await
}

/// Disable sync
#[tauri::command]
pub async fn sync_disable(sync_manager: State<'_, SyncManagerState>) -> Result<(), String> {
    sync_manager.disable().await;
    Ok(())
}

/// Trigger manual sync
#[tauri::command]
pub async fn sync_now(sync_manager: State<'_, SyncManagerState>) -> Result<SyncResult, String> {
    let state = sync_manager.get_state().await;

    if !state.enabled {
        return Err("Sync is not enabled".to_string());
    }

    // For now, return a placeholder result
    // In a full implementation, this would call push_changes and pull_changes
    let pending = sync_manager.pending_count().await?;

    Ok(SyncResult {
        pushed: pending,
        pulled: 0,
        conflicts: 0,
    })
}

/// Result of a sync operation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResult {
    /// Number of changes pushed
    pub pushed: usize,
    /// Number of changes pulled
    pub pulled: usize,
    /// Number of conflicts detected
    pub conflicts: usize,
}

/// Get all unresolved conflicts
#[tauri::command]
pub async fn sync_get_conflicts(
    sync_manager: State<'_, SyncManagerState>,
) -> Result<Vec<SyncConflict>, String> {
    sync_manager.get_conflicts().await
}

/// Resolve a sync conflict
#[tauri::command]
pub async fn sync_resolve_conflict(
    conflict_id: String,
    resolution: ConflictResolution,
    sync_manager: State<'_, SyncManagerState>,
) -> Result<(), String> {
    sync_manager.resolve_conflict(&conflict_id, resolution).await?;
    Ok(())
}

/// Get sync configuration
#[tauri::command]
pub async fn sync_get_config(
    sync_manager: State<'_, SyncManagerState>,
) -> Result<SyncConfig, String> {
    Ok(sync_manager.get_config().await)
}

/// Update sync configuration
#[tauri::command]
pub async fn sync_set_config(
    config: SyncConfig,
    sync_manager: State<'_, SyncManagerState>,
) -> Result<(), String> {
    sync_manager.set_config(config).await;
    Ok(())
}

/// Get pending change count
#[tauri::command]
pub async fn sync_pending_count(
    sync_manager: State<'_, SyncManagerState>,
) -> Result<usize, String> {
    sync_manager.pending_count().await
}
