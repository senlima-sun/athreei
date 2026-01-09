//! Pull operation for syncing remote changes to local
//!
//! Fetches changes from the sync server and applies them locally.

use super::changes::ChangeTracker;
use super::client::{SyncClient, SyncClientError};
use super::conflicts::ConflictStore;
use super::types::{EntityType, SyncChange, SyncConflict, SyncOperationType};
use thiserror::Error;

/// Pull operation errors
#[derive(Debug, Error)]
pub enum PullError {
    /// Database error
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    /// Client error
    #[error("Sync client error: {0}")]
    Client(#[from] SyncClientError),

    /// Failed to apply change
    #[error("Failed to apply change: {0}")]
    ApplyFailed(String),
}

/// Result of a pull operation
#[derive(Debug)]
pub struct PullResult {
    /// Number of changes received
    pub received_count: usize,
    /// Number of changes applied
    pub applied_count: usize,
    /// Number of conflicts detected
    pub conflicts_count: usize,
    /// New sync cursor
    pub new_cursor: Option<String>,
}

/// Trait for applying changes to local storage
pub trait ChangeApplier {
    /// Apply a create operation
    fn apply_create(
        &self,
        entity_type: EntityType,
        entity_id: &str,
        data: &str,
    ) -> Result<(), String>;

    /// Apply an update operation
    fn apply_update(
        &self,
        entity_type: EntityType,
        entity_id: &str,
        data: &str,
    ) -> Result<(), String>;

    /// Apply a delete operation
    fn apply_delete(&self, entity_type: EntityType, entity_id: &str) -> Result<(), String>;

    /// Get local data for an entity (for conflict detection)
    fn get_local_data(&self, entity_type: EntityType, entity_id: &str)
        -> Result<Option<String>, String>;

    /// Get local timestamp for an entity
    fn get_local_timestamp(
        &self,
        entity_type: EntityType,
        entity_id: &str,
    ) -> Result<Option<i64>, String>;
}

/// Pull remote changes from the sync server
pub async fn pull_changes<A: ChangeApplier>(
    client: &SyncClient,
    tracker: &ChangeTracker,
    conflict_store: &ConflictStore,
    applier: &A,
) -> Result<PullResult, PullError> {
    // Get current cursor
    let cursor = tracker.get_cursor()?;

    // Fetch changes from server
    let response = client.sync(vec![], cursor).await?;

    let received_count = response.changes.len();
    let mut applied_count = 0;
    let mut conflicts_count = 0;

    // Process each change
    for change in &response.changes {
        match process_change(change, tracker, conflict_store, applier).await {
            ProcessResult::Applied => applied_count += 1,
            ProcessResult::Conflict => conflicts_count += 1,
            ProcessResult::Skipped => {}
        }
    }

    // Process any conflicts from server response
    for conflict_info in &response.conflicts {
        let local_data = applier
            .get_local_data(conflict_info.entity_type, &conflict_info.entity_id)
            .map_err(PullError::ApplyFailed)?;

        if let Some(local) = local_data {
            let conflict = SyncConflict::new(
                conflict_info.entity_type,
                conflict_info.entity_id.clone(),
                local,
                conflict_info.remote_data.clone(),
                conflict_info.local_timestamp,
                conflict_info.remote_timestamp,
            );
            conflict_store.store_conflict(&conflict)?;
            conflicts_count += 1;
        }
    }

    // Update cursor
    let new_cursor = response.cursor.clone();
    if let Some(ref cursor) = new_cursor {
        tracker.set_cursor(cursor)?;
    }

    // Update last sync time
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;
    tracker.set_last_sync(now)?;

    Ok(PullResult {
        received_count,
        applied_count,
        conflicts_count,
        new_cursor,
    })
}

/// Result of processing a single change
enum ProcessResult {
    Applied,
    Conflict,
    Skipped,
}

/// Process a single remote change
async fn process_change<A: ChangeApplier>(
    change: &SyncChange,
    _tracker: &ChangeTracker,
    conflict_store: &ConflictStore,
    applier: &A,
) -> ProcessResult {
    // Check for conflicts
    let local_timestamp = applier
        .get_local_timestamp(change.entity_type, &change.entity_id)
        .ok()
        .flatten();

    if let Some(local_ts) = local_timestamp {
        // If local was modified after the remote change, we have a conflict
        if local_ts > change.timestamp {
            if let Some(ref remote_data) = change.encrypted_data {
                if let Ok(Some(local_data)) =
                    applier.get_local_data(change.entity_type, &change.entity_id)
                {
                    let conflict = SyncConflict::new(
                        change.entity_type,
                        change.entity_id.clone(),
                        local_data,
                        remote_data.clone(),
                        local_ts,
                        change.timestamp,
                    );
                    let _ = conflict_store.store_conflict(&conflict);
                    return ProcessResult::Conflict;
                }
            }
        }
    }

    // Apply the change
    let result = match change.operation {
        SyncOperationType::Create => {
            if let Some(ref data) = change.encrypted_data {
                applier.apply_create(change.entity_type, &change.entity_id, data)
            } else {
                Err("Missing data for create operation".to_string())
            }
        }
        SyncOperationType::Update => {
            if let Some(ref data) = change.encrypted_data {
                applier.apply_update(change.entity_type, &change.entity_id, data)
            } else {
                Err("Missing data for update operation".to_string())
            }
        }
        SyncOperationType::Delete => applier.apply_delete(change.entity_type, &change.entity_id),
    };

    match result {
        Ok(()) => ProcessResult::Applied,
        Err(_) => ProcessResult::Skipped,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct MockApplier;

    impl ChangeApplier for MockApplier {
        fn apply_create(
            &self,
            _entity_type: EntityType,
            _entity_id: &str,
            _data: &str,
        ) -> Result<(), String> {
            Ok(())
        }

        fn apply_update(
            &self,
            _entity_type: EntityType,
            _entity_id: &str,
            _data: &str,
        ) -> Result<(), String> {
            Ok(())
        }

        fn apply_delete(&self, _entity_type: EntityType, _entity_id: &str) -> Result<(), String> {
            Ok(())
        }

        fn get_local_data(
            &self,
            _entity_type: EntityType,
            _entity_id: &str,
        ) -> Result<Option<String>, String> {
            Ok(None)
        }

        fn get_local_timestamp(
            &self,
            _entity_type: EntityType,
            _entity_id: &str,
        ) -> Result<Option<i64>, String> {
            Ok(None)
        }
    }

    #[test]
    fn test_pull_error_display() {
        let err = PullError::ApplyFailed("test error".to_string());
        assert!(err.to_string().contains("test error"));
    }
}
