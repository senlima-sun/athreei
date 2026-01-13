//! Memory-related Tauri commands
//!
//! Provides CRUD operations for memories with encryption support.
//! All encrypted fields are decrypted before being sent to the frontend.

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

use crate::encryption::VaultState;
use crate::state::DatabaseState;
use crate::storage::Memory;

/// A decrypted memory ready for frontend consumption
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecryptedMemory {
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

/// Input for creating a new memory from the frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMemoryInput {
    pub space_id: Option<String>,
    pub source: String,
    pub source_id: Option<String>,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub content: Option<String>,
    pub metadata: Option<String>,
    pub tags: Option<Vec<String>>,
}

/// Build AAD (Additional Authenticated Data) for memory encryption
fn build_aad(memory_id: &str, space_id: Option<&str>) -> Vec<u8> {
    format!("memory:{}|space:{}", memory_id, space_id.unwrap_or("none")).into_bytes()
}

/// Decrypt a memory for frontend consumption
fn decrypt_memory(
    memory: &Memory,
    tags: Vec<String>,
    vault: &VaultState,
) -> Result<DecryptedMemory, String> {
    let aad = build_aad(&memory.id, memory.space_id.as_deref());

    let title = if let Some(encrypted) = &memory.title {
        let decrypted = vault
            .decrypt(encrypted, &aad)
            .map_err(|e| format!("Failed to decrypt title: {e}"))?;
        Some(String::from_utf8(decrypted).map_err(|e| format!("Invalid UTF-8 in title: {e}"))?)
    } else {
        None
    };

    let summary = if let Some(encrypted) = &memory.summary {
        let decrypted = vault
            .decrypt(encrypted, &aad)
            .map_err(|e| format!("Failed to decrypt summary: {e}"))?;
        Some(String::from_utf8(decrypted).map_err(|e| format!("Invalid UTF-8 in summary: {e}"))?)
    } else {
        None
    };

    let content = if let Some(encrypted) = &memory.content {
        let decrypted = vault
            .decrypt(encrypted, &aad)
            .map_err(|e| format!("Failed to decrypt content: {e}"))?;
        Some(String::from_utf8(decrypted).map_err(|e| format!("Invalid UTF-8 in content: {e}"))?)
    } else {
        None
    };

    Ok(DecryptedMemory {
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

/// List memories with optional space filter and pagination
#[tauri::command]
pub async fn list_memories(
    space_id: Option<String>,
    limit: Option<usize>,
    offset: Option<usize>,
    db: State<'_, Arc<DatabaseState>>,
    vault: State<'_, Arc<VaultState>>,
) -> Result<Vec<DecryptedMemory>, String> {
    if !vault.is_unlocked() {
        return Err("Vault is locked".to_string());
    }

    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let memories = db_guard
        .list_memories(
            space_id.as_deref(),
            limit.unwrap_or(50),
            offset.unwrap_or(0),
        )
        .map_err(|e| format!("Failed to list memories: {e}"))?;

    let mut decrypted_memories = Vec::with_capacity(memories.len());
    for memory in memories {
        let tags = db_guard
            .get_tags(&memory.id)
            .map_err(|e| format!("Failed to get tags: {e}"))?;
        decrypted_memories.push(decrypt_memory(&memory, tags, &vault)?);
    }

    Ok(decrypted_memories)
}

/// Get a single memory by ID
#[tauri::command]
pub async fn get_memory(
    id: String,
    db: State<'_, Arc<DatabaseState>>,
    vault: State<'_, Arc<VaultState>>,
) -> Result<Option<DecryptedMemory>, String> {
    if !vault.is_unlocked() {
        return Err("Vault is locked".to_string());
    }

    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let memory = db_guard
        .get_memory(&id)
        .map_err(|e| format!("Failed to get memory: {e}"))?;

    match memory {
        Some(m) => {
            let tags = db_guard
                .get_tags(&m.id)
                .map_err(|e| format!("Failed to get tags: {e}"))?;
            Ok(Some(decrypt_memory(&m, tags, &vault)?))
        }
        None => Ok(None),
    }
}

/// Create a new memory with encryption
#[tauri::command]
pub async fn create_memory(
    input: CreateMemoryInput,
    db: State<'_, Arc<DatabaseState>>,
    vault: State<'_, Arc<VaultState>>,
) -> Result<DecryptedMemory, String> {
    if !vault.is_unlocked() {
        return Err("Vault is locked".to_string());
    }

    // Generate a new ID first so we can use it for AAD
    let memory_id = nanoid::nanoid!();
    let aad = build_aad(&memory_id, input.space_id.as_deref());

    // Encrypt optional fields
    let encrypted_title = if let Some(title) = &input.title {
        Some(
            vault
                .encrypt(title.as_bytes(), &aad)
                .map_err(|e| format!("Failed to encrypt title: {e}"))?,
        )
    } else {
        None
    };

    let encrypted_summary = if let Some(summary) = &input.summary {
        Some(
            vault
                .encrypt(summary.as_bytes(), &aad)
                .map_err(|e| format!("Failed to encrypt summary: {e}"))?,
        )
    } else {
        None
    };

    let encrypted_content = if let Some(content) = &input.content {
        Some(
            vault
                .encrypt(content.as_bytes(), &aad)
                .map_err(|e| format!("Failed to encrypt content: {e}"))?,
        )
    } else {
        None
    };

    // Create the memory struct with pre-generated ID
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let memory = Memory {
        id: memory_id,
        space_id: input.space_id.clone(),
        source: input.source.clone(),
        source_id: input.source_id.clone(),
        title: encrypted_title,
        summary: encrypted_summary,
        content: encrypted_content,
        metadata: input.metadata.clone(),
        summary_title: None,
        summary_brief: None,
        summary_standard: None,
        summary_version: Some(0),
        content_hash: None,
        last_accessed_at: None,
        access_count: Some(0),
        created_at: now,
        updated_at: now,
    };

    let db_guard = db
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
            .add_tags(&memory.id, &tags)
            .map_err(|e| format!("Failed to add tags: {e}"))?;
    }

    // Return the decrypted version
    Ok(DecryptedMemory {
        id: memory.id,
        space_id: input.space_id,
        source: input.source,
        source_id: input.source_id,
        title: input.title,
        summary: input.summary,
        content: input.content,
        metadata: input.metadata,
        tags,
        created_at: memory.created_at,
        updated_at: memory.updated_at,
    })
}

/// Search memories using full-text search
#[tauri::command]
pub async fn search_memories(
    query: String,
    space_id: Option<String>,
    db: State<'_, Arc<DatabaseState>>,
    vault: State<'_, Arc<VaultState>>,
) -> Result<Vec<DecryptedMemory>, String> {
    if !vault.is_unlocked() {
        return Err("Vault is locked".to_string());
    }

    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let memories = db_guard
        .search_memories(&query, space_id.as_deref())
        .map_err(|e| format!("Failed to search memories: {e}"))?;

    let mut decrypted_memories = Vec::with_capacity(memories.len());
    for memory in memories {
        let tags = db_guard
            .get_tags(&memory.id)
            .map_err(|e| format!("Failed to get tags: {e}"))?;
        decrypted_memories.push(decrypt_memory(&memory, tags, &vault)?);
    }

    Ok(decrypted_memories)
}

/// Delete a memory by ID
#[tauri::command]
pub async fn delete_memory(id: String, db: State<'_, Arc<DatabaseState>>) -> Result<(), String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    db_guard
        .delete_memory(&id)
        .map_err(|e| format!("Failed to delete memory: {e}"))
}

/// Update memory tags
#[tauri::command]
pub async fn update_memory_tags(
    id: String,
    tags: Vec<String>,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<(), String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    // Get current tags
    let current_tags = db_guard
        .get_tags(&id)
        .map_err(|e| format!("Failed to get current tags: {e}"))?;

    // Remove tags that are no longer present
    for tag in &current_tags {
        if !tags.contains(tag) {
            db_guard
                .remove_tag(&id, tag)
                .map_err(|e| format!("Failed to remove tag: {e}"))?;
        }
    }

    // Add new tags
    let new_tags: Vec<String> = tags
        .into_iter()
        .filter(|t| !current_tags.contains(t))
        .collect();
    if !new_tags.is_empty() {
        db_guard
            .add_tags(&id, &new_tags)
            .map_err(|e| format!("Failed to add tags: {e}"))?;
    }

    Ok(())
}

/// Get all tags with usage counts
#[tauri::command]
pub async fn list_tags(db: State<'_, Arc<DatabaseState>>) -> Result<Vec<(String, i64)>, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    db_guard
        .list_tags_with_counts()
        .map_err(|e| format!("Failed to list tags: {e}"))
}

/// Count all memories
#[tauri::command]
pub async fn count_memories(
    space_id: Option<String>,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<i64, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    db_guard
        .count_memories(space_id.as_deref())
        .map_err(|e| format!("Failed to count memories: {e}"))
}

/// Get the oldest memory timestamp
#[tauri::command]
pub async fn get_oldest_memory_date(
    space_id: Option<String>,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<Option<i64>, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    db_guard
        .get_oldest_memory_date(space_id.as_deref())
        .map_err(|e| format!("Failed to get oldest memory date: {e}"))
}

/// List memories for a specific date
#[tauri::command]
pub async fn list_memories_by_date(
    start_timestamp: i64,
    end_timestamp: i64,
    space_id: Option<String>,
    limit: Option<usize>,
    offset: Option<usize>,
    db: State<'_, Arc<DatabaseState>>,
    vault: State<'_, Arc<VaultState>>,
) -> Result<Vec<DecryptedMemory>, String> {
    if !vault.is_unlocked() {
        return Err("Vault is locked".to_string());
    }

    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let memories = db_guard
        .list_memories_by_date(
            start_timestamp,
            end_timestamp,
            space_id.as_deref(),
            limit.unwrap_or(50),
            offset.unwrap_or(0),
        )
        .map_err(|e| format!("Failed to list memories: {e}"))?;

    let mut decrypted_memories = Vec::with_capacity(memories.len());
    for memory in memories {
        let tags = db_guard
            .get_tags(&memory.id)
            .map_err(|e| format!("Failed to get tags: {e}"))?;
        decrypted_memories.push(decrypt_memory(&memory, tags, &vault)?);
    }

    Ok(decrypted_memories)
}

/// Count memories for a specific date range
#[tauri::command]
pub async fn count_memories_by_date(
    start_timestamp: i64,
    end_timestamp: i64,
    space_id: Option<String>,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<i64, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    db_guard
        .count_memories_by_date(start_timestamp, end_timestamp, space_id.as_deref())
        .map_err(|e| format!("Failed to count memories: {e}"))
}


/// Delete multiple memories by ID
#[tauri::command]
pub async fn delete_memories(ids: Vec<String>, db: State<'_, Arc<DatabaseState>>) -> Result<usize, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let mut deleted_count = 0;
    for id in &ids {
        if db_guard.delete_memory(id).is_ok() {
            deleted_count += 1;
        }
    }

    Ok(deleted_count)
}

/// Move multiple memories to a different space
#[tauri::command]
pub async fn move_memories(
    ids: Vec<String>,
    target_space_id: Option<String>,
    db: State<'_, Arc<DatabaseState>>,
    vault: State<'_, Arc<VaultState>>,
) -> Result<usize, String> {
    if !vault.is_unlocked() {
        return Err("Vault is locked".to_string());
    }

    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let mut moved_count = 0;
    for id in &ids {
        if let Ok(Some(mut memory)) = db_guard.get_memory(id) {
            memory.space_id = target_space_id.clone();
            if db_guard.update_memory(&memory).is_ok() {
                moved_count += 1;
            }
        }
    }

    Ok(moved_count)
}

/// Add tags to multiple memories
#[tauri::command]
pub async fn tag_memories(
    ids: Vec<String>,
    tags: Vec<String>,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<usize, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let mut tagged_count = 0;
    for id in &ids {
        if db_guard.add_tags(id, &tags).is_ok() {
            tagged_count += 1;
        }
    }

    Ok(tagged_count)
}

/// Remove tags from multiple memories
#[tauri::command]
pub async fn untag_memories(
    ids: Vec<String>,
    tags: Vec<String>,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<usize, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let mut untagged_count = 0;
    for id in &ids {
        let mut success = true;
        for tag in &tags {
            if db_guard.remove_tag(id, tag).is_err() {
                success = false;
            }
        }
        if success {
            untagged_count += 1;
        }
    }

    Ok(untagged_count)
}

/// Input for updating a memory
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMemoryInput {
    pub id: String,
    pub space_id: Option<Option<String>>,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub content: Option<String>,
    pub metadata: Option<String>,
}

/// Update an existing memory
#[tauri::command]
pub async fn update_memory(
    input: UpdateMemoryInput,
    db: State<'_, Arc<DatabaseState>>,
    vault: State<'_, Arc<VaultState>>,
) -> Result<DecryptedMemory, String> {
    if !vault.is_unlocked() {
        return Err("Vault is locked".to_string());
    }

    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    // Get existing memory
    let mut memory = db_guard
        .get_memory(&input.id)
        .map_err(|e| format!("Failed to get memory: {e}"))?
        .ok_or("Memory not found")?;

    let aad = build_aad(&memory.id, memory.space_id.as_deref());

    // Update fields if provided
    if let Some(space_id_opt) = input.space_id {
        memory.space_id = space_id_opt;
    }

    if let Some(title) = &input.title {
        memory.title = Some(
            vault
                .encrypt(title.as_bytes(), &aad)
                .map_err(|e| format!("Failed to encrypt title: {e}"))?,
        );
    }

    if let Some(summary) = &input.summary {
        memory.summary = Some(
            vault
                .encrypt(summary.as_bytes(), &aad)
                .map_err(|e| format!("Failed to encrypt summary: {e}"))?,
        );
    }

    if let Some(content) = &input.content {
        memory.content = Some(
            vault
                .encrypt(content.as_bytes(), &aad)
                .map_err(|e| format!("Failed to encrypt content: {e}"))?,
        );
    }

    if let Some(metadata) = &input.metadata {
        memory.metadata = Some(metadata.clone());
    }

    // Update in database
    db_guard
        .update_memory(&memory)
        .map_err(|e| format!("Failed to update memory: {e}"))?;

    // Get tags and return decrypted
    let tags = db_guard
        .get_tags(&memory.id)
        .map_err(|e| format!("Failed to get tags: {e}"))?;

    decrypt_memory(&memory, tags, &vault)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::Database;
    use std::sync::Mutex;

    fn create_test_setup() -> (DatabaseState, VaultState) {
        let db = Database::in_memory().unwrap();
        db.init_schema().unwrap();
        let db_state = DatabaseState {
            db: Mutex::new(db),
            path: std::path::PathBuf::from(":memory:"),
        };

        let vault_state = VaultState::new();
        vault_state.unlock("test-passphrase").unwrap();

        (db_state, vault_state)
    }

    #[test]
    fn test_build_aad() {
        let aad = build_aad("mem123", Some("space456"));
        assert_eq!(aad, b"memory:mem123|space:space456".to_vec());

        let aad_no_space = build_aad("mem123", None);
        assert_eq!(aad_no_space, b"memory:mem123|space:none".to_vec());
    }

    #[test]
    fn test_encrypt_decrypt_memory() {
        let (db_state, vault_state) = create_test_setup();

        // Create encrypted memory
        let memory_id = nanoid::nanoid!();
        let aad = build_aad(&memory_id, None);

        let encrypted_title = vault_state.encrypt(b"Test Title", &aad).unwrap();
        let encrypted_content = vault_state.encrypt(b"Test Content", &aad).unwrap();

        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let memory = Memory {
            id: memory_id,
            space_id: None,
            source: "test".to_string(),
            source_id: None,
            title: Some(encrypted_title),
            summary: None,
            content: Some(encrypted_content),
            metadata: None,
            summary_title: None,
            summary_brief: None,
            summary_standard: None,
            summary_version: Some(0),
            content_hash: None,
            last_accessed_at: None,
            access_count: Some(0),
            created_at: now,
            updated_at: now,
        };

        // Store in DB
        {
            let db_guard = db_state.db.lock().unwrap();
            db_guard.create_memory(&memory).unwrap();
        }

        // Decrypt and verify
        let decrypted = decrypt_memory(&memory, vec![], &vault_state).unwrap();
        assert_eq!(decrypted.title, Some("Test Title".to_string()));
        assert_eq!(decrypted.content, Some("Test Content".to_string()));
        assert_eq!(decrypted.summary, None);
    }
}
