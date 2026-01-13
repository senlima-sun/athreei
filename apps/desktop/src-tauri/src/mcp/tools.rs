//! MCP Tools implementation
//!
//! Provides the actual tool implementations for the MCP server:
//! - search_memories: Full-text search across memories
//! - get_memory: Retrieve a single memory by ID
//! - create_memory: Create a new memory
//! - update_memory: Update an existing memory
//! - list_spaces: List all available spaces

use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::encryption::VaultState;
use crate::state::DatabaseState;
use crate::storage::Memory;

/// Tool input for search_memories
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct SearchMemoriesInput {
    /// Search query string
    pub query: String,
    /// Optional space ID to filter results
    pub space_id: Option<String>,
    /// Maximum number of results (default: 10)
    pub limit: Option<usize>,
    /// Summary level to return: "title" (5-15 tokens), "brief" (30-60 tokens),
    /// "standard" (100-200 tokens), or "full" (original content). Default: "brief"
    pub summary_level: Option<String>,
    /// Search mode: "keyword" (FTS5 only), "semantic" (vector only), or "hybrid" (combined).
    /// Default: "hybrid" if embedding model is loaded, otherwise "keyword"
    pub search_mode: Option<String>,
}

/// Tool input for get_memory
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct GetMemoryInput {
    /// Memory ID to retrieve
    pub id: String,
    /// Summary level to return: "title", "brief", "standard", or "full". Default: "full"
    pub summary_level: Option<String>,
}

/// Tool input for create_memory
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct CreateMemoryInput {
    /// Title of the memory
    pub title: String,
    /// Content of the memory
    pub content: String,
    /// Optional space ID to assign to
    pub space_id: Option<String>,
    /// Optional tags
    pub tags: Option<Vec<String>>,
    /// Source identifier (default: "mcp")
    pub source: Option<String>,
}

/// Tool input for update_memory
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct UpdateMemoryInput {
    /// Memory ID to update
    pub id: String,
    /// New title (optional)
    pub title: Option<String>,
    /// New content (optional)
    pub content: Option<String>,
    /// New space ID (optional)
    pub space_id: Option<String>,
}

/// Tool input for list_spaces
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct ListSpacesInput {
    /// Include memory counts for each space
    pub include_counts: Option<bool>,
}

/// Tool input for get_relevant_context
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
pub struct GetRelevantContextInput {
    /// Query to find relevant memories for
    pub query: String,
    /// Maximum number of memories to return (default: 5)
    #[serde(default)]
    pub limit: Option<usize>,
    /// Optional space ID to filter results
    pub space_id: Option<String>,
    /// Minimum relevance score threshold (0.0-1.0, default: 0.3)
    #[serde(default)]
    pub min_relevance: Option<f64>,
    /// Include recently accessed memories (default: true)
    #[serde(default)]
    pub include_recent: Option<bool>,
    /// Output format: "markdown", "json", or "plain" (default: "markdown")
    #[serde(default)]
    pub format: Option<String>,
}

/// Decrypted memory for tool responses
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolMemory {
    pub id: String,
    pub space_id: Option<String>,
    pub source: String,
    pub title: Option<String>,
    /// User-provided summary (encrypted/decrypted)
    pub summary: Option<String>,
    /// Auto-generated summary at requested level (unencrypted)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub auto_summary: Option<String>,
    /// Content - only included when summary_level is "full"
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
    pub tags: Vec<String>,
    pub created_at: i64,
    pub updated_at: i64,
}

/// Space with optional memory count
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolSpace {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub memory_count: Option<i64>,
}

/// Search result response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub memories: Vec<ToolMemory>,
    pub total: usize,
}

/// MCP Tools handler
pub struct McpTools {
    db: Arc<DatabaseState>,
    vault: Arc<VaultState>,
}

impl McpTools {
    pub fn new(db: Arc<DatabaseState>, vault: Arc<VaultState>) -> Self {
        Self { db, vault }
    }

    /// Build AAD for memory encryption/decryption
    fn build_aad(memory_id: &str, space_id: Option<&str>) -> Vec<u8> {
        format!(
            "memory:{}|space:{}",
            memory_id,
            space_id.unwrap_or("none")
        )
        .into_bytes()
    }

