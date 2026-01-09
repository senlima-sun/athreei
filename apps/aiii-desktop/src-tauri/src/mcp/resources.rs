//! MCP Resources implementation for aiii:// URIs
//!
//! Provides resource handlers for accessing spaces, memories, and rules
//! through the Model Context Protocol.

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use thiserror::Error;

use crate::encryption::VaultState;
use crate::state::DatabaseState;
use crate::storage::{Memory, Space};

/// Errors that can occur when handling MCP resources
#[derive(Debug, Error)]
pub enum ResourceError {
    #[error("Vault is locked")]
    VaultLocked,

    #[error("Resource not found: {0}")]
    NotFound(String),

    #[error("Invalid URI format: {0}")]
    InvalidUri(String),

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Decryption error: {0}")]
    DecryptionError(String),

    #[error("Serialization error: {0}")]
    SerializationError(String),
}

/// Parsed aiii:// URI variants
#[derive(Debug, Clone, PartialEq)]
pub enum ParsedUri {
    /// aiii://spaces - List all spaces
    Spaces,
    /// aiii://spaces/{id} - Get space details
    Space(String),
    /// aiii://spaces/{id}/memories - List memories in a space
    SpaceMemories(String),
    /// aiii://memories/{id} - Get a specific memory
    Memory(String),
    /// aiii://today - Today's memories across all spaces
    Today,
    /// aiii://rules - Auto-categorization rules
    Rules,
}

/// MCP Resource metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Resource {
    pub uri: String,
    pub name: String,
    pub description: Option<String>,
    pub mime_type: Option<String>,
}

/// MCP Resource template for dynamic URIs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceTemplate {
    pub uri_template: String,
    pub name: String,
    pub description: Option<String>,
    pub mime_type: Option<String>,
}

/// Resource contents returned from read operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResourceContents {
    pub uri: String,
    pub mime_type: Option<String>,
    pub text: Option<String>,
    pub blob: Option<Vec<u8>>,
}

// Response types for each resource

/// Space summary for list response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpaceSummary {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub memory_count: i64,
    pub last_updated: i64,
}

/// Response for aiii://spaces
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpacesResponse {
    pub spaces: Vec<SpaceSummary>,
}

/// Memory summary for list responses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemorySummary {
    pub id: String,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub created_at: i64,
}

/// Space statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpaceStats {
    pub total_memories: i64,
    pub today_count: i64,
}

/// Response for aiii://spaces/{id}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpaceResponse {
    pub space: Space,
    pub recent_memories: Vec<MemorySummary>,
    pub stats: SpaceStats,
}

/// Memory with space info for today's response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TodayMemory {
    pub id: String,
    pub space_id: Option<String>,
    pub space_name: Option<String>,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub source: String,
    pub created_at: i64,
}

/// Response for aiii://today
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TodayResponse {
    pub date: String,
    pub memories: Vec<TodayMemory>,
    pub by_space: std::collections::HashMap<String, i64>,
}

/// Full decrypted memory response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryResponse {
    pub id: String,
    pub space_id: Option<String>,
    pub source: String,
    pub source_id: Option<String>,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub content: Option<String>,
    pub metadata: Option<String>,
    pub tags: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Paginated memories response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoriesResponse {
    pub memories: Vec<MemoryResponse>,
    pub total: i64,
    pub limit: usize,
    pub offset: usize,
}

/// Categorization rule
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategorizationRule {
    pub space_id: String,
    pub space_name: String,
    pub rules: Option<serde_json::Value>,
}

/// Response for aiii://rules
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RulesResponse {
    pub rules: Vec<CategorizationRule>,
}

/// MCP Resources handler for aiii:// URIs
pub struct AiiiResources {
    db: Arc<DatabaseState>,
    vault: Arc<VaultState>,
}

impl AiiiResources {
    /// Create a new resources handler
    pub fn new(db: Arc<DatabaseState>, vault: Arc<VaultState>) -> Self {
        Self { db, vault }
    }

