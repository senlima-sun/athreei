//! Backup file format definitions
//!
//! Defines the structure of backup files for serialization with msgpack.

use serde::{Deserialize, Serialize};

/// Header information for a backup file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupHeader {
    /// Backup format version
    pub version: u32,
    /// Timestamp when backup was created (Unix epoch)
    pub created_at: i64,
    /// Number of spaces in the backup
    pub spaces_count: usize,
    /// Number of memories in the backup
    pub memories_count: usize,
    /// Optional description or note
    pub description: Option<String>,
}

impl BackupHeader {
    /// Current backup format version
    pub const VERSION: u32 = 1;

    /// Create a new backup header with current timestamp
    pub fn new(spaces_count: usize, memories_count: usize) -> Self {
        Self {
            version: Self::VERSION,
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs() as i64,
            spaces_count,
            memories_count,
            description: None,
        }
    }
}

/// A space in the backup format
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupSpace {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub source_rules: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// A memory in the backup format
///
/// Note: title, summary, and content are stored as encrypted bytes
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupMemory {
    pub id: String,
    pub space_id: Option<String>,
    pub source: String,
    pub source_id: Option<String>,
    pub title: Option<Vec<u8>>,
    pub summary: Option<Vec<u8>>,
    pub content: Option<Vec<u8>>,
    pub metadata: Option<String>,
    pub tags: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Complete backup data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupData {
    pub header: BackupHeader,
    pub spaces: Vec<BackupSpace>,
    pub memories: Vec<BackupMemory>,
}

/// Import strategy when restoring a backup
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ImportStrategy {
    /// Replace all existing data with backup
    Replace,
    /// Merge with existing data (keep both, skip conflicts)
    Merge,
    /// Only import items that don't exist
    Skip,
}

impl Default for ImportStrategy {
    fn default() -> Self {
        Self::Skip
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_backup_header_version() {
        let header = BackupHeader::new(5, 100);
        assert_eq!(header.version, BackupHeader::VERSION);
        assert_eq!(header.spaces_count, 5);
        assert_eq!(header.memories_count, 100);
        assert!(header.created_at > 0);
    }

    #[test]
    fn test_import_strategy_default() {
        let strategy = ImportStrategy::default();
        assert!(matches!(strategy, ImportStrategy::Skip));
    }
}