    /// Decrypt a memory for tool response with summary level control
    ///
    /// - "title": Returns only auto-generated title summary (5-15 tokens)
    /// - "brief": Returns auto-generated brief summary (30-60 tokens)
    /// - "standard": Returns auto-generated standard summary (100-200 tokens)
    /// - "full": Returns full decrypted content
    fn decrypt_memory(
        &self,
        memory: &Memory,
        tags: Vec<String>,
        summary_level: Option<&str>,
    ) -> Result<ToolMemory, String> {
        use crate::summarization::SummaryLevel;

        let aad = Self::build_aad(&memory.id, memory.space_id.as_deref());
        let level = summary_level
            .and_then(SummaryLevel::from_str)
            .unwrap_or(SummaryLevel::Brief);

        // Always decrypt title for display
        let title = if let Some(encrypted) = &memory.title {
            let decrypted = self
                .vault
                .decrypt(encrypted, &aad)
                .map_err(|e| format!("Failed to decrypt title: {e}"))?;
            Some(String::from_utf8(decrypted).map_err(|e| format!("Invalid UTF-8 in title: {e}"))?)
        } else {
            None
        };

        // Decrypt user-provided summary only for "full" level
        let summary = if level == SummaryLevel::Full {
            if let Some(encrypted) = &memory.summary {
                let decrypted = self
                    .vault
                    .decrypt(encrypted, &aad)
                    .map_err(|e| format!("Failed to decrypt summary: {e}"))?;
                Some(
                    String::from_utf8(decrypted)
                        .map_err(|e| format!("Invalid UTF-8 in summary: {e}"))?,
                )
            } else {
                None
            }
        } else {
            None
        };

        // Get auto-generated summary at requested level (no decryption needed)
        let auto_summary = match level {
            SummaryLevel::Title => memory.summary_title.clone(),
            SummaryLevel::Brief => memory
                .summary_brief
                .clone()
                .or_else(|| memory.summary_standard.clone())
                .or_else(|| memory.summary_title.clone()),
            SummaryLevel::Standard => memory
                .summary_standard
                .clone()
                .or_else(|| memory.summary_brief.clone()),
            SummaryLevel::Full => None,
        };

        // Only decrypt content for "full" level
        let content = if level == SummaryLevel::Full {
            if let Some(encrypted) = &memory.content {
                let decrypted = self
                    .vault
                    .decrypt(encrypted, &aad)
                    .map_err(|e| format!("Failed to decrypt content: {e}"))?;
                Some(
                    String::from_utf8(decrypted)
                        .map_err(|e| format!("Invalid UTF-8 in content: {e}"))?,
                )
            } else {
                None
            }
        } else {
            None
        };

        Ok(ToolMemory {
            id: memory.id.clone(),
            space_id: memory.space_id.clone(),
            source: memory.source.clone(),
            title,
            summary,
            auto_summary,
            content,
            tags,
            created_at: memory.created_at,
            updated_at: memory.updated_at,
        })
    }