    /// Parse an aiii:// URI into its components
    pub fn parse_uri(uri: &str) -> Result<ParsedUri, ResourceError> {
        let uri = uri.trim();

        // Must start with aiii://
        if !uri.starts_with("aiii://") {
            return Err(ResourceError::InvalidUri(format!(
                "URI must start with aiii://, got: {uri}"
            )));
        }

        let path = &uri[7..]; // Remove "aiii://"
        let parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();

        match parts.as_slice() {
            [] => Err(ResourceError::InvalidUri("Empty URI path".to_string())),
            ["spaces"] => Ok(ParsedUri::Spaces),
            ["spaces", id] => Ok(ParsedUri::Space((*id).to_string())),
            ["spaces", id, "memories"] => Ok(ParsedUri::SpaceMemories((*id).to_string())),
            ["memories", id] => Ok(ParsedUri::Memory((*id).to_string())),
            ["today"] => Ok(ParsedUri::Today),
            ["rules"] => Ok(ParsedUri::Rules),
            _ => Err(ResourceError::InvalidUri(format!(
                "Unknown URI path: {path}"
            ))),
        }
    }

    /// List all available resources
    pub fn list_resources(&self) -> Result<Vec<Resource>, ResourceError> {
        let db_guard = self
            .db
            .db
            .lock()
            .map_err(|e| ResourceError::DatabaseError(format!("Lock error: {e}")))?;

        let spaces = db_guard
            .list_spaces()
            .map_err(|e| ResourceError::DatabaseError(e.to_string()))?;

        let mut resources = vec![
            Resource {
                uri: "aiii://spaces".into(),
                name: "All Spaces".into(),
                description: Some("List of all memory spaces".into()),
                mime_type: Some("application/json".into()),
            },
            Resource {
                uri: "aiii://today".into(),
                name: "Today's Memories".into(),
                description: Some("All memories from today".into()),
                mime_type: Some("application/json".into()),
            },
            Resource {
                uri: "aiii://rules".into(),
                name: "Categorization Rules".into(),
                description: Some("Auto-categorization rules".into()),
                mime_type: Some("application/json".into()),
            },
        ];

        // Add space-specific resources
        for space in spaces {
            resources.push(Resource {
                uri: format!("aiii://spaces/{}", space.id),
                name: format!("Space: {}", space.name),
                description: Some(format!("{} space details and recent memories", space.name)),
                mime_type: Some("application/json".into()),
            });
        }

        Ok(resources)
    }

    /// List resource templates for dynamic URIs
    pub fn list_resource_templates(&self) -> Vec<ResourceTemplate> {
        vec![
            ResourceTemplate {
                uri_template: "aiii://spaces/{space_id}".into(),
                name: "Space Details".into(),
                description: Some("Get details for a specific space".into()),
                mime_type: Some("application/json".into()),
            },
            ResourceTemplate {
                uri_template: "aiii://spaces/{space_id}/memories".into(),
                name: "Space Memories".into(),
                description: Some("List memories in a specific space".into()),
                mime_type: Some("application/json".into()),
            },
            ResourceTemplate {
                uri_template: "aiii://memories/{memory_id}".into(),
                name: "Memory Content".into(),
                description: Some("Get full content of a specific memory".into()),
                mime_type: Some("application/json".into()),
            },
        ]
    }

    /// Read a specific resource by URI
    pub fn read_resource(&self, uri: &str) -> Result<ResourceContents, ResourceError> {
        let parsed = Self::parse_uri(uri)?;

        match parsed {
            ParsedUri::Spaces => self.read_spaces(uri),
            ParsedUri::Space(id) => self.read_space(uri, &id),
            ParsedUri::SpaceMemories(id) => self.read_space_memories(uri, &id, None, None),
            ParsedUri::Memory(id) => self.read_memory(uri, &id),
            ParsedUri::Today => self.read_today(uri),
            ParsedUri::Rules => self.read_rules(uri),
        }
    }

