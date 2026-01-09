//! Change tracking for sync operations
//!
//! Tracks local changes that need to be synced to the cloud.

use super::types::{EntityType, SyncOperation, SyncOperationType};
use rusqlite::{params, Connection, Result};

/// Schema version for change log table
const SCHEMA_VERSION: u32 = 1;

/// Change tracker for sync operations
pub struct ChangeTracker {
    /// Database connection for persisting changes
    /// Uses a separate connection to avoid lock contention
    db_path: String,
}

impl ChangeTracker {
    /// Create a new change tracker
    pub fn new(db_path: &str) -> Self {
        Self {
            db_path: db_path.to_string(),
        }
    }

    /// Initialize the change log schema
    pub fn init_schema(&self) -> Result<()> {
        let conn = Connection::open(&self.db_path)?;

        conn.execute_batch(
            r#"
            -- Change log table for tracking local changes
            CREATE TABLE IF NOT EXISTS sync_changes (
                id TEXT PRIMARY KEY,
                operation_type TEXT NOT NULL,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                timestamp INTEGER NOT NULL,
                data TEXT,
                synced INTEGER NOT NULL DEFAULT 0
            );

            -- Index for efficient querying of unsynced changes
            CREATE INDEX IF NOT EXISTS idx_sync_changes_synced
            ON sync_changes(synced, timestamp);

            -- Index for entity lookups
            CREATE INDEX IF NOT EXISTS idx_sync_changes_entity
            ON sync_changes(entity_type, entity_id);

            -- Sync state table
            CREATE TABLE IF NOT EXISTS sync_state (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            -- Conflicts table
            CREATE TABLE IF NOT EXISTS sync_conflicts (
                id TEXT PRIMARY KEY,
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                local_data TEXT NOT NULL,
                remote_data TEXT NOT NULL,
                local_timestamp INTEGER NOT NULL,
                remote_timestamp INTEGER NOT NULL,
                detected_at INTEGER NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_sync_conflicts_entity
            ON sync_conflicts(entity_type, entity_id);
            "#,
        )?;

        // Store schema version
        conn.execute(
            "INSERT OR REPLACE INTO sync_state (key, value) VALUES ('schema_version', ?1)",
            params![SCHEMA_VERSION.to_string()],
        )?;

        Ok(())
    }

    /// Record a create operation
    pub fn track_create(
        &self,
        entity_type: EntityType,
        entity_id: &str,
        data: Option<&str>,
    ) -> Result<SyncOperation> {
        self.track_operation(SyncOperationType::Create, entity_type, entity_id, data)
    }

    /// Record an update operation
    pub fn track_update(
        &self,
        entity_type: EntityType,
        entity_id: &str,
        data: Option<&str>,
    ) -> Result<SyncOperation> {
        self.track_operation(SyncOperationType::Update, entity_type, entity_id, data)
    }

    /// Record a delete operation
    pub fn track_delete(&self, entity_type: EntityType, entity_id: &str) -> Result<SyncOperation> {
        self.track_operation(SyncOperationType::Delete, entity_type, entity_id, None)
    }

    /// Track an operation in the change log
    fn track_operation(
        &self,
        operation_type: SyncOperationType,
        entity_type: EntityType,
        entity_id: &str,
        data: Option<&str>,
    ) -> Result<SyncOperation> {
        let op = SyncOperation::new(
            operation_type,
            entity_type,
            entity_id.to_string(),
            data.map(|s| s.to_string()),
        );

        let conn = Connection::open(&self.db_path)?;

        conn.execute(
            "INSERT INTO sync_changes (id, operation_type, entity_type, entity_id, timestamp, data, synced)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                op.id,
                serde_json::to_string(&op.operation_type).unwrap_or_default(),
                serde_json::to_string(&op.entity_type).unwrap_or_default(),
                op.entity_id,
                op.timestamp,
                op.data,
                op.synced as i32,
            ],
        )?;

        Ok(op)
    }

    /// Get all unsynced changes
    pub fn get_pending_changes(&self) -> Result<Vec<SyncOperation>> {
        let conn = Connection::open(&self.db_path)?;

        let mut stmt = conn.prepare(
            "SELECT id, operation_type, entity_type, entity_id, timestamp, data, synced
             FROM sync_changes
             WHERE synced = 0
             ORDER BY timestamp ASC",
        )?;

        let operations = stmt
            .query_map([], |row| {
                let op_type_str: String = row.get(1)?;
                let entity_type_str: String = row.get(2)?;

                Ok(SyncOperation {
                    id: row.get(0)?,
                    operation_type: serde_json::from_str(&op_type_str)
                        .unwrap_or(SyncOperationType::Update),
                    entity_type: serde_json::from_str(&entity_type_str)
                        .unwrap_or(EntityType::Memory),
                    entity_id: row.get(3)?,
                    timestamp: row.get(4)?,
                    data: row.get(5)?,
                    synced: row.get::<_, i32>(6)? != 0,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(operations)
    }

    /// Mark changes as synced
    pub fn mark_synced(&self, operation_ids: &[String]) -> Result<()> {
        if operation_ids.is_empty() {
            return Ok(());
        }

        let conn = Connection::open(&self.db_path)?;

        let placeholders = operation_ids
            .iter()
            .map(|_| "?")
            .collect::<Vec<_>>()
            .join(",");
        let sql = format!(
            "UPDATE sync_changes SET synced = 1 WHERE id IN ({})",
            placeholders
        );

        let params: Vec<&dyn rusqlite::ToSql> = operation_ids
            .iter()
            .map(|id| id as &dyn rusqlite::ToSql)
            .collect();

        conn.execute(&sql, params.as_slice())?;

        Ok(())
    }

    /// Count pending changes
    pub fn pending_count(&self) -> Result<usize> {
        let conn = Connection::open(&self.db_path)?;

        let count: i64 = conn.query_row(
            "SELECT COUNT(*) FROM sync_changes WHERE synced = 0",
            [],
            |row| row.get(0),
        )?;

        Ok(count as usize)
    }

    /// Clean up old synced changes (keep last 1000)
    pub fn cleanup_old_changes(&self) -> Result<usize> {
        let conn = Connection::open(&self.db_path)?;

        let deleted = conn.execute(
            "DELETE FROM sync_changes
             WHERE synced = 1
             AND id NOT IN (
                 SELECT id FROM sync_changes
                 WHERE synced = 1
                 ORDER BY timestamp DESC
                 LIMIT 1000
             )",
            [],
        )?;

        Ok(deleted)
    }

    /// Get or set sync state value
    pub fn get_state(&self, key: &str) -> Result<Option<String>> {
        let conn = Connection::open(&self.db_path)?;

        let result = conn.query_row(
            "SELECT value FROM sync_state WHERE key = ?1",
            params![key],
            |row| row.get(0),
        );

        match result {
            Ok(value) => Ok(Some(value)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    /// Set sync state value
    pub fn set_state(&self, key: &str, value: &str) -> Result<()> {
        let conn = Connection::open(&self.db_path)?;

        conn.execute(
            "INSERT OR REPLACE INTO sync_state (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;

        Ok(())
    }

    /// Get last sync cursor
    pub fn get_cursor(&self) -> Result<Option<String>> {
        self.get_state("sync_cursor")
    }

    /// Set last sync cursor
    pub fn set_cursor(&self, cursor: &str) -> Result<()> {
        self.set_state("sync_cursor", cursor)
    }

    /// Get last sync timestamp
    pub fn get_last_sync(&self) -> Result<Option<i64>> {
        self.get_state("last_sync")
            .map(|v| v.and_then(|s| s.parse().ok()))
    }

    /// Set last sync timestamp
    pub fn set_last_sync(&self, timestamp: i64) -> Result<()> {
        self.set_state("last_sync", &timestamp.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn create_test_tracker() -> (ChangeTracker, tempfile::TempDir) {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let tracker = ChangeTracker::new(db_path.to_str().unwrap());
        tracker.init_schema().unwrap();
        (tracker, dir)
    }

    #[test]
    fn test_track_create() {
        let (tracker, _dir) = create_test_tracker();

        let op = tracker
            .track_create(EntityType::Memory, "mem123", Some(r#"{"title":"test"}"#))
            .unwrap();

        assert_eq!(op.operation_type, SyncOperationType::Create);
        assert_eq!(op.entity_type, EntityType::Memory);
        assert_eq!(op.entity_id, "mem123");
        assert!(!op.synced);
    }

    #[test]
    fn test_pending_changes() {
        let (tracker, _dir) = create_test_tracker();

        tracker
            .track_create(EntityType::Memory, "mem1", None)
            .unwrap();
        tracker
            .track_update(EntityType::Memory, "mem2", None)
            .unwrap();
        tracker
            .track_delete(EntityType::Memory, "mem3")
            .unwrap();

        let pending = tracker.get_pending_changes().unwrap();
        assert_eq!(pending.len(), 3);

        assert_eq!(tracker.pending_count().unwrap(), 3);
    }

    #[test]
    fn test_mark_synced() {
        let (tracker, _dir) = create_test_tracker();

        let op1 = tracker
            .track_create(EntityType::Memory, "mem1", None)
            .unwrap();
        let _op2 = tracker
            .track_create(EntityType::Memory, "mem2", None)
            .unwrap();

        assert_eq!(tracker.pending_count().unwrap(), 2);

        tracker.mark_synced(&[op1.id]).unwrap();

        assert_eq!(tracker.pending_count().unwrap(), 1);
    }

    #[test]
    fn test_state_operations() {
        let (tracker, _dir) = create_test_tracker();

        assert!(tracker.get_cursor().unwrap().is_none());

        tracker.set_cursor("cursor123").unwrap();
        assert_eq!(tracker.get_cursor().unwrap(), Some("cursor123".to_string()));

        tracker.set_last_sync(1234567890).unwrap();
        assert_eq!(tracker.get_last_sync().unwrap(), Some(1234567890));
    }
}
