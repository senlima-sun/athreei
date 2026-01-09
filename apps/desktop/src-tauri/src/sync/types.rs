//! Sync protocol types
//!
//! Defines the data structures used for cloud synchronization.

use serde::{Deserialize, Serialize};

/// Sync operation type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncOperationType {
    /// Create a new entity
    Create,
    /// Update an existing entity
    Update,
    /// Delete an entity
    Delete,
}

/// Entity type being synced
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EntityType {
    /// A memory entity
    Memory,
    /// A space entity
    Space,
    /// A tag entity
    Tag,
}

/// A single sync operation record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncOperation {
    /// Unique operation ID
    pub id: String,
    /// Type of operation
    pub operation_type: SyncOperationType,
    /// Type of entity being operated on
    pub entity_type: EntityType,
    /// ID of the entity
    pub entity_id: String,
    /// When the operation occurred (Unix timestamp ms)
    pub timestamp: i64,
    /// Serialized entity data (for create/update)
    pub data: Option<String>,
    /// Whether this operation has been synced to remote
    pub synced: bool,
}

impl SyncOperation {
    /// Create a new sync operation
    pub fn new(
        operation_type: SyncOperationType,
        entity_type: EntityType,
        entity_id: String,
        data: Option<String>,
    ) -> Self {
        Self {
            id: nanoid::nanoid!(),
            operation_type,
            entity_type,
            entity_id,
            timestamp: chrono_timestamp(),
            data,
            synced: false,
        }
    }
}

/// Overall sync state
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SyncState {
    /// Whether sync is enabled
    pub enabled: bool,
    /// Whether currently syncing
    pub syncing: bool,
    /// Last successful sync timestamp
    pub last_sync: Option<i64>,
    /// Number of pending local changes
    pub pending_changes: usize,
    /// Number of unresolved conflicts
    pub conflicts_count: usize,
    /// Last error message if any
    pub last_error: Option<String>,
    /// Remote sync cursor/token
    pub sync_cursor: Option<String>,
}

/// A sync conflict between local and remote changes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConflict {
    /// Unique conflict ID
    pub id: String,
    /// Type of entity in conflict
    pub entity_type: EntityType,
    /// ID of the conflicting entity
    pub entity_id: String,
    /// Local version of the entity (serialized)
    pub local_data: String,
    /// Remote version of the entity (serialized)
    pub remote_data: String,
    /// When the local change occurred
    pub local_timestamp: i64,
    /// When the remote change occurred
    pub remote_timestamp: i64,
    /// When the conflict was detected
    pub detected_at: i64,
}

impl SyncConflict {
    /// Create a new conflict record
    pub fn new(
        entity_type: EntityType,
        entity_id: String,
        local_data: String,
        remote_data: String,
        local_timestamp: i64,
        remote_timestamp: i64,
    ) -> Self {
        Self {
            id: nanoid::nanoid!(),
            entity_type,
            entity_id,
            local_data,
            remote_data,
            local_timestamp,
            remote_timestamp,
            detected_at: chrono_timestamp(),
        }
    }
}

/// Resolution strategy for conflicts
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConflictResolution {
    /// Keep the local version
    KeepLocal,
    /// Keep the remote version
    KeepRemote,
    /// Keep both versions (create duplicate for remote)
    KeepBoth,
}

/// Wire format for sync messages
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncRequest {
    /// Protocol version
    pub version: u32,
    /// Device ID sending the request
    pub device_id: String,
    /// Changes to push to server
    pub changes: Vec<SyncChange>,
    /// Cursor for incremental sync
    pub cursor: Option<String>,
}

impl SyncRequest {
    /// Current protocol version
    pub const PROTOCOL_VERSION: u32 = 1;

    /// Create a new sync request
    pub fn new(device_id: String, changes: Vec<SyncChange>, cursor: Option<String>) -> Self {
        Self {
            version: Self::PROTOCOL_VERSION,
            device_id,
            changes,
            cursor,
        }
    }
}

/// A single change in the sync protocol
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncChange {
    /// Type of operation
    pub operation: SyncOperationType,
    /// Type of entity
    pub entity_type: EntityType,
    /// Entity ID
    pub entity_id: String,
    /// Timestamp of the change
    pub timestamp: i64,
    /// Encrypted entity data (base64 encoded)
    pub encrypted_data: Option<String>,
}

/// Response from sync server
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncResponse {
    /// Whether the request was successful
    pub success: bool,
    /// Error message if failed
    pub error: Option<String>,
    /// Remote changes to apply locally
    pub changes: Vec<SyncChange>,
    /// New cursor for next sync
    pub cursor: Option<String>,
    /// Conflicts that need resolution
    pub conflicts: Vec<SyncConflictInfo>,
}

/// Conflict info from server
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConflictInfo {
    /// Entity type
    pub entity_type: EntityType,
    /// Entity ID
    pub entity_id: String,
    /// Local timestamp
    pub local_timestamp: i64,
    /// Remote timestamp
    pub remote_timestamp: i64,
    /// Remote data (encrypted)
    pub remote_data: String,
}

/// Sync configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConfig {
    /// Sync server URL
    pub server_url: String,
    /// Authentication token
    pub auth_token: Option<String>,
    /// Whether to auto-sync on changes
    pub auto_sync: bool,
    /// Auto-sync interval in seconds (0 = disabled)
    pub sync_interval: u64,
    /// Unique device identifier
    pub device_id: String,
}

impl Default for SyncConfig {
    fn default() -> Self {
        Self {
            server_url: "https://sync.athreei.com".to_string(),
            auth_token: None,
            auto_sync: false,
            sync_interval: 0,
            device_id: nanoid::nanoid!(),
        }
    }
}

/// Helper to get current timestamp in milliseconds
fn chrono_timestamp() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sync_operation_new() {
        let op = SyncOperation::new(
            SyncOperationType::Create,
            EntityType::Memory,
            "mem123".to_string(),
            Some(r#"{"title":"test"}"#.to_string()),
        );

        assert!(!op.id.is_empty());
        assert_eq!(op.operation_type, SyncOperationType::Create);
        assert_eq!(op.entity_type, EntityType::Memory);
        assert_eq!(op.entity_id, "mem123");
        assert!(!op.synced);
    }

    #[test]
    fn test_sync_request_new() {
        let req = SyncRequest::new("device123".to_string(), vec![], None);

        assert_eq!(req.version, SyncRequest::PROTOCOL_VERSION);
        assert_eq!(req.device_id, "device123");
        assert!(req.changes.is_empty());
    }

    #[test]
    fn test_conflict_new() {
        let conflict = SyncConflict::new(
            EntityType::Memory,
            "mem123".to_string(),
            r#"{"local":true}"#.to_string(),
            r#"{"remote":true}"#.to_string(),
            1000,
            2000,
        );

        assert!(!conflict.id.is_empty());
        assert_eq!(conflict.entity_type, EntityType::Memory);
        assert!(conflict.detected_at > 0);
    }
}