    /// Search memories using FTS, vector similarity, or hybrid mode
    pub fn search_memories(&self, input: SearchMemoriesInput) -> Result<SearchResult, String> {
        use crate::embedding::{get_model, search_hybrid, search_vector};

        if !self.vault.is_unlocked() {
            return Err("Vault is locked. Please unlock to access memories.".to_string());
        }

        let db_guard = self
            .db
            .db
            .lock()
            .map_err(|e| format!("Database lock error: {e}"))?;

        let limit = input.limit.unwrap_or(10);
        let summary_level = input.summary_level.as_deref();

        // Determine search mode
        let mode = input.search_mode.as_deref().unwrap_or_else(|| {
            if get_model().is_some() {
                "hybrid"
            } else {
                "keyword"
            }
        });

        let memory_ids: Vec<String> = match mode {
            "keyword" => {
                // FTS5 keyword search only
                let memories = db_guard
                    .search_memories(&input.query, input.space_id.as_deref())
                    .map_err(|e| format!("Search failed: {e}"))?;
                memories.into_iter().take(limit).map(|m| m.id).collect()
            }
            "semantic" => {
                // Vector similarity search only
                let model = get_model()
                    .ok_or_else(|| "Embedding model not loaded for semantic search".to_string())?;
                let embedding = model
                    .encode(&input.query)
                    .map_err(|e| format!("Failed to encode query: {e}"))?;
                let vec_results = search_vector(&db_guard, &embedding, limit)
                    .map_err(|e| format!("Vector search failed: {e}"))?;
                vec_results.into_iter().map(|(id, _)| id).collect()
            }
            "hybrid" | _ => {
                // Hybrid search (RRF merge of FTS5 and vector)
                let results = search_hybrid(&db_guard, &input.query, limit)
                    .map_err(|e| format!("Hybrid search failed: {e}"))?;
                results.into_iter().map(|r| r.memory_id).collect()
            }
        };

        // Fetch full memory details and apply space filter if needed
        let mut results = Vec::with_capacity(memory_ids.len());
        for memory_id in memory_ids {
            if let Some(memory) = db_guard
                .get_memory(&memory_id)
                .map_err(|e| format!("Failed to get memory: {e}"))?
            {
                // Apply space filter if specified
                if let Some(ref space_id) = input.space_id {
                    if memory.space_id.as_ref() != Some(space_id) {
                        continue;
                    }
                }

                let tags = db_guard
                    .get_tags(&memory.id)
                    .map_err(|e| format!("Failed to get tags: {e}"))?;
                results.push(self.decrypt_memory(&memory, tags, summary_level)?);
            }
        }

        let total = results.len();
        Ok(SearchResult {
            memories: results,
            total,
        })
    }

    /// Get a single memory by ID
    pub fn get_memory(&self, input: GetMemoryInput) -> Result<Option<ToolMemory>, String> {
        if !self.vault.is_unlocked() {
            return Err("Vault is locked. Please unlock to access memories.".to_string());
        }

        let db_guard = self
            .db
            .db
            .lock()
            .map_err(|e| format!("Database lock error: {e}"))?;

        let memory = db_guard
            .get_memory(&input.id)
            .map_err(|e| format!("Failed to get memory: {e}"))?;

        // Default to "full" for get_memory since caller wants complete details
        let summary_level = input.summary_level.as_deref().or(Some("full"));

        match memory {
            Some(m) => {
                let tags = db_guard
                    .get_tags(&m.id)
                    .map_err(|e| format!("Failed to get tags: {e}"))?;
                Ok(Some(self.decrypt_memory(&m, tags, summary_level)?))
            }
            None => Ok(None),
        }
    }

    /// Create a new memory
    pub fn create_memory(&self, input: CreateMemoryInput) -> Result<ToolMemory, String> {
        use crate::summarization::generate_all_summaries;

        if !self.vault.is_unlocked() {
            return Err("Vault is locked. Please unlock to create memories.".to_string());
        }

        // Generate ID first for AAD
        let memory_id = nanoid::nanoid!();
        let aad = Self::build_aad(&memory_id, input.space_id.as_deref());

        // Encrypt fields
        let encrypted_title = self
            .vault
            .encrypt(input.title.as_bytes(), &aad)
            .map_err(|e| format!("Failed to encrypt title: {e}"))?;

        let encrypted_content = self
            .vault
            .encrypt(input.content.as_bytes(), &aad)
            .map_err(|e| format!("Failed to encrypt content: {e}"))?;

        // Generate user-provided summary (first 200 chars for backwards compatibility)
        let summary_text: String = input.content.chars().take(200).collect();
        let encrypted_summary = self
            .vault
            .encrypt(summary_text.as_bytes(), &aad)
            .map_err(|e| format!("Failed to encrypt summary: {e}"))?;

        // Generate extractive summaries (unencrypted, for MCP efficiency)
        let summaries = generate_all_summaries(&input.content);

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let memory = Memory {
            id: memory_id.clone(),
            space_id: input.space_id.clone(),
            source: input.source.unwrap_or_else(|| "mcp".to_string()),
            source_id: None,
            title: Some(encrypted_title),
            summary: Some(encrypted_summary),
            content: Some(encrypted_content),
            metadata: None,
            summary_title: summaries.title.clone(),
            summary_brief: summaries.brief.clone(),
            summary_standard: summaries.standard.clone(),
            summary_version: Some(summaries.version as i32),
            content_hash: Some(summaries.content_hash),
            last_accessed_at: None,
            access_count: Some(0),
            created_at: now,
            updated_at: now,
        };

        let db_guard = self
            .db
            .db
            .lock()
            .map_err(|e| format!("Database lock error: {e}"))?;

        db_guard
            .create_memory(&memory)
            .map_err(|e| format!("Failed to create memory: {e}"))?;

        // Add tags if provided
        let tags = input.tags.clone().unwrap_or_default();
        if !tags.is_empty() {
            db_guard
                .add_tags(&memory_id, &tags)
                .map_err(|e| format!("Failed to add tags: {e}"))?;
        }

        Ok(ToolMemory {
            id: memory_id,
            space_id: input.space_id,
            source: memory.source,
            title: Some(input.title),
            summary: Some(summary_text),
            auto_summary: summaries.brief,
            content: Some(input.content),
            tags,
            created_at: now,
            updated_at: now,
        })
    }