    /// Read aiii://spaces - list all spaces with metadata
    fn read_spaces(&self, uri: &str) -> Result<ResourceContents, ResourceError> {
        let db_guard = self
            .db
            .db
            .lock()
            .map_err(|e| ResourceError::DatabaseError(format!("Lock error: {e}")))?;

        let spaces = db_guard
            .list_spaces()
            .map_err(|e| ResourceError::DatabaseError(e.to_string()))?;

        let mut space_summaries = Vec::with_capacity(spaces.len());
        for space in spaces {
            let memory_count = db_guard
                .count_memories(Some(&space.id))
                .map_err(|e| ResourceError::DatabaseError(e.to_string()))?;

            space_summaries.push(SpaceSummary {
                id: space.id,
                name: space.name,
                icon: space.icon,
                memory_count,
                last_updated: space.updated_at,
            });
        }

        let response = SpacesResponse {
            spaces: space_summaries,
        };

        let json = serde_json::to_string_pretty(&response)
            .map_err(|e| ResourceError::SerializationError(e.to_string()))?;

        Ok(ResourceContents {
            uri: uri.to_string(),
            mime_type: Some("application/json".into()),
            text: Some(json),
            blob: None,
        })
    }

    /// Read aiii://spaces/{id} - space details with recent memories
    fn read_space(&self, uri: &str, id: &str) -> Result<ResourceContents, ResourceError> {
        if !self.vault.is_unlocked() {
            return Err(ResourceError::VaultLocked);
        }

        let db_guard = self
            .db
            .db
            .lock()
            .map_err(|e| ResourceError::DatabaseError(format!("Lock error: {e}")))?;

        let space = db_guard
            .get_space(id)
            .map_err(|e| ResourceError::DatabaseError(e.to_string()))?
            .ok_or_else(|| ResourceError::NotFound(format!("Space not found: {id}")))?;

        // Get total memory count
        let total_memories = db_guard
            .count_memories(Some(id))
            .map_err(|e| ResourceError::DatabaseError(e.to_string()))?;

        // Get today's memory count
        let today_start = get_today_start_timestamp();
        let today_count = self.count_memories_since(&db_guard, Some(id), today_start)?;

        // Get recent memories (last 10)
        let memories = db_guard
            .list_memories(Some(id), 10, 0)
            .map_err(|e| ResourceError::DatabaseError(e.to_string()))?;

        let mut recent_memories = Vec::with_capacity(memories.len());
        for memory in memories {
            let decrypted = self.decrypt_memory_summary(&memory)?;
            recent_memories.push(decrypted);
        }

        let response = SpaceResponse {
            space,
            recent_memories,
            stats: SpaceStats {
                total_memories,
                today_count,
            },
        };

        let json = serde_json::to_string_pretty(&response)
            .map_err(|e| ResourceError::SerializationError(e.to_string()))?;

        Ok(ResourceContents {
            uri: uri.to_string(),
            mime_type: Some("application/json".into()),
            text: Some(json),
            blob: None,
        })
    }

