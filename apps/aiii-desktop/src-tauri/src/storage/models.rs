//! Data models for storage layer
//!
//! These structs represent the core entities stored in the database.

use serde::{Deserialize, Serialize};

/// A space represents a collection of memories with optional source rules.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Space {
    /// Unique identifier (nanoid)
    pub id: String,
    /// Display name of the space
    pub name: String,
    /// Optional icon identifier or emoji
    pub icon: Option<String>,
    /// JSON rules for automatic memory categorization
    pub source_rules: Option<String>,
    /// Unix timestamp of creation
    pub created_at: i64,
    /// Unix timestamp of last update
    pub updated_at: i64,
}

impl Space {
    /// Create a new space with generated ID and timestamps
    pub fn new(name: String, icon: Option<String>, source_rules: Option<String>) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        Self {
            id: nanoid::nanoid!(),
            name,
            icon,
            source_rules,
            created_at: now,
            updated_at: now,
        }
    }
}

/// A memory represents a piece of information captured from various sources.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Memory {
    /// Unique identifier (nanoid)
    pub id: String,
    /// Optional space this memory belongs to
    pub space_id: Option<String>,
    /// Source type (e.g., "browser", "clipboard", "manual")
    pub source: String,
    /// Source-specific identifier (e.g., URL, app name)
    pub source_id: Option<String>,
    /// Encrypted title
    pub title: Option<Vec<u8>>,
    /// Encrypted summary
    pub summary: Option<Vec<u8>>,
    /// Encrypted content
    pub content: Option<Vec<u8>>,
    /// JSON metadata (unencrypted, used for FTS)
    pub metadata: Option<String>,
    /// Unix timestamp of creation
    pub created_at: i64,
    /// Unix timestamp of last update
    pub updated_at: i64,
}

impl Memory {
    /// Create a new memory with generated ID and timestamps
    pub fn new(
        space_id: Option<String>,
        source: String,
        source_id: Option<String>,
        title: Option<Vec<u8>>,
        summary: Option<Vec<u8>>,
        content: Option<Vec<u8>>,
        metadata: Option<String>,
    ) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        Self {
            id: nanoid::nanoid!(),
            space_id,
            source,
            source_id,
            title,
            summary,
            content,
            metadata,
            created_at: now,
            updated_at: now,
        }
    }
}

/// A memory with its associated tags
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryWithTags {
    /// The memory data
    #[serde(flatten)]
    pub memory: Memory,
    /// Associated tags
    pub tags: Vec<String>,
}

/// A tag for categorizing memories
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tag {
    /// Unique identifier (nanoid)
    pub id: String,
    /// Tag name
    pub name: String,
}

impl Tag {
    /// Create a new tag with generated ID
    pub fn new(name: String) -> Self {
        Self {
            id: nanoid::nanoid!(),
            name,
        }
    }
}

/// Input for creating a new space
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSpaceInput {
    pub name: String,
    pub icon: Option<String>,
    pub source_rules: Option<String>,
}

/// Input for updating a space
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSpaceInput {
    pub name: Option<String>,
    pub icon: Option<String>,
    pub source_rules: Option<String>,
}

/// Input for creating a new memory
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMemoryInput {
    pub space_id: Option<String>,
    pub source: String,
    pub source_id: Option<String>,
    pub title: Option<Vec<u8>>,
    pub summary: Option<Vec<u8>>,
    pub content: Option<Vec<u8>>,
    pub metadata: Option<String>,
    pub tags: Option<Vec<String>>,
}

/// Input for updating a memory
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMemoryInput {
    pub space_id: Option<String>,
    pub title: Option<Vec<u8>>,
    pub summary: Option<Vec<u8>>,
    pub content: Option<Vec<u8>>,
    pub metadata: Option<String>,
}