    /// Update an existing memory
    pub fn update_memory(&self, input: UpdateMemoryInput) -> Result<ToolMemory, String> {
        use crate::summarization::{content_hash, generate_all_summaries, is_summary_stale};

        if !self.vault.is_unlocked() {
            return Err("Vault is locked. Please unlock to update memories.".to_string());
        }

        let db_guard = self
            .db
            .db
            .lock()
            .map_err(|e| format!("Database lock error: {e}"))?;

        // Get existing memory
        let existing = db_guard
            .get_memory(&input.id)
            .map_err(|e| format!("Failed to get memory: {e}"))?
            .ok_or_else(|| format!("Memory not found: {}", input.id))?;

        let tags = db_guard
            .get_tags(&input.id)
            .map_err(|e| format!("Failed to get tags: {e}"))?;

        // Decrypt existing fields
        let old_aad = Self::build_aad(&existing.id, existing.space_id.as_deref());

        let current_title = if let Some(encrypted) = &existing.title {
            let decrypted = self
                .vault
                .decrypt(encrypted, &old_aad)
                .map_err(|e| format!("Failed to decrypt title: {e}"))?;
            Some(String::from_utf8(decrypted).map_err(|e| format!("Invalid UTF-8: {e}"))?)
        } else {
            None
        };

        let current_content = if let Some(encrypted) = &existing.content {
            let decrypted = self
                .vault
                .decrypt(encrypted, &old_aad)
                .map_err(|e| format!("Failed to decrypt content: {e}"))?;
            Some(String::from_utf8(decrypted).map_err(|e| format!("Invalid UTF-8: {e}"))?)
        } else {
            None
        };

        // Determine new values
        let new_space_id = input.space_id.clone().or(existing.space_id.clone());
        let new_title = input.title.clone().or(current_title);
        let new_content = input.content.clone().or(current_content);

        // Re-encrypt with potentially new space_id
        let new_aad = Self::build_aad(&existing.id, new_space_id.as_deref());

        let encrypted_title = if let Some(title) = &new_title {
            Some(
                self.vault
                    .encrypt(title.as_bytes(), &new_aad)
                    .map_err(|e| format!("Failed to encrypt title: {e}"))?,
            )
        } else {
            None
        };

        let encrypted_content = if let Some(content) = &new_content {
            Some(
                self.vault
                    .encrypt(content.as_bytes(), &new_aad)
                    .map_err(|e| format!("Failed to encrypt content: {e}"))?,
            )
        } else {
            None
        };

        let encrypted_summary = if let Some(content) = &new_content {
            let summary_text: String = content.chars().take(200).collect();
            Some(
                self.vault
                    .encrypt(summary_text.as_bytes(), &new_aad)
                    .map_err(|e| format!("Failed to encrypt summary: {e}"))?,
            )
        } else {
            existing.summary.clone()
        };

        // Check if content changed and regenerate extractive summaries
        let (summary_title, summary_brief, summary_standard, summary_version, new_content_hash) =
            if let Some(content) = &new_content {
                let new_hash = content_hash(content);
                let is_stale = is_summary_stale(content, existing.content_hash.as_deref());

                if is_stale {
                    let summaries = generate_all_summaries(content);
                    (
                        summaries.title,
                        summaries.brief,
                        summaries.standard,
                        Some(existing.summary_version.unwrap_or(0) + 1),
                        Some(new_hash),
                    )
                } else {
                    (
                        existing.summary_title.clone(),
                        existing.summary_brief.clone(),
                        existing.summary_standard.clone(),
                        existing.summary_version,
                        Some(new_hash),
                    )
                }
            } else {
                (
                    existing.summary_title.clone(),
                    existing.summary_brief.clone(),
                    existing.summary_standard.clone(),
                    existing.summary_version,
                    existing.content_hash.clone(),
                )
            };

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let updated_memory = Memory {
            id: existing.id.clone(),
            space_id: new_space_id.clone(),
            source: existing.source.clone(),
            source_id: existing.source_id.clone(),
            title: encrypted_title,
            summary: encrypted_summary,
            content: encrypted_content,
            metadata: existing.metadata.clone(),
            summary_title: summary_title.clone(),
            summary_brief: summary_brief.clone(),
            summary_standard: summary_standard.clone(),
            summary_version,
            content_hash: new_content_hash,
            last_accessed_at: existing.last_accessed_at,
            access_count: existing.access_count,
            created_at: existing.created_at,
            updated_at: now,
        };

        db_guard
            .update_memory(&updated_memory)
            .map_err(|e| format!("Failed to update memory: {e}"))?;

        Ok(ToolMemory {
            id: existing.id,
            space_id: new_space_id,
            source: existing.source,
            title: new_title,
            summary: new_content.as_ref().map(|c| c.chars().take(200).collect()),
            auto_summary: summary_brief,
            content: new_content,
            tags,
            created_at: existing.created_at,
            updated_at: now,
        })
    }