    /// Read aiii://spaces/{id}/memories - paginated memory list
    pub fn read_space_memories(
        &self,
        uri: &str,
        space_id: &str,
        limit: Option<usize>,
        offset: Option<usize>,
    ) -> Result<ResourceContents, ResourceError> {
        if !self.vault.is_unlocked() {
            return Err(ResourceError::VaultLocked);
        }

        let limit = limit.unwrap_or(50);
        let offset = offset.unwrap_or(0);

        let db_guard = self
            .db
            .db
            .lock()
            .map_err(|e| ResourceError::DatabaseError(format!("Lock error: {e}")))?;

        // Verify space exists
        let _ = db_guard
            .get_space(space_id)
            .map_err(|e| ResourceError::DatabaseError(e.to_string()))?
            .ok_or_else(|| ResourceError::NotFound(format!("Space not found: {space_id}")))?;

        let total = db_guard
            .count_memories(Some(space_id))
            .map_err(|e| ResourceError::DatabaseError(e.to_string()))?;

        let memories = db_guard
            .list_memories(Some(space_id), limit, offset)
            .map_err(|e| ResourceError::DatabaseError(e.to_string()))?;

        let mut decrypted_memories = Vec::with_capacity(memories.len());
        for memory in memories {
            let tags = db_guard
                .get_tags(&memory.id)
                .map_err(|e| ResourceError::DatabaseError(e.to_string()))?;
            let decrypted = self.decrypt_memory_full(&memory, tags)?;
            decrypted_memories.push(decrypted);
        }

        let response = MemoriesResponse {
            memories: decrypted_memories,
            total,
            limit,
            offset,
        };

        let json = serde_json::to_string_pretty(&response)
            .map_err(|e| ResourceError::SerializationError(e.to_string()))?;

        Ok(ResourceContents {
            uri: uri.to_string(),
            mime_type: Some("application/json".into()),
            text: Some(json),
            blob: None,
        })
    }

    /// Read aiii://memories/{id} - full memory content
    fn read_memory(&self, uri: &str, id: &str) -> Result<ResourceContents, ResourceError> {
        if !self.vault.is_unlocked() {
            return Err(ResourceError::VaultLocked);
        }

        let db_guard = self
            .db
            .db
            .lock()
            .map_err(|e| ResourceError::DatabaseError(format!("Lock error: {e}")))?;

        let memory = db_guard
            .get_memory(id)
            .map_err(|e| ResourceError::DatabaseError(e.to_string()))?
            .ok_or_else(|| ResourceError::NotFound(format!("Memory not found: {id}")))?;

        let tags = db_guard
            .get_tags(id)
            .map_err(|e| ResourceError::DatabaseError(e.to_string()))?;

        let response = self.decrypt_memory_full(&memory, tags)?;

        let json = serde_json::to_string_pretty(&response)
            .map_err(|e| ResourceError::SerializationError(e.to_string()))?;

        Ok(ResourceContents {
            uri: uri.to_string(),
            mime_type: Some("application/json".into()),
            text: Some(json),
            blob: None,
        })
    }

    /// Read aiii://today - today's memories across all spaces
    fn read_today(&self, uri: &str) -> Result<ResourceContents, ResourceError> {
        if !self.vault.is_unlocked() {
            return Err(ResourceError::VaultLocked);
        }

        let db_guard = self
            .db
            .db
            .lock()
            .map_err(|e| ResourceError::DatabaseError(format!("Lock error: {e}")))?;

        let today_start = get_today_start_timestamp();
        let today_date = get_today_date_string();

        // Get all spaces for name lookup
        let spaces = db_guard
            .list_spaces()
            .map_err(|e| ResourceError::DatabaseError(e.to_string()))?;
        let space_map: std::collections::HashMap<String, String> = spaces
            .iter()
            .map(|s| (s.id.clone(), s.name.clone()))
            .collect();

        // Get all memories and filter by today
        // Note: In production, we'd want a more efficient query with date filtering
        let all_memories = db_guard
            .list_memories(None, 1000, 0)
            .map_err(|e| ResourceError::DatabaseError(e.to_string()))?;

        let today_memories: Vec<&Memory> = all_memories
            .iter()
            .filter(|m| m.created_at >= today_start)
            .collect();

        // Build response
        let mut memories = Vec::with_capacity(today_memories.len());
        let mut by_space: std::collections::HashMap<String, i64> = std::collections::HashMap::new();

        for memory in today_memories {
            let space_name = memory
                .space_id
                .as_ref()
                .and_then(|sid| space_map.get(sid).cloned());

            // Count by space
            let space_key = space_name.clone().unwrap_or_else(|| "Uncategorized".to_string());
            *by_space.entry(space_key).or_insert(0) += 1;

            let decrypted = self.decrypt_today_memory(memory, space_name)?;
            memories.push(decrypted);
        }

        let response = TodayResponse {
            date: today_date,
            memories,
            by_space,
        };

        let json = serde_json::to_string_pretty(&response)
            .map_err(|e| ResourceError::SerializationError(e.to_string()))?;

        Ok(ResourceContents {
            uri: uri.to_string(),
            mime_type: Some("application/json".into()),
            text: Some(json),
            blob: None,
        })
    }

