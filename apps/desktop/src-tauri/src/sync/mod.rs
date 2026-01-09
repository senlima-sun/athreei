//! Cloud sync module for aiii Desktop
//!
//! Provides synchronization of memories and spaces to athreei cloud.
//!
//! # Architecture
//!
//! The sync system consists of:
//! - **ChangeTracker**: Records local changes that need to be synced
//! - **SyncClient**: HTTP client for communicating with the sync server
//! - **ConflictStore**: Manages conflicts between local and remote changes
//! - **Push/Pull**: Operations for syncing data to/from the cloud
//!
//! # Usage
//!
//! ```ignore
//! use crate::sync::{SyncManager, SyncConfig};
//!
//! // Create sync manager
//! let config = SyncConfig::default();
//! let manager = SyncManager::new(config, db_path);
//!
//! // Enable sync
//! manager.enable(auth_token).await?;
//!
//! // Trigger sync
//! manager.sync_now().await?;
//! ```

pub mod changes;
pub mod client;
pub mod conflicts;
pub mod pull;
pub mod push;
pub mod types;

use std::sync::Arc;
use tokio::sync::RwLock;

pub use changes::ChangeTracker;
pub use client::{SyncClient, SyncClientError};
pub use conflicts::{resolve_conflict, ConflictStore, ResolveResult};
pub use pull::{pull_changes, ChangeApplier, PullError, PullResult};
pub use push::{push_changes, push_changes_batched, PushError, PushResult};
pub use types::*;

/// Sync manager state for Tauri
pub struct SyncManagerState {
    /// Inner state protected by RwLock
    inner: Arc<RwLock<SyncManagerInner>>,
}

struct SyncManagerInner {
    /// Sync configuration
    config: SyncConfig,
    /// Current sync state
    state: SyncState,
    /// Change tracker
    tracker: Option<ChangeTracker>,
    /// Conflict store
    conflict_store: Option<ConflictStore>,
    /// HTTP client
    client: Option<SyncClient>,
    /// Database path
    db_path: String,
}

impl SyncManagerState {
    /// Create a new sync manager state
    pub fn new(db_path: &str) -> Self {
        Self {
            inner: Arc::new(RwLock::new(SyncManagerInner {
                config: SyncConfig::default(),
                state: SyncState::default(),
                tracker: None,
                conflict_store: None,
                client: None,
                db_path: db_path.to_string(),
            })),
        }
    }

    /// Initialize sync infrastructure
    pub async fn init(&self) -> Result<(), String> {
        let mut inner = self.inner.write().await;

        // Create tracker and initialize schema
        let tracker = ChangeTracker::new(&inner.db_path);
        tracker
            .init_schema()
            .map_err(|e| format!("Failed to init sync schema: {}", e))?;

        // Create conflict store
        let conflict_store = ConflictStore::new(&inner.db_path);

        // Update pending count
        inner.state.pending_changes = tracker
            .pending_count()
            .map_err(|e| format!("Failed to count pending changes: {}", e))?;

        inner.state.conflicts_count = conflict_store
            .conflict_count()
            .map_err(|e| format!("Failed to count conflicts: {}", e))?;

        inner.tracker = Some(tracker);
        inner.conflict_store = Some(conflict_store);

        Ok(())
    }

    /// Enable sync with authentication token
    pub async fn enable(&self, auth_token: String) -> Result<(), String> {
        let mut inner = self.inner.write().await;

        inner.config.auth_token = Some(auth_token);

        // Create HTTP client
        let client = SyncClient::new(inner.config.clone())
            .map_err(|e| format!("Failed to create sync client: {}", e))?;

        // Verify authentication
        let is_valid = client
            .verify_auth()
            .await
            .map_err(|e| format!("Auth verification failed: {}", e))?;

        if !is_valid {
            return Err("Invalid authentication token".to_string());
        }

        inner.client = Some(client);
        inner.state.enabled = true;

        Ok(())
    }

    /// Disable sync
    pub async fn disable(&self) {
        let mut inner = self.inner.write().await;
        inner.config.auth_token = None;
        inner.client = None;
        inner.state.enabled = false;
    }

    /// Get current sync state
    pub async fn get_state(&self) -> SyncState {
        self.inner.read().await.state.clone()
    }

    /// Get sync configuration
    pub async fn get_config(&self) -> SyncConfig {
        self.inner.read().await.config.clone()
    }

    /// Update sync configuration
    pub async fn set_config(&self, config: SyncConfig) {
        let mut inner = self.inner.write().await;
        inner.config = config;
    }

    /// Track a create operation
    pub async fn track_create(
        &self,
        entity_type: EntityType,
        entity_id: &str,
        data: Option<&str>,
    ) -> Result<(), String> {
        let inner = self.inner.read().await;

        if let Some(ref tracker) = inner.tracker {
            tracker
                .track_create(entity_type, entity_id, data)
                .map_err(|e| format!("Failed to track create: {}", e))?;
        }

        Ok(())
    }

    /// Track an update operation
    pub async fn track_update(
        &self,
        entity_type: EntityType,
        entity_id: &str,
        data: Option<&str>,
    ) -> Result<(), String> {
        let inner = self.inner.read().await;

        if let Some(ref tracker) = inner.tracker {
            tracker
                .track_update(entity_type, entity_id, data)
                .map_err(|e| format!("Failed to track update: {}", e))?;
        }

        Ok(())
    }