    /// List all spaces
    pub fn list_spaces(&self, input: ListSpacesInput) -> Result<Vec<ToolSpace>, String> {
        let db_guard = self
            .db
            .db
            .lock()
            .map_err(|e| format!("Database lock error: {e}"))?;

        let spaces = db_guard
            .list_spaces()
            .map_err(|e| format!("Failed to list spaces: {e}"))?;

        let include_counts = input.include_counts.unwrap_or(false);

        let mut results = Vec::with_capacity(spaces.len());
        for space in spaces {
            let memory_count = if include_counts {
                Some(
                    db_guard
                        .count_memories(Some(&space.id))
                        .map_err(|e| format!("Failed to count memories: {e}"))?,
                )
            } else {
                None
            };

            results.push(ToolSpace {
                id: space.id,
                name: space.name,
                icon: space.icon,
                memory_count,
            });
        }

        Ok(results)
    }

    /// Get relevant context for a query using intent extraction and relevance scoring
    pub fn get_relevant_context(&self, input: GetRelevantContextInput) -> Result<String, String> {
        use crate::context::{
            compute_relevance, extract_intent, format_context, recency_decay, select_within_budget,
            ContextFormat, RelevanceScore, ScoredMemory, DEFAULT_BUDGET, DEFAULT_WEIGHTS,
        };
        use crate::embedding::search_hybrid;

        if !self.vault.is_unlocked() {
            return Err("Vault is locked. Please unlock to access memories.".to_string());
        }

        let intent = extract_intent(&input.query);
        if intent.keywords.is_empty() && intent.cleaned.is_empty() {
            return Ok(
                "No meaningful keywords found in query. Please provide more specific context."
                    .to_string(),
            );
        }

        let db_guard = self
            .db
            .db
            .lock()
            .map_err(|e| format!("Database lock error: {e}"))?;

        let limit = input.limit.unwrap_or(5);
        let min_relevance = input.min_relevance.unwrap_or(0.3);

        let search_query = if !intent.cleaned.is_empty() {
            &intent.cleaned
        } else {
            &input.query
        };

        let results = search_hybrid(&db_guard, search_query, limit * 2)
            .map_err(|e| format!("Hybrid search failed: {e}"))?;

        let mut scored_memories = Vec::new();

        for hybrid_result in results {
            if let Some(memory) = db_guard
                .get_memory(&hybrid_result.memory_id)
                .map_err(|e| format!("Failed to get memory: {e}"))?
            {
                if let Some(ref space_id) = input.space_id {
                    if memory.space_id.as_ref() != Some(space_id) {
                        continue;
                    }
                }

                let aad = Self::build_aad(&memory.id, memory.space_id.as_deref());

                let content = if let Some(encrypted) = &memory.content {
                    let decrypted = self
                        .vault
                        .decrypt(encrypted, &aad)
                        .map_err(|e| format!("Failed to decrypt content: {e}"))?;
                    String::from_utf8(decrypted)
                        .map_err(|e| format!("Invalid UTF-8 in content: {e}"))?
                } else if let Some(ref standard) = memory.summary_standard {
                    standard.clone()
                } else if let Some(ref brief) = memory.summary_brief {
                    brief.clone()
                } else {
                    continue;
                };

                let title = if let Some(encrypted) = &memory.title {
                    let decrypted = self
                        .vault
                        .decrypt(encrypted, &aad)
                        .map_err(|e| format!("Failed to decrypt title: {e}"))?;
                    Some(
                        String::from_utf8(decrypted)
                            .map_err(|e| format!("Invalid UTF-8 in title: {e}"))?,
                    )
                } else {
                    memory.summary_title.clone()
                };

                let semantic_score = (hybrid_result.score / 0.033).clamp(0.0, 1.0);
                let keyword_score = compute_keyword_match(&intent.keywords, &content);
                let recency = recency_decay(memory.updated_at, 0.1);

                let relevance_score = RelevanceScore {
                    semantic: semantic_score,
                    keyword: keyword_score,
                    recency,
                    access_freq: 0.0,
                    user_priority: 0.0,
                };

                let final_score = compute_relevance(&relevance_score, &DEFAULT_WEIGHTS);

                if final_score >= min_relevance {
                    scored_memories.push(ScoredMemory {
                        id: memory.id.clone(),
                        content,
                        title,
                        score: final_score,
                    });
                }
            }
        }

        let selected = select_within_budget(scored_memories, &DEFAULT_BUDGET);

        if selected.is_empty() {
            return Ok("No relevant memories found matching the criteria.".to_string());
        }

        let format = match input.format.as_deref().unwrap_or("markdown") {
            "json" => ContextFormat::Json,
            "plain" => ContextFormat::Plain,
            _ => ContextFormat::Markdown,
        };

        Ok(format_context(&selected, format))
    }
}

