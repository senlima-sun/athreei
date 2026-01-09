//! Repository methods for database CRUD operations
//!
//! Provides type-safe methods for interacting with spaces, memories, and tags.

use super::db::Database;
use super::models::{Memory, MemoryWithTags, Space, Tag};
use rusqlite::{params, Result, Row};

/// Helper to get current Unix timestamp
fn now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

/// Map a database row to a Space
fn row_to_space(row: &Row) -> Result<Space> {
    Ok(Space {
        id: row.get(0)?,
        name: row.get(1)?,
        icon: row.get(2)?,
        source_rules: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

/// Map a database row to a Memory
fn row_to_memory(row: &Row) -> Result<Memory> {
    Ok(Memory {
        id: row.get(0)?,
        space_id: row.get(1)?,
        source: row.get(2)?,
        source_id: row.get(3)?,
        title: row.get(4)?,
        summary: row.get(5)?,
        content: row.get(6)?,
        metadata: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

impl Database {
    // ==================== Space Operations ====================

    /// Create a new space
    pub fn create_space(&self, space: &Space) -> Result<()> {
        self.connection().execute(
            "INSERT INTO spaces (id, name, icon, source_rules, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                space.id,
                space.name,
                space.icon,
                space.source_rules,
                space.created_at,
                space.updated_at,
            ],
        )?;
        Ok(())
    }

    /// Get a space by ID
    pub fn get_space(&self, id: &str) -> Result<Option<Space>> {
        let mut stmt = self.connection().prepare(
            "SELECT id, name, icon, source_rules, created_at, updated_at
             FROM spaces WHERE id = ?1",
        )?;

        let mut rows = stmt.query(params![id])?;

        match rows.next()? {
            Some(row) => Ok(Some(row_to_space(row)?)),
            None => Ok(None),
        }
    }

    /// List all spaces ordered by name
    pub fn list_spaces(&self) -> Result<Vec<Space>> {
        let mut stmt = self.connection().prepare(
            "SELECT id, name, icon, source_rules, created_at, updated_at
             FROM spaces ORDER BY name ASC",
        )?;

        let rows = stmt.query_map([], |row| row_to_space(row))?;

        rows.collect()
    }

    /// Update a space
    pub fn update_space(&self, space: &Space) -> Result<()> {
        self.connection().execute(
            "UPDATE spaces SET name = ?2, icon = ?3, source_rules = ?4, updated_at = ?5
             WHERE id = ?1",
            params![space.id, space.name, space.icon, space.source_rules, now(),],
        )?;
        Ok(())
    }

    /// Delete a space by ID
    pub fn delete_space(&self, id: &str) -> Result<()> {
        self.connection()
            .execute("DELETE FROM spaces WHERE id = ?1", params![id])?;
        Ok(())
    }

    // ==================== Memory Operations ====================

    /// Create a new memory
    pub fn create_memory(&self, memory: &Memory) -> Result<()> {
        self.connection().execute(
            "INSERT INTO memories (id, space_id, source, source_id, title, summary, content, metadata, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                memory.id,
                memory.space_id,
                memory.source,
                memory.source_id,
                memory.title,
                memory.summary,
                memory.content,
                memory.metadata,
                memory.created_at,
                memory.updated_at,
            ],
        )?;
        Ok(())
    }

    /// Get a memory by ID
    pub fn get_memory(&self, id: &str) -> Result<Option<Memory>> {
        let mut stmt = self.connection().prepare(
            "SELECT id, space_id, source, source_id, title, summary, content, metadata, created_at, updated_at
             FROM memories WHERE id = ?1",
        )?;

        let mut rows = stmt.query(params![id])?;

        match rows.next()? {
            Some(row) => Ok(Some(row_to_memory(row)?)),
            None => Ok(None),
        }
    }

    /// List memories with optional space filter and pagination
    pub fn list_memories(
        &self,
        space_id: Option<&str>,
        limit: usize,
        offset: usize,
    ) -> Result<Vec<Memory>> {
        let (sql, params_vec): (&str, Vec<Box<dyn rusqlite::ToSql>>) = match space_id {
            Some(sid) => (
                "SELECT id, space_id, source, source_id, title, summary, content, metadata, created_at, updated_at
                 FROM memories WHERE space_id = ?1
                 ORDER BY created_at DESC LIMIT ?2 OFFSET ?3",
                vec![
                    Box::new(sid.to_string()),
                    Box::new(limit as i64),
                    Box::new(offset as i64),
                ],
            ),
            None => (
                "SELECT id, space_id, source, source_id, title, summary, content, metadata, created_at, updated_at
                 FROM memories
                 ORDER BY created_at DESC LIMIT ?1 OFFSET ?2",
                vec![Box::new(limit as i64), Box::new(offset as i64)],
            ),
        };

        let mut stmt = self.connection().prepare(sql)?;
        let params_refs: Vec<&dyn rusqlite::ToSql> =
            params_vec.iter().map(|p| p.as_ref()).collect();
        let rows = stmt.query_map(params_refs.as_slice(), |row| row_to_memory(row))?;

        rows.collect()
    }

    /// Search memories using FTS5 full-text search
    ///
    /// Searches across source, source_id, metadata, and tags.
    /// Supports prefix matching (e.g., "rust" matches "Rust", "rust-lang", etc.)
    pub fn search_memories(&self, query: &str, space_id: Option<&str>) -> Result<Vec<Memory>> {
        // Clean and prepare the query for FTS5
        // Use * for prefix matching on each word
        let fts_query = query
            .split_whitespace()
            .filter(|w| !w.is_empty())
            .map(|word| {
                // Remove special FTS characters and wrap in quotes for exact term matching
                let clean = word
                    .replace('"', "")
                    .replace('\'', "")
                    .replace('*', "")
                    .replace(':', "");
                format!("{}*", clean)
            })
            .collect::<Vec<_>>()
            .join(" OR ");

        if fts_query.is_empty() {
            return Ok(vec![]);
        }

        let (sql, params_vec): (&str, Vec<Box<dyn rusqlite::ToSql>>) = match space_id {
            Some(sid) => (
                "SELECT m.id, m.space_id, m.source, m.source_id, m.title, m.summary, m.content, m.metadata, m.created_at, m.updated_at
                 FROM memories m
                 JOIN memories_fts fts ON m.id = fts.memory_id
                 WHERE memories_fts MATCH ?1 AND m.space_id = ?2
                 ORDER BY rank",
                vec![Box::new(fts_query), Box::new(sid.to_string())],
            ),
            None => (
                "SELECT m.id, m.space_id, m.source, m.source_id, m.title, m.summary, m.content, m.metadata, m.created_at, m.updated_at
                 FROM memories m
                 JOIN memories_fts fts ON m.id = fts.memory_id
                 WHERE memories_fts MATCH ?1
                 ORDER BY rank",
                vec![Box::new(fts_query)],
            ),
        };

        let mut stmt = self.connection().prepare(sql)?;
        let params_refs: Vec<&dyn rusqlite::ToSql> =
            params_vec.iter().map(|p| p.as_ref()).collect();
        let rows = stmt.query_map(params_refs.as_slice(), |row| row_to_memory(row))?;

        rows.collect()
    }

    /// Update a memory
    pub fn update_memory(&self, memory: &Memory) -> Result<()> {
        self.connection().execute(
            "UPDATE memories SET space_id = ?2, source = ?3, source_id = ?4, title = ?5,
             summary = ?6, content = ?7, metadata = ?8, updated_at = ?9
             WHERE id = ?1",
            params![
                memory.id,
                memory.space_id,
                memory.source,
                memory.source_id,
                memory.title,
                memory.summary,
                memory.content,
                memory.metadata,
                now(),
            ],
        )?;
        Ok(())
    }

    /// Delete a memory by ID
    pub fn delete_memory(&self, id: &str) -> Result<()> {
        self.connection()
            .execute("DELETE FROM memories WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// Get a memory with its tags
    pub fn get_memory_with_tags(&self, id: &str) -> Result<Option<MemoryWithTags>> {
        let memory = self.get_memory(id)?;
        match memory {
            Some(m) => {
                let tags = self.get_tags(&m.id)?;
                Ok(Some(MemoryWithTags { memory: m, tags }))
            }
            None => Ok(None),
        }
    }

    // ==================== Tag Operations ====================

    /// Get or create a tag by name
    fn get_or_create_tag(&self, name: &str) -> Result<Tag> {
        // Try to find existing tag
        let mut stmt = self
            .connection()
            .prepare("SELECT id, name FROM tags WHERE name = ?1")?;

        let tag = stmt.query_row(params![name], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
            })
        });

        match tag {
            Ok(t) => Ok(t),
            Err(rusqlite::Error::QueryReturnedNoRows) => {
                // Create new tag
                let new_tag = Tag::new(name.to_string());
                self.connection().execute(
                    "INSERT INTO tags (id, name) VALUES (?1, ?2)",
                    params![new_tag.id, new_tag.name],
                )?;
                Ok(new_tag)
            }
            Err(e) => Err(e),
        }
    }

    /// Add tags to a memory
    pub fn add_tags(&self, memory_id: &str, tags: &[String]) -> Result<()> {
        for tag_name in tags {
            let tag = self.get_or_create_tag(tag_name)?;
            // Use INSERT OR IGNORE for idempotent adds
            self.connection().execute(
                "INSERT OR IGNORE INTO memory_tags (memory_id, tag_id) VALUES (?1, ?2)",
                params![memory_id, tag.id],
            )?;
        }

        // Update FTS with new tags
        self.update_fts_tags(memory_id)?;

        Ok(())
    }

    /// Get all tags for a memory
    pub fn get_tags(&self, memory_id: &str) -> Result<Vec<String>> {
        let mut stmt = self.connection().prepare(
            "SELECT t.name FROM tags t
             JOIN memory_tags mt ON t.id = mt.tag_id
             WHERE mt.memory_id = ?1
             ORDER BY t.name",
        )?;

        let rows = stmt.query_map(params![memory_id], |row| row.get(0))?;

        rows.collect()
    }

    /// Remove a tag from a memory
    pub fn remove_tag(&self, memory_id: &str, tag_name: &str) -> Result<()> {
        self.connection().execute(
            "DELETE FROM memory_tags
             WHERE memory_id = ?1 AND tag_id = (SELECT id FROM tags WHERE name = ?2)",
            params![memory_id, tag_name],
        )?;

        // Update FTS with removed tag
        self.update_fts_tags(memory_id)?;

        Ok(())
    }

    /// Update FTS index with current tags for a memory
    fn update_fts_tags(&self, memory_id: &str) -> Result<()> {
        let tags = self.get_tags(memory_id)?;
        let tags_str = tags.join(" ");

        // Get current memory data
        let mut stmt = self
            .connection()
            .prepare("SELECT source, source_id, metadata FROM memories WHERE id = ?1")?;

        let result = stmt.query_row(params![memory_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, Option<String>>(2)?,
            ))
        });

        if let Ok((source, source_id, metadata)) = result {
            // Delete old FTS entry
            self.connection().execute(
                "DELETE FROM memories_fts WHERE memory_id = ?1",
                params![memory_id],
            )?;

            // Insert updated FTS entry
            self.connection().execute(
                "INSERT INTO memories_fts (memory_id, source, source_id, metadata, tags)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![
                    memory_id,
                    source,
                    source_id.unwrap_or_default(),
                    metadata.unwrap_or_default(),
                    tags_str,
                ],
            )?;
        }

        Ok(())
    }

    /// List all tags with usage counts
    pub fn list_tags_with_counts(&self) -> Result<Vec<(String, i64)>> {
        let mut stmt = self.connection().prepare(
            "SELECT t.name, COUNT(mt.memory_id) as count
             FROM tags t
             LEFT JOIN memory_tags mt ON t.id = mt.tag_id
             GROUP BY t.id
             ORDER BY count DESC, t.name ASC",
        )?;

        let rows = stmt.query_map([], |row| Ok((row.get(0)?, row.get(1)?)))?;

        rows.collect()
    }

    /// Delete orphan tags (tags with no memories)
    pub fn cleanup_orphan_tags(&self) -> Result<usize> {
        let count = self.connection().execute(
            "DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM memory_tags)",
            [],
        )?;
        Ok(count)
    }

    // ==================== Utility Operations ====================

    /// Count all memories, optionally filtered by space
    pub fn count_memories(&self, space_id: Option<&str>) -> Result<i64> {
        match space_id {
            Some(sid) => self.connection().query_row(
                "SELECT COUNT(*) FROM memories WHERE space_id = ?1",
                params![sid],
                |row| row.get(0),
            ),
            None => self
                .connection()
                .query_row("SELECT COUNT(*) FROM memories", [], |row| row.get(0)),
        }
    }

    /// Get memories by source
    pub fn get_memories_by_source(&self, source: &str, limit: usize) -> Result<Vec<Memory>> {
        let mut stmt = self.connection().prepare(
            "SELECT id, space_id, source, source_id, title, summary, content, metadata, created_at, updated_at
             FROM memories WHERE source = ?1
             ORDER BY created_at DESC LIMIT ?2",
        )?;

        let rows = stmt.query_map(params![source, limit as i64], |row| row_to_memory(row))?;

        rows.collect()
    }

    /// Check if a memory with the given source_id already exists
    pub fn memory_exists_by_source_id(&self, source: &str, source_id: &str) -> Result<bool> {
        let count: i64 = self.connection().query_row(
            "SELECT COUNT(*) FROM memories WHERE source = ?1 AND source_id = ?2",
            params![source, source_id],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_test_db() -> Database {
        let db = Database::in_memory().expect("Failed to create test database");
        db.init_schema().expect("Failed to init schema");
        db
    }

    #[test]
    fn test_space_crud() {
        let db = setup_test_db();

        // Create
        let space = Space::new("Test Space".to_string(), Some("📁".to_string()), None);
        db.create_space(&space).expect("Failed to create space");

        // Read
        let fetched = db
            .get_space(&space.id)
            .expect("Failed to get space")
            .expect("Space not found");
        assert_eq!(fetched.name, "Test Space");
        assert_eq!(fetched.icon, Some("📁".to_string()));

        // List
        let spaces = db.list_spaces().expect("Failed to list spaces");
        assert_eq!(spaces.len(), 1);

        // Update
        let mut updated = fetched;
        updated.name = "Updated Space".to_string();
        db.update_space(&updated).expect("Failed to update space");

        let fetched_updated = db
            .get_space(&space.id)
            .expect("Failed to get space")
            .expect("Space not found");
        assert_eq!(fetched_updated.name, "Updated Space");

        // Delete
        db.delete_space(&space.id).expect("Failed to delete space");
        let deleted = db.get_space(&space.id).expect("Failed to query space");
        assert!(deleted.is_none());
    }

    #[test]
    fn test_memory_crud() {
        let db = setup_test_db();

        // Create memory
        let memory = Memory::new(
            None,
            "browser".to_string(),
            Some("https://example.com".to_string()),
            Some(b"Test Title".to_vec()),
            None,
            Some(b"Test content".to_vec()),
            Some(r#"{"url":"https://example.com"}"#.to_string()),
        );
        db.create_memory(&memory).expect("Failed to create memory");

        // Read
        let fetched = db
            .get_memory(&memory.id)
            .expect("Failed to get memory")
            .expect("Memory not found");
        assert_eq!(fetched.source, "browser");

        // List
        let memories = db
            .list_memories(None, 10, 0)
            .expect("Failed to list memories");
        assert_eq!(memories.len(), 1);

        // Update
        let mut updated = fetched;
        updated.source = "clipboard".to_string();
        db.update_memory(&updated).expect("Failed to update memory");

        // Delete
        db.delete_memory(&memory.id)
            .expect("Failed to delete memory");
        let deleted = db.get_memory(&memory.id).expect("Failed to query memory");
        assert!(deleted.is_none());
    }

    #[test]
    fn test_memory_with_space() {
        let db = setup_test_db();

        // Create space
        let space = Space::new("Work".to_string(), None, None);
        db.create_space(&space).expect("Failed to create space");

        // Create memory in space
        let memory = Memory::new(
            Some(space.id.clone()),
            "manual".to_string(),
            None,
            Some(b"Note".to_vec()),
            None,
            Some(b"Content".to_vec()),
            None,
        );
        db.create_memory(&memory).expect("Failed to create memory");

        // List memories in space
        let memories = db
            .list_memories(Some(&space.id), 10, 0)
            .expect("Failed to list");
        assert_eq!(memories.len(), 1);

        // List all memories
        let all = db.list_memories(None, 10, 0).expect("Failed to list all");
        assert_eq!(all.len(), 1);
    }

    #[test]
    fn test_tags() {
        let db = setup_test_db();

        // Create memory
        let memory = Memory::new(
            None,
            "test".to_string(),
            None,
            None,
            None,
            None,
            Some(r#"{"test":true}"#.to_string()),
        );
        db.create_memory(&memory).expect("Failed to create memory");

        // Add tags
        db.add_tags(&memory.id, &["rust".to_string(), "code".to_string()])
            .expect("Failed to add tags");

        // Get tags
        let tags = db.get_tags(&memory.id).expect("Failed to get tags");
        assert_eq!(tags.len(), 2);
        assert!(tags.contains(&"rust".to_string()));
        assert!(tags.contains(&"code".to_string()));

        // Remove tag
        db.remove_tag(&memory.id, "rust")
            .expect("Failed to remove tag");
        let tags_after = db.get_tags(&memory.id).expect("Failed to get tags");
        assert_eq!(tags_after.len(), 1);
        assert!(!tags_after.contains(&"rust".to_string()));
    }

    #[test]
    fn test_search() {
        let db = setup_test_db();

        // Create memories with different metadata
        let memory1 = Memory::new(
            None,
            "browser".to_string(),
            Some("https://rust-lang.org".to_string()),
            None,
            None,
            None,
            Some(r#"{"title":"Rust Programming"}"#.to_string()),
        );
        db.create_memory(&memory1).expect("Failed to create memory");

        let memory2 = Memory::new(
            None,
            "browser".to_string(),
            Some("https://python.org".to_string()),
            None,
            None,
            None,
            Some(r#"{"title":"Python Programming"}"#.to_string()),
        );
        db.create_memory(&memory2).expect("Failed to create memory");

        // Search for rust
        let results = db.search_memories("rust", None).expect("Failed to search");
        assert_eq!(results.len(), 1);
        assert_eq!(
            results[0].source_id,
            Some("https://rust-lang.org".to_string())
        );
    }

    #[test]
    fn test_count_memories() {
        let db = setup_test_db();

        // Create space
        let space = Space::new("Test".to_string(), None, None);
        db.create_space(&space).expect("Failed to create space");

        // Create memories
        for i in 0..5 {
            let memory = Memory::new(
                if i < 3 { Some(space.id.clone()) } else { None },
                "test".to_string(),
                None,
                None,
                None,
                None,
                None,
            );
            db.create_memory(&memory).expect("Failed to create memory");
        }

        // Count all
        let total = db.count_memories(None).expect("Failed to count");
        assert_eq!(total, 5);

        // Count in space
        let in_space = db.count_memories(Some(&space.id)).expect("Failed to count");
        assert_eq!(in_space, 3);
    }

    #[test]
    fn test_memory_exists_by_source_id() {
        let db = setup_test_db();

        let memory = Memory::new(
            None,
            "browser".to_string(),
            Some("unique-id-123".to_string()),
            None,
            None,
            None,
            None,
        );
        db.create_memory(&memory).expect("Failed to create memory");

        assert!(db
            .memory_exists_by_source_id("browser", "unique-id-123")
            .expect("Failed to check"));
        assert!(!db
            .memory_exists_by_source_id("browser", "nonexistent")
            .expect("Failed to check"));
    }
}
