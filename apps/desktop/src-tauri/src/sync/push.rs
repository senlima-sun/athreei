//! Push operation for syncing local changes to cloud
//!
//! Collects pending local changes and pushes them to the sync server.

use super::changes::ChangeTracker;
use super::client::{SyncClient, SyncClientError};
use super::types::{SyncChange, SyncResponse};
use thiserror::Error;

/// Push operation errors
#[derive(Debug, Error)]
pub enum PushError {
    /// Database error
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),

    /// Client error
    #[error("Sync client error: {0}")]
    Client(#[from] SyncClientError),

    /// No changes to push
    #[error("No pending changes")]
    NoChanges,
}

/// Result of a push operation
#[derive(Debug)]
pub struct PushResult {
    /// Number of changes pushed
    pub pushed_count: usize,
    /// IDs of operations that were synced
    pub synced_ids: Vec<String>,
    /// Server response
    pub response: SyncResponse,
}

/// Push pending local changes to the sync server
pub async fn push_changes(
    client: &SyncClient,
    tracker: &ChangeTracker,
) -> Result<PushResult, PushError> {
    // Get pending changes
    let pending = tracker.get_pending_changes()?;

    if pending.is_empty() {
        return Err(PushError::NoChanges);
    }

    // Convert to sync changes
    let changes: Vec<SyncChange> = pending
        .iter()
        .map(|op| SyncChange {
            operation: op.operation_type,
            entity_type: op.entity_type,
            entity_id: op.entity_id.clone(),
            timestamp: op.timestamp,
            encrypted_data: op.data.clone(),
        })
        .collect();

    let operation_ids: Vec<String> = pending.iter().map(|op| op.id.clone()).collect();
    let pushed_count = changes.len();

    // Get current cursor
    let cursor = tracker.get_cursor()?;

    // Send to server
    let response = client.sync(changes, cursor).await?;

    // Mark operations as synced
    tracker.mark_synced(&operation_ids)?;

    // Update cursor if server returned one
    if let Some(new_cursor) = &response.cursor {
        tracker.set_cursor(new_cursor)?;
    }

    // Update last sync time
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;
    tracker.set_last_sync(now)?;

    Ok(PushResult {
        pushed_count,
        synced_ids: operation_ids,
        response,
    })
}

/// Push changes in batches for large sync operations
pub async fn push_changes_batched(
    client: &SyncClient,
    tracker: &ChangeTracker,
    batch_size: usize,
) -> Result<Vec<PushResult>, PushError> {
    let mut results = Vec::new();

    loop {
        let pending = tracker.get_pending_changes()?;

        if pending.is_empty() {
            break;
        }

        // Take only batch_size changes
        let batch: Vec<_> = pending.into_iter().take(batch_size).collect();
        let batch_count = batch.len();

        let changes: Vec<SyncChange> = batch
            .iter()
            .map(|op| SyncChange {
                operation: op.operation_type,
                entity_type: op.entity_type,
                entity_id: op.entity_id.clone(),
                timestamp: op.timestamp,
                encrypted_data: op.data.clone(),
            })
            .collect();

        let operation_ids: Vec<String> = batch.iter().map(|op| op.id.clone()).collect();

        let cursor = tracker.get_cursor()?;
        let response = client.sync(changes, cursor).await?;

        tracker.mark_synced(&operation_ids)?;

        if let Some(new_cursor) = &response.cursor {
            tracker.set_cursor(new_cursor)?;
        }

        results.push(PushResult {
            pushed_count: batch_count,
            synced_ids: operation_ids,
            response,
        });

        // If we processed less than batch_size, we're done
        if batch_count < batch_size {
            break;
        }
    }

    // Update last sync time after all batches
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64;
    tracker.set_last_sync(now)?;

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_push_error_display() {
        let err = PushError::NoChanges;
        assert_eq!(err.to_string(), "No pending changes");
    }
}