    /// Read aiii://rules - auto-categorization rules
    fn read_rules(&self, uri: &str) -> Result<ResourceContents, ResourceError> {
        let db_guard = self
            .db
            .db
            .lock()
            .map_err(|e| ResourceError::DatabaseError(format!("Lock error: {e}")))?;

        let spaces = db_guard
            .list_spaces()
            .map_err(|e| ResourceError::DatabaseError(e.to_string()))?;

        let rules: Vec<CategorizationRule> = spaces
            .into_iter()
            .map(|space| {
                let rules_json = space.source_rules.as_ref().and_then(|r| {
                    serde_json::from_str(r).ok()
                });
                CategorizationRule {
                    space_id: space.id,
                    space_name: space.name,
                    rules: rules_json,
                }
            })
            .collect();

        let response = RulesResponse { rules };

        let json = serde_json::to_string_pretty(&response)
            .map_err(|e| ResourceError::SerializationError(e.to_string()))?;

        Ok(ResourceContents {
            uri: uri.to_string(),
            mime_type: Some("application/json".into()),
            text: Some(json),
            blob: None,
        })
    }

    // Helper methods for decryption

    /// Build AAD for memory encryption/decryption
    fn build_aad(memory_id: &str, space_id: Option<&str>) -> Vec<u8> {
        format!(
            "memory:{}|space:{}",
            memory_id,
            space_id.unwrap_or("none")
        )
        .into_bytes()
    }

    /// Decrypt a memory for summary display (title + summary only)
    fn decrypt_memory_summary(&self, memory: &Memory) -> Result<MemorySummary, ResourceError> {
        let aad = Self::build_aad(&memory.id, memory.space_id.as_deref());

        let title = if let Some(encrypted) = &memory.title {
            let decrypted = self
                .vault
                .decrypt(encrypted, &aad)
                .map_err(|e| ResourceError::DecryptionError(format!("Title: {e}")))?;
            Some(
                String::from_utf8(decrypted)
                    .map_err(|e| ResourceError::DecryptionError(format!("Invalid UTF-8: {e}")))?,
            )
        } else {
            None
        };

        let summary = if let Some(encrypted) = &memory.summary {
            let decrypted = self
                .vault
                .decrypt(encrypted, &aad)
                .map_err(|e| ResourceError::DecryptionError(format!("Summary: {e}")))?;
            Some(
                String::from_utf8(decrypted)
                    .map_err(|e| ResourceError::DecryptionError(format!("Invalid UTF-8: {e}")))?,
            )
        } else {
            None
        };

        Ok(MemorySummary {
            id: memory.id.clone(),
            title,
            summary,
            created_at: memory.created_at,
        })
    }

