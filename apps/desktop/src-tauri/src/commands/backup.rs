//! Backup-related Tauri commands
//!
//! Provides export and import functionality for data backup.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;

use crate::backup::{export_backup, import_backup, BackupHeader, ImportResult, ImportStrategy};
use crate::state::DatabaseState;

/// Export backup to a file
///
/// Returns the backup header with metadata about the export.
#[tauri::command]
pub async fn backup_export(
    path: String,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<BackupHeader, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let backup_path = PathBuf::from(path);
    export_backup(&db_guard, &backup_path)
}

/// Import backup from a file
///
/// Returns statistics about the import operation.
#[tauri::command]
pub async fn backup_import(
    path: String,
    strategy: ImportStrategy,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<ImportResult, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let backup_path = PathBuf::from(path);
    import_backup(&db_guard, &backup_path, strategy)
}

/// Get information about a backup file without importing
#[tauri::command]
pub async fn backup_info(path: String) -> Result<BackupInfo, String> {
    use flate2::read::GzDecoder;
    use std::fs::File;
    use std::io::Read;

    let file = File::open(&path).map_err(|e| format!("Failed to open backup file: {e}"))?;
    let mut decoder = GzDecoder::new(file);
    let mut decompressed = Vec::new();
    decoder
        .read_to_end(&mut decompressed)
        .map_err(|e| format!("Failed to decompress backup: {e}"))?;

    let backup_data: crate::backup::BackupData = rmp_serde::from_slice(&decompressed)
        .map_err(|e| format!("Failed to read backup: {e}"))?;

    // Get file size
    let file_size = std::fs::metadata(&path)
        .map(|m| m.len())
        .unwrap_or(0);

    Ok(BackupInfo {
        version: backup_data.header.version,
        created_at: backup_data.header.created_at,
        spaces_count: backup_data.header.spaces_count,
        memories_count: backup_data.header.memories_count,
        file_size,
        is_compatible: backup_data.header.version == BackupHeader::VERSION,
    })
}

/// Information about a backup file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupInfo {
    /// Backup format version
    pub version: u32,
    /// When the backup was created
    pub created_at: i64,
    /// Number of spaces in the backup
    pub spaces_count: usize,
    /// Number of memories in the backup
    pub memories_count: usize,
    /// File size in bytes
    pub file_size: u64,
    /// Whether this backup version is compatible
    pub is_compatible: bool,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::Database;
    use std::sync::Mutex;
    use tempfile::tempdir;

    fn create_test_state() -> DatabaseState {
        let db = Database::in_memory().unwrap();
        db.init_schema().unwrap();
        DatabaseState {
            db: Mutex::new(db),
            path: PathBuf::from(":memory:"),
        }
    }

    #[test]
    fn test_backup_info_struct() {
        let info = BackupInfo {
            version: 1,
            created_at: 1704067200,
            spaces_count: 5,
            memories_count: 100,
            file_size: 1024,
            is_compatible: true,
        };

        assert_eq!(info.version, 1);
        assert!(info.is_compatible);
    }
}