fn compute_keyword_match(keywords: &[String], content: &str) -> f64 {
    if keywords.is_empty() {
        return 0.0;
    }

    let content_lower = content.to_lowercase();
    let matched_count = keywords
        .iter()
        .filter(|k| content_lower.contains(&k.to_lowercase()))
        .count();

    (matched_count as f64 / keywords.len() as f64).clamp(0.0, 1.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::Database;
    use std::sync::Mutex;

    fn create_test_tools() -> McpTools {
        let db = Database::in_memory().unwrap();
        db.init_schema().unwrap();
        let db_state = Arc::new(DatabaseState { db: Mutex::new(db), path: std::path::PathBuf::from(":memory:") });

        let vault_state = Arc::new(VaultState::new());
        vault_state.unlock("test-passphrase").unwrap();

        McpTools::new(db_state, vault_state)
    }

    #[test]
    fn test_create_and_get_memory() {
        let tools = create_test_tools();

        let created = tools
            .create_memory(CreateMemoryInput {
                title: "Test Memory".to_string(),
                content: "This is test content".to_string(),
                space_id: None,
                tags: Some(vec!["test".to_string()]),
                source: None,
            })
            .unwrap();

        assert_eq!(created.title, Some("Test Memory".to_string()));
        assert_eq!(created.source, "mcp");

        let fetched = tools
            .get_memory(GetMemoryInput {
                id: created.id,
                summary_level: Some("full".to_string()),
            })
            .unwrap()
            .unwrap();

        assert_eq!(fetched.title, Some("Test Memory".to_string()));
        assert_eq!(fetched.tags, vec!["test".to_string()]);
    }

    #[test]
    fn test_list_spaces() {
        let tools = create_test_tools();

        let spaces = tools
            .list_spaces(ListSpacesInput {
                include_counts: Some(true),
            })
            .unwrap();

        // Empty by default
        assert!(spaces.is_empty());
    }
}
