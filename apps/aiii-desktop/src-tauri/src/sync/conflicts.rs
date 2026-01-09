//! Conflict detection and resolution for sync operations
//!
//! Handles cases where the same entity was modified both locally and remotely.

use super::types::{ConflictResolution, EntityType, SyncConflict};
use rusqlite::{params, Connection, Result};

/// Store for sync conflicts
pub struct ConflictStore {
    /// Database path
    db_path: String,
}

impl ConflictStore {
    /// Create a new conflict store
    pub fn new(db_path: &str) -> Self {
        Self {
            db_path: db_path.to_string(),
        }
    }

    /// Store a new conflict
    pub fn store_conflict(&self, conflict: &SyncConflict) -> Result<()> {
        let conn = Connection::open(&self.db_path)?;

        conn.execute(
            "INSERT OR REPLACE INTO sync_conflicts
             (id, entity_type, entity_id, local_data, remote_data, local_timestamp, remote_timestamp, detected_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                conflict.id,
                serde_json::to_string(&conflict.entity_type).unwrap_or_default(),
                conflict.entity_id,
                conflict.local_data,
                conflict.remote_data,
                conflict.local_timestamp,
                conflict.remote_timestamp,
                conflict.detected_at,
            ],
        )?;

        Ok(())
    }

    /// Get all unresolved conflicts
    pub fn get_conflicts(&self) -> Result<Vec<SyncConflict>> {
        let conn = Connection::open(&self.db_path)?;

        let mut stmt = conn.prepare(
            "SELECT id, entity_type, entity_id, local_data, remote_data, local_timestamp, remote_timestamp, detected_at
             FROM sync_conflicts
             ORDER BY detected_at DESC",
        )?;

        let conflicts = stmt
            .query_map([], |row| {
                let entity_type_str: String = row.get(1)?;

                Ok(SyncConflict {
                    id: row.get(0)?,
                    entity_type: serde_json::from_str(&entity_type_str)
                        .unwrap_or(EntityType::Memory),
                    entity_id: row.get(2)?,
                    local_data: row.get(3)?,
                    remote_data: row.get(4)?,
                    local_timestamp: row.get(5)?,
                    remote_timestamp: row.get(6)?,
                    detected_at: row.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(conflicts)
    }

    /// Get a specific conflict by ID
    pub fn get_conflict(&self, id: &str) -> Result<Option<SyncConflict>> {
        let conn = Connection::open(&self.db_path)?;

        let mut stmt = conn.prepare(
            "SELECT id, entity_type, entity_id, local_data, remote_data, local_timestamp, remote_timestamp, detected_at
             FROM sync_conflicts
             WHERE id = ?1",
        )?;

        let result = stmt.query_row(params![id], |row| {
            let entity_type_str: String = row.get(1)?;

            Ok(SyncConflict {
                id: row.get(0)?,
                entity_type: serde_json::from_str(&entity_type_str).unwrap_or(EntityType::Memory),
                entity_id: row.get(2)?,
                local_data: row.get(3)?,
                remote_data: row.get(4)?,
                local_timestamp: row.get(5)?,
                remote_timestamp: row.get(6)?,
                detected_at: row.get(7)?,
            })
        });

        match result {
            Ok(conflict) => Ok(Some(conflict)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    /// Get conflicts for a specific entity
    pub fn get_entity_conflicts(
        &self,
        entity_type: EntityType,
        entity_id: &str,
    ) -> Result<Vec<SyncConflict>> {
        let conn = Connection::open(&self.db_path)?;

        let entity_type_str = serde_json::to_string(&entity_type).unwrap_or_default();

        let mut stmt = conn.prepare(
            "SELECT id, entity_type, entity_id, local_data, remote_data, local_timestamp, remote_timestamp, detected_at
             FROM sync_conflicts
             WHERE entity_type = ?1 AND entity_id = ?2
             ORDER BY detected_at DESC",
        )?;

        let conflicts = stmt
            .query_map(params![entity_type_str, entity_id], |row| {
                let entity_type_str: String = row.get(1)?;

                Ok(SyncConflict {
                    id: row.get(0)?,
                    entity_type: serde_json::from_str(&entity_type_str)
                        .unwrap_or(EntityType::Memory),
                    entity_id: row.get(2)?,
                    local_data: row.get(3)?,
                    remote_data: row.get(4)?,
                    local_timestamp: row.get(5)?,
                    remote_timestamp: row.get(6)?,
                    detected_at: row.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>>>()?;

        Ok(conflicts)
    }

    /// Remove a resolved conflict
    pub fn remove_conflict(&self, id: &str) -> Result<()> {
        let conn = Connection::open(&self.db_path)?;

        conn.execute("DELETE FROM sync_conflicts WHERE id = ?1", params![id])?;

        Ok(())
    }

    /// Count unresolved conflicts
    pub fn conflict_count(&self) -> Result<usize> {
        let conn = Connection::open(&self.db_path)?;

        let count: i64 =
            conn.query_row("SELECT COUNT(*) FROM sync_conflicts", [], |row| row.get(0))?;

        Ok(count as usize)
    }

    /// Clear all conflicts
    pub fn clear_all(&self) -> Result<()> {
        let conn = Connection::open(&self.db_path)?;

        conn.execute("DELETE FROM sync_conflicts", [])?;

        Ok(())
    }
}

/// Resolve a conflict with the given strategy
pub fn resolve_conflict<F>(
    conflict: &SyncConflict,
    resolution: ConflictResolution,
    apply_data: F,
) -> Result<ResolveResult, String>
where
    F: Fn(&str) -> Result<(), String>,
{
    match resolution {
        ConflictResolution::KeepLocal => {
            // Local data is already in place, nothing to do
            Ok(ResolveResult {
                kept_local: true,
                kept_remote: false,
                created_duplicate: false,
            })
        }
        ConflictResolution::KeepRemote => {
            // Apply remote data
            apply_data(&conflict.remote_data)?;
            Ok(ResolveResult {
                kept_local: false,
                kept_remote: true,
                created_duplicate: false,
            })
        }
        ConflictResolution::KeepBoth => {
            // Keep local as-is, create a new entity with remote data
            // The caller needs to handle the actual duplication logic
            Ok(ResolveResult {
                kept_local: true,
                kept_remote: true,
                created_duplicate: true,
            })
        }
    }
}

/// Result of conflict resolution
#[derive(Debug, Clone)]
pub struct ResolveResult {
    /// Whether local version was kept
    pub kept_local: bool,
    /// Whether remote version was kept
    pub kept_remote: bool,
    /// Whether a duplicate was created (for keep both)
    pub created_duplicate: bool,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sync::changes::ChangeTracker;
    use tempfile::tempdir;

    fn create_test_store() -> (ConflictStore, tempfile::TempDir) {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");

        // Initialize schema using ChangeTracker
        let tracker = ChangeTracker::new(db_path.to_str().unwrap());
        tracker.init_schema().unwrap();

        let store = ConflictStore::new(db_path.to_str().unwrap());
        (store, dir)
    }

    #[test]
    fn test_store_and_get_conflict() {
        let (store, _dir) = create_test_store();

        let conflict = SyncConflict::new(
            EntityType::Memory,
            "mem123".to_string(),
            r#"{"local":true}"#.to_string(),
            r#"{"remote":true}"#.to_string(),
            1000,
            2000,
        );

        store.store_conflict(&conflict).unwrap();

        let retrieved = store.get_conflict(&conflict.id).unwrap();
        assert!(retrieved.is_some());

        let retrieved = retrieved.unwrap();
        assert_eq!(retrieved.entity_id, "mem123");
        assert_eq!(retrieved.local_data, r#"{"local":true}"#);
        assert_eq!(retrieved.remote_data, r#"{"remote":true}"#);
    }

    #[test]
    fn test_get_conflicts() {
        let (store, _dir) = create_test_store();

        for i in 0..3 {
            let conflict = SyncConflict::new(
                EntityType::Memory,
                format!("mem{}", i),
                "local".to_string(),
                "remote".to_string(),
                1000,
                2000,
            );
            store.store_conflict(&conflict).unwrap();
        }

        let conflicts = store.get_conflicts().unwrap();
        assert_eq!(conflicts.len(), 3);
    }

    #[test]
    fn test_conflict_count() {
        let (store, _dir) = create_test_store();

        assert_eq!(store.conflict_count().unwrap(), 0);

        let conflict = SyncConflict::new(
            EntityType::Memory,
            "mem123".to_string(),
            "local".to_string(),
            "remote".to_string(),
            1000,
            2000,
        );
        store.store_conflict(&conflict).unwrap();

        assert_eq!(store.conflict_count().unwrap(), 1);
    }

    #[test]
    fn test_remove_conflict() {
        let (store, _dir) = create_test_store();

        let conflict = SyncConflict::new(
            EntityType::Memory,
            "mem123".to_string(),
            "local".to_string(),
            "remote".to_string(),
            1000,
            2000,
        );
        store.store_conflict(&conflict).unwrap();

        assert_eq!(store.conflict_count().unwrap(), 1);

        store.remove_conflict(&conflict.id).unwrap();

        assert_eq!(store.conflict_count().unwrap(), 0);
    }

    #[test]
    fn test_resolve_keep_local() {
        let conflict = SyncConflict::new(
            EntityType::Memory,
            "mem123".to_string(),
            "local".to_string(),
            "remote".to_string(),
            1000,
            2000,
        );

        let result = resolve_conflict(&conflict, ConflictResolution::KeepLocal, |_| Ok(())).unwrap();

        assert!(result.kept_local);
        assert!(!result.kept_remote);
        assert!(!result.created_duplicate);
    }

    #[test]
    fn test_resolve_keep_remote() {
        let conflict = SyncConflict::new(
            EntityType::Memory,
            "mem123".to_string(),
            "local".to_string(),
            "remote".to_string(),
            1000,
            2000,
        );

        use std::cell::RefCell;
        let applied_data = RefCell::new(String::new());
        let result = resolve_conflict(&conflict, ConflictResolution::KeepRemote, |data| {
            *applied_data.borrow_mut() = data.to_string();
            Ok(())
        })
        .unwrap();

        assert!(!result.kept_local);
        assert!(result.kept_remote);
        assert_eq!(*applied_data.borrow(), "remote");
    }

    #[test]
    fn test_resolve_keep_both() {
        let conflict = SyncConflict::new(
            EntityType::Memory,
            "mem123".to_string(),
            "local".to_string(),
            "remote".to_string(),
            1000,
            2000,
        );

        let result = resolve_conflict(&conflict, ConflictResolution::KeepBoth, |_| Ok(())).unwrap();

        assert!(result.kept_local);
        assert!(result.kept_remote);
        assert!(result.created_duplicate);
    }
}