    /// Track a delete operation
    pub async fn track_delete(
        &self,
        entity_type: EntityType,
        entity_id: &str,
    ) -> Result<(), String> {
        let inner = self.inner.read().await;

        if let Some(ref tracker) = inner.tracker {
            tracker
                .track_delete(entity_type, entity_id)
                .map_err(|e| format!("Failed to track delete: {}", e))?;
        }

        Ok(())
    }

    /// Get all unresolved conflicts
    pub async fn get_conflicts(&self) -> Result<Vec<SyncConflict>, String> {
        let inner = self.inner.read().await;

        if let Some(ref store) = inner.conflict_store {
            store
                .get_conflicts()
                .map_err(|e| format!("Failed to get conflicts: {}", e))
        } else {
            Ok(vec![])
        }
    }

    /// Resolve a conflict
    pub async fn resolve_conflict(
        &self,
        conflict_id: &str,
        resolution: ConflictResolution,
    ) -> Result<ResolveResult, String> {
        let inner = self.inner.read().await;

        let store = inner
            .conflict_store
            .as_ref()
            .ok_or("Conflict store not initialized")?;

        let conflict = store
            .get_conflict(conflict_id)
            .map_err(|e| format!("Failed to get conflict: {}", e))?
            .ok_or("Conflict not found")?;

        // Resolve the conflict
        let result = conflicts::resolve_conflict(&conflict, resolution, |_data| {
            // In a real implementation, this would apply the data to the database
            // For now, we just acknowledge the resolution
            Ok(())
        })?;

        // Remove the resolved conflict
        store
            .remove_conflict(conflict_id)
            .map_err(|e| format!("Failed to remove conflict: {}", e))?;

        Ok(result)
    }

    /// Get pending change count
    pub async fn pending_count(&self) -> Result<usize, String> {
        let inner = self.inner.read().await;

        if let Some(ref tracker) = inner.tracker {
            tracker
                .pending_count()
                .map_err(|e| format!("Failed to count pending: {}", e))
        } else {
            Ok(0)
        }
    }

    /// Check if sync is enabled
    pub async fn is_enabled(&self) -> bool {
        self.inner.read().await.state.enabled
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[tokio::test]
    async fn test_sync_manager_init() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");

        let manager = SyncManagerState::new(db_path.to_str().unwrap());
        manager.init().await.unwrap();

        let state = manager.get_state().await;
        assert!(!state.enabled);
        assert_eq!(state.pending_changes, 0);
    }

    #[tokio::test]
    async fn test_track_operations() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");

        let manager = SyncManagerState::new(db_path.to_str().unwrap());
        manager.init().await.unwrap();

        manager
            .track_create(EntityType::Memory, "mem123", Some(r#"{"test":true}"#))
            .await
            .unwrap();

        let count = manager.pending_count().await.unwrap();
        assert_eq!(count, 1);
    }

    #[tokio::test]
    async fn test_track_multiple_operations() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");

        let manager = SyncManagerState::new(db_path.to_str().unwrap());
        manager.init().await.unwrap();

        // Track multiple operations
        manager
            .track_create(EntityType::Memory, "mem1", Some(r#"{"a":1}"#))
            .await
            .unwrap();
        manager
            .track_update(EntityType::Memory, "mem2", Some(r#"{"b":2}"#))
            .await
            .unwrap();
        manager
            .track_delete(EntityType::Memory, "mem3")
            .await
            .unwrap();

        let count = manager.pending_count().await.unwrap();
        assert_eq!(count, 3);
    }

    #[tokio::test]
    async fn test_get_conflicts_empty() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");

        let manager = SyncManagerState::new(db_path.to_str().unwrap());
        manager.init().await.unwrap();

        let conflicts = manager.get_conflicts().await.unwrap();
        assert!(conflicts.is_empty());
    }

    #[tokio::test]
    async fn test_sync_state_defaults() {
        let state = SyncState::default();

        assert!(!state.enabled);
        assert!(!state.syncing);
        assert!(state.last_sync.is_none());
        assert_eq!(state.pending_changes, 0);
        assert_eq!(state.conflicts_count, 0);
        assert!(state.last_error.is_none());
    }

    #[tokio::test]
    async fn test_config_defaults() {
        let config = SyncConfig::default();

        assert_eq!(config.server_url, "https://sync.athreei.com");
        assert!(config.auth_token.is_none());
        assert!(!config.auto_sync);
        assert_eq!(config.sync_interval, 0);
        assert!(!config.device_id.is_empty());
    }

    #[tokio::test]
    async fn test_update_config() {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");

        let manager = SyncManagerState::new(db_path.to_str().unwrap());
        manager.init().await.unwrap();

        let mut config = manager.get_config().await;
        config.server_url = "https://custom.server.com".to_string();
        config.auto_sync = true;
        config.sync_interval = 60;

        manager.set_config(config.clone()).await;

        let updated = manager.get_config().await;
        assert_eq!(updated.server_url, "https://custom.server.com");
        assert!(updated.auto_sync);
        assert_eq!(updated.sync_interval, 60);
    }
}