    /// Decrypt a memory for full display (all fields)
    fn decrypt_memory_full(
        &self,
        memory: &Memory,
        tags: Vec<String>,
    ) -> Result<MemoryResponse, ResourceError> {
        let aad = Self::build_aad(&memory.id, memory.space_id.as_deref());

        let title = if let Some(encrypted) = &memory.title {
            let decrypted = self
                .vault
                .decrypt(encrypted, &aad)
                .map_err(|e| ResourceError::DecryptionError(format!("Title: {e}")))?;
            Some(
                String::from_utf8(decrypted)
                    .map_err(|e| ResourceError::DecryptionError(format!("Invalid UTF-8: {e}")))?,
            )
        } else {
            None
        };

        let summary = if let Some(encrypted) = &memory.summary {
            let decrypted = self
                .vault
                .decrypt(encrypted, &aad)
                .map_err(|e| ResourceError::DecryptionError(format!("Summary: {e}")))?;
            Some(
                String::from_utf8(decrypted)
                    .map_err(|e| ResourceError::DecryptionError(format!("Invalid UTF-8: {e}")))?,
            )
        } else {
            None
        };

        let content = if let Some(encrypted) = &memory.content {
            let decrypted = self
                .vault
                .decrypt(encrypted, &aad)
                .map_err(|e| ResourceError::DecryptionError(format!("Content: {e}")))?;
            Some(
                String::from_utf8(decrypted)
                    .map_err(|e| ResourceError::DecryptionError(format!("Invalid UTF-8: {e}")))?,
            )
        } else {
            None
        };

        Ok(MemoryResponse {
            id: memory.id.clone(),
            space_id: memory.space_id.clone(),
            source: memory.source.clone(),
            source_id: memory.source_id.clone(),
            title,
            summary,
            content,
            metadata: memory.metadata.clone(),
            tags,
            created_at: memory.created_at,
            updated_at: memory.updated_at,
        })
    }

    /// Decrypt a memory for today's summary
    fn decrypt_today_memory(
        &self,
        memory: &Memory,
        space_name: Option<String>,
    ) -> Result<TodayMemory, ResourceError> {
        let aad = Self::build_aad(&memory.id, memory.space_id.as_deref());

        let title = if let Some(encrypted) = &memory.title {
            let decrypted = self
                .vault
                .decrypt(encrypted, &aad)
                .map_err(|e| ResourceError::DecryptionError(format!("Title: {e}")))?;
            Some(
                String::from_utf8(decrypted)
                    .map_err(|e| ResourceError::DecryptionError(format!("Invalid UTF-8: {e}")))?,
            )
        } else {
            None
        };

        let summary = if let Some(encrypted) = &memory.summary {
            let decrypted = self
                .vault
                .decrypt(encrypted, &aad)
                .map_err(|e| ResourceError::DecryptionError(format!("Summary: {e}")))?;
            Some(
                String::from_utf8(decrypted)
                    .map_err(|e| ResourceError::DecryptionError(format!("Invalid UTF-8: {e}")))?,
            )
        } else {
            None
        };

        Ok(TodayMemory {
            id: memory.id.clone(),
            space_id: memory.space_id.clone(),
            space_name,
            title,
            summary,
            source: memory.source.clone(),
            created_at: memory.created_at,
        })
    }

    /// Count memories since a given timestamp
    fn count_memories_since(
        &self,
        db: &std::sync::MutexGuard<'_, crate::storage::Database>,
        space_id: Option<&str>,
        since: i64,
    ) -> Result<i64, ResourceError> {
        // For now, we'll get all memories and filter
        // In production, we'd want a more efficient query
        let memories = db
            .list_memories(space_id, 10000, 0)
            .map_err(|e| ResourceError::DatabaseError(e.to_string()))?;

        Ok(memories.iter().filter(|m| m.created_at >= since).count() as i64)
    }
}

/// Get the Unix timestamp for the start of today (midnight UTC)
fn get_today_start_timestamp() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    // Round down to midnight UTC
    now - (now % 86400)
}

/// Get today's date as ISO 8601 string (YYYY-MM-DD)
fn get_today_date_string() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    // Simple calculation for date (good enough for display purposes)
    let days_since_epoch = now / 86400;
    let mut year = 1970i32;
    let mut remaining_days = days_since_epoch as i32;

    loop {
        let days_in_year = if is_leap_year(year) { 366 } else { 365 };
        if remaining_days < days_in_year {
            break;
        }
        remaining_days -= days_in_year;
        year += 1;
    }

    let mut month = 1;
    loop {
        let days_in_month = days_in_month(year, month);
        if remaining_days < days_in_month {
            break;
        }
        remaining_days -= days_in_month;
        month += 1;
    }

    let day = remaining_days + 1;

    format!("{year:04}-{month:02}-{day:02}")
}

fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

fn days_in_month(year: i32, month: i32) -> i32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if is_leap_year(year) {
                29
            } else {
                28
            }
        }
        _ => 30, // fallback
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_uri_spaces() {
        assert_eq!(AiiiResources::parse_uri("aiii://spaces").unwrap(), ParsedUri::Spaces);
    }

    #[test]
    fn test_parse_uri_space() {
        assert_eq!(
            AiiiResources::parse_uri("aiii://spaces/abc123").unwrap(),
            ParsedUri::Space("abc123".to_string())
        );
    }

    #[test]
    fn test_parse_uri_space_memories() {
        assert_eq!(
            AiiiResources::parse_uri("aiii://spaces/abc123/memories").unwrap(),
            ParsedUri::SpaceMemories("abc123".to_string())
        );
    }

    #[test]
    fn test_parse_uri_memory() {
        assert_eq!(
            AiiiResources::parse_uri("aiii://memories/mem456").unwrap(),
            ParsedUri::Memory("mem456".to_string())
        );
    }

    #[test]
    fn test_parse_uri_today() {
        assert_eq!(AiiiResources::parse_uri("aiii://today").unwrap(), ParsedUri::Today);
    }

    #[test]
    fn test_parse_uri_rules() {
        assert_eq!(AiiiResources::parse_uri("aiii://rules").unwrap(), ParsedUri::Rules);
    }

    #[test]
    fn test_parse_uri_invalid_scheme() {
        let result = AiiiResources::parse_uri("http://spaces");
        assert!(matches!(result, Err(ResourceError::InvalidUri(_))));
    }

    #[test]
    fn test_parse_uri_invalid_path() {
        let result = AiiiResources::parse_uri("aiii://invalid/path/here");
        assert!(matches!(result, Err(ResourceError::InvalidUri(_))));
    }

    #[test]
    fn test_parse_uri_empty_path() {
        let result = AiiiResources::parse_uri("aiii://");
        assert!(matches!(result, Err(ResourceError::InvalidUri(_))));
    }

    #[test]
    fn test_build_aad() {
        let aad = AiiiResources::build_aad("mem123", Some("space456"));
        assert_eq!(aad, b"memory:mem123|space:space456".to_vec());

        let aad_none = AiiiResources::build_aad("mem123", None);
        assert_eq!(aad_none, b"memory:mem123|space:none".to_vec());
    }

    #[test]
    fn test_get_today_date_string() {
        let date = get_today_date_string();
        // Should be in YYYY-MM-DD format
        assert_eq!(date.len(), 10);
        assert_eq!(&date[4..5], "-");
        assert_eq!(&date[7..8], "-");
    }

    #[test]
    fn test_is_leap_year() {
        assert!(is_leap_year(2024));
        assert!(!is_leap_year(2023));
        assert!(is_leap_year(2000));
        assert!(!is_leap_year(1900));
    }

    #[test]
    fn test_list_resource_templates() {
        use crate::storage::Database;
        use std::sync::Mutex;

        let db = Database::in_memory().unwrap();
        db.init_schema().unwrap();
        let db_state = Arc::new(DatabaseState { db: Mutex::new(db), path: std::path::PathBuf::from(":memory:") });
        let vault_state = Arc::new(VaultState::new());

        let resources = AiiiResources::new(db_state, vault_state);
        let templates = resources.list_resource_templates();

        assert_eq!(templates.len(), 3);
        assert!(templates.iter().any(|t| t.uri_template.contains("space_id")));
        assert!(templates.iter().any(|t| t.uri_template.contains("memory_id")));
    }
}
