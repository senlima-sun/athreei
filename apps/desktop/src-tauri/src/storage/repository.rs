//! Repository methods for database CRUD operations
//!
//! Provides type-safe methods for interacting with spaces, memories, and tags.

use super::db::Database;
use super::models::{Memory, MemoryWithTags, Space, Tag};
use crate::workspace::types::{
    Handoff, ListWorkspacesFilter, Task, TaskStatus, Workspace, WorkspaceStatus,
    WorkspaceWithTasks,
};
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
        summary_title: row.get(8)?,
        summary_brief: row.get(9)?,
        summary_standard: row.get(10)?,
        summary_version: row.get(11)?,
        content_hash: row.get(12)?,
        last_accessed_at: row.get(13)?,
        access_count: row.get(14)?,
        created_at: row.get(15)?,
        updated_at: row.get(16)?,
    })
}

impl Database {

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


    /// Create a new memory
    pub fn create_memory(&self, memory: &Memory) -> Result<()> {
        self.connection().execute(
            "INSERT INTO memories (id, space_id, source, source_id, title, summary, content, metadata, summary_title, summary_brief, summary_standard, summary_version, content_hash, last_accessed_at, access_count, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)",
            params![
                memory.id,
                memory.space_id,
                memory.source,
                memory.source_id,
                memory.title,
                memory.summary,
                memory.content,
                memory.metadata,
                memory.summary_title,
                memory.summary_brief,
                memory.summary_standard,
                memory.summary_version,
                memory.content_hash,
                memory.last_accessed_at,
                memory.access_count,
                memory.created_at,
                memory.updated_at,
            ],
        )?;
        Ok(())
    }

    /// Get a memory by ID
    pub fn get_memory(&self, id: &str) -> Result<Option<Memory>> {
        let mut stmt = self.connection().prepare(
            "SELECT id, space_id, source, source_id, title, summary, content, metadata, summary_title, summary_brief, summary_standard, summary_version, content_hash, last_accessed_at, access_count, created_at, updated_at
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
                "SELECT id, space_id, source, source_id, title, summary, content, metadata, summary_title, summary_brief, summary_standard, summary_version, content_hash, last_accessed_at, access_count, created_at, updated_at
                 FROM memories WHERE space_id = ?1
                 ORDER BY created_at DESC LIMIT ?2 OFFSET ?3",
                vec![
                    Box::new(sid.to_string()),
                    Box::new(limit as i64),
                    Box::new(offset as i64),
                ],
            ),
            None => (
                "SELECT id, space_id, source, source_id, title, summary, content, metadata, summary_title, summary_brief, summary_standard, summary_version, content_hash, last_accessed_at, access_count, created_at, updated_at
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
                "SELECT m.id, m.space_id, m.source, m.source_id, m.title, m.summary, m.content, m.metadata,
                        m.summary_title, m.summary_brief, m.summary_standard, m.summary_version, m.content_hash,
                        m.last_accessed_at, m.access_count, m.created_at, m.updated_at
                 FROM memories m
                 JOIN memories_fts fts ON m.id = fts.memory_id
                 WHERE memories_fts MATCH ?1 AND m.space_id = ?2
                 ORDER BY rank",
                vec![Box::new(fts_query), Box::new(sid.to_string())],
            ),
            None => (
                "SELECT m.id, m.space_id, m.source, m.source_id, m.title, m.summary, m.content, m.metadata,
                        m.summary_title, m.summary_brief, m.summary_standard, m.summary_version, m.content_hash,
                        m.last_accessed_at, m.access_count, m.created_at, m.updated_at
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
             summary = ?6, content = ?7, metadata = ?8,
             summary_title = ?9, summary_brief = ?10, summary_standard = ?11,
             summary_version = ?12, content_hash = ?13, updated_at = ?14
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
                memory.summary_title,
                memory.summary_brief,
                memory.summary_standard,
                memory.summary_version,
                memory.content_hash,
                now(),
            ],
        )?;
        Ok(())
    }

    /// Update only the auto-generated summaries for a memory
    pub fn update_memory_summaries(
        &self,
        memory_id: &str,
        summary_title: Option<&str>,
        summary_brief: Option<&str>,
        summary_standard: Option<&str>,
        content_hash: &str,
    ) -> Result<()> {
        self.connection().execute(
            "UPDATE memories SET
             summary_title = ?2, summary_brief = ?3, summary_standard = ?4,
             summary_version = COALESCE(summary_version, 0) + 1,
             content_hash = ?5, updated_at = ?6
             WHERE id = ?1",
            params![
                memory_id,
                summary_title,
                summary_brief,
                summary_standard,
                content_hash,
                now(),
            ],
        )?;
        Ok(())
    }

    /// Get memories that need summary regeneration (stale or missing)
    pub fn get_stale_summary_memories(&self, limit: usize) -> Result<Vec<Memory>> {
        let mut stmt = self.connection().prepare(
            "SELECT id, space_id, source, source_id, title, summary, content, metadata,
                    summary_title, summary_brief, summary_standard, summary_version, content_hash,
                    last_accessed_at, access_count, created_at, updated_at
             FROM memories
             WHERE summary_version = 0 OR summary_version IS NULL OR content_hash IS NULL
             LIMIT ?1",
        )?;

        let rows = stmt.query_map(params![limit as i64], |row| row_to_memory(row))?;
        rows.collect()
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
            "SELECT id, space_id, source, source_id, title, summary, content, metadata, summary_title, summary_brief, summary_standard, summary_version, content_hash, last_accessed_at, access_count, created_at, updated_at
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

    /// Get the oldest memory timestamp
    pub fn get_oldest_memory_date(&self, space_id: Option<&str>) -> Result<Option<i64>> {
        match space_id {
            Some(sid) => self.connection().query_row(
                "SELECT MIN(created_at) FROM memories WHERE space_id = ?1",
                params![sid],
                |row| row.get(0),
            ),
            None => self
                .connection()
                .query_row("SELECT MIN(created_at) FROM memories", [], |row| row.get(0)),
        }
    }

    /// List memories for a specific date (day)
    pub fn list_memories_by_date(
        &self,
        start_timestamp: i64,
        end_timestamp: i64,
        space_id: Option<&str>,
        limit: usize,
        offset: usize,
    ) -> Result<Vec<Memory>> {
        let (sql, params_vec): (&str, Vec<Box<dyn rusqlite::ToSql>>) = match space_id {
            Some(sid) => (
                "SELECT id, space_id, source, source_id, title, summary, content, metadata, summary_title, summary_brief, summary_standard, summary_version, content_hash, last_accessed_at, access_count, created_at, updated_at
                 FROM memories
                 WHERE space_id = ?1 AND created_at >= ?2 AND created_at < ?3
                 ORDER BY created_at DESC LIMIT ?4 OFFSET ?5",
                vec![
                    Box::new(sid.to_string()),
                    Box::new(start_timestamp),
                    Box::new(end_timestamp),
                    Box::new(limit as i64),
                    Box::new(offset as i64),
                ],
            ),
            None => (
                "SELECT id, space_id, source, source_id, title, summary, content, metadata, summary_title, summary_brief, summary_standard, summary_version, content_hash, last_accessed_at, access_count, created_at, updated_at
                 FROM memories
                 WHERE created_at >= ?1 AND created_at < ?2
                 ORDER BY created_at DESC LIMIT ?3 OFFSET ?4",
                vec![
                    Box::new(start_timestamp),
                    Box::new(end_timestamp),
                    Box::new(limit as i64),
                    Box::new(offset as i64),
                ],
            ),
        };

        let mut stmt = self.connection().prepare(sql)?;
        let params_refs: Vec<&dyn rusqlite::ToSql> =
            params_vec.iter().map(|p| p.as_ref()).collect();
        let rows = stmt.query_map(params_refs.as_slice(), |row| row_to_memory(row))?;

        rows.collect()
    }

    /// Count memories for a specific date range
    pub fn count_memories_by_date(
        &self,
        start_timestamp: i64,
        end_timestamp: i64,
        space_id: Option<&str>,
    ) -> Result<i64> {
        match space_id {
            Some(sid) => self.connection().query_row(
                "SELECT COUNT(*) FROM memories WHERE space_id = ?1 AND created_at >= ?2 AND created_at < ?3",
                params![sid, start_timestamp, end_timestamp],
                |row| row.get(0),
            ),
            None => self.connection().query_row(
                "SELECT COUNT(*) FROM memories WHERE created_at >= ?1 AND created_at < ?2",
                params![start_timestamp, end_timestamp],
                |row| row.get(0),
            ),
        }
    }

    /// Record an access to a memory for context injection tracking
    pub fn record_access(&self, memory_id: &str) -> Result<()> {
        self.connection().execute(
            "UPDATE memories SET
             last_accessed_at = ?2,
             access_count = COALESCE(access_count, 0) + 1
             WHERE id = ?1",
            params![memory_id, now()],
        )?;
        Ok(())
    }

    /// Get the maximum access count across all memories (for normalization)
    pub fn get_max_access_count(&self) -> Result<i32> {
        self.connection().query_row(
            "SELECT COALESCE(MAX(access_count), 0) FROM memories",
            [],
            |row| row.get(0),
        )
    }

    // =========================================================================
    // Workspace Operations
    // =========================================================================

    /// Create a new workspace
    pub fn create_workspace(&self, workspace: &Workspace) -> Result<()> {
        self.connection().execute(
            "INSERT INTO workspaces (id, name, description, space_id, goal, success_criteria, status, blocker, context, encrypted_goal, encrypted_context, created_at, updated_at, completed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            params![
                workspace.id,
                workspace.name,
                workspace.description,
                workspace.space_id,
                workspace.goal,
                workspace.success_criteria,
                workspace.status.as_str(),
                workspace.blocker,
                workspace.context,
                workspace.encrypted_goal,
                workspace.encrypted_context,
                workspace.created_at,
                workspace.updated_at,
                workspace.completed_at,
            ],
        )?;
        Ok(())
    }

    /// Get a workspace by ID
    pub fn get_workspace(&self, id: &str) -> Result<Option<Workspace>> {
        let mut stmt = self.connection().prepare(
            "SELECT id, name, description, space_id, goal, success_criteria, status, blocker, context, encrypted_goal, encrypted_context, created_at, updated_at, completed_at
             FROM workspaces WHERE id = ?1",
        )?;

        let mut rows = stmt.query(params![id])?;

        match rows.next()? {
            Some(row) => Ok(Some(row_to_workspace(row)?)),
            None => Ok(None),
        }
    }

    /// Get a workspace with its tasks and latest handoff
    pub fn get_workspace_with_tasks(&self, id: &str) -> Result<Option<WorkspaceWithTasks>> {
        let workspace = match self.get_workspace(id)? {
            Some(w) => w,
            None => return Ok(None),
        };

        let tasks = self.list_tasks(id)?;
        let latest_handoff = self.get_latest_handoff(id)?;

        Ok(Some(WorkspaceWithTasks {
            workspace,
            tasks,
            latest_handoff,
        }))
    }

    /// List workspaces with optional filters
    pub fn list_workspaces(&self, filter: &ListWorkspacesFilter) -> Result<Vec<Workspace>> {
        let mut sql = String::from(
            "SELECT id, name, description, space_id, goal, success_criteria, status, blocker, context, encrypted_goal, encrypted_context, created_at, updated_at, completed_at
             FROM workspaces WHERE 1=1",
        );
        let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        if let Some(ref space_id) = filter.space_id {
            sql.push_str(" AND space_id = ?");
            params_vec.push(Box::new(space_id.clone()));
        }

        if let Some(ref statuses) = filter.statuses {
            if !statuses.is_empty() {
                let placeholders: Vec<&str> = statuses.iter().map(|_| "?").collect();
                sql.push_str(&format!(" AND status IN ({})", placeholders.join(",")));
                for status in statuses {
                    params_vec.push(Box::new(status.as_str().to_string()));
                }
            }
        }

        sql.push_str(" ORDER BY updated_at DESC");

        if let Some(limit) = filter.limit {
            sql.push_str(&format!(" LIMIT {}", limit));
        }
        if let Some(offset) = filter.offset {
            sql.push_str(&format!(" OFFSET {}", offset));
        }

        let mut stmt = self.connection().prepare(&sql)?;
        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();
        let rows = stmt.query_map(params_refs.as_slice(), |row| row_to_workspace(row))?;
        rows.collect()
    }

    /// Update a workspace
    pub fn update_workspace(&self, workspace: &Workspace) -> Result<()> {
        self.connection().execute(
            "UPDATE workspaces SET
             name = ?2, description = ?3, space_id = ?4, goal = ?5, success_criteria = ?6,
             status = ?7, blocker = ?8, context = ?9, encrypted_goal = ?10, encrypted_context = ?11,
             updated_at = ?12, completed_at = ?13
             WHERE id = ?1",
            params![
                workspace.id,
                workspace.name,
                workspace.description,
                workspace.space_id,
                workspace.goal,
                workspace.success_criteria,
                workspace.status.as_str(),
                workspace.blocker,
                workspace.context,
                workspace.encrypted_goal,
                workspace.encrypted_context,
                now(),
                workspace.completed_at,
            ],
        )?;
        Ok(())
    }

    /// Delete a workspace by ID (cascades to tasks and handoffs)
    pub fn delete_workspace(&self, id: &str) -> Result<()> {
        self.connection()
            .execute("DELETE FROM workspaces WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// Count workspaces with optional status filter
    pub fn count_workspaces(&self, statuses: Option<&[WorkspaceStatus]>) -> Result<i64> {
        if let Some(statuses) = statuses {
            if !statuses.is_empty() {
                let placeholders: Vec<&str> = statuses.iter().map(|_| "?").collect();
                let sql = format!(
                    "SELECT COUNT(*) FROM workspaces WHERE status IN ({})",
                    placeholders.join(",")
                );
                let mut stmt = self.connection().prepare(&sql)?;
                let params: Vec<String> = statuses.iter().map(|s| s.as_str().to_string()).collect();
                let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|s| s as &dyn rusqlite::ToSql).collect();
                return stmt.query_row(params_refs.as_slice(), |row| row.get(0));
            }
        }
        self.connection()
            .query_row("SELECT COUNT(*) FROM workspaces", [], |row| row.get(0))
    }

    // =========================================================================
    // Task Operations
    // =========================================================================

    /// Create a new task
    pub fn create_task(&self, task: &Task) -> Result<()> {
        let max_position: i32 = self.connection().query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM tasks WHERE workspace_id = ?1",
            params![task.workspace_id],
            |row| row.get(0),
        )?;

        self.connection().execute(
            "INSERT INTO tasks (id, workspace_id, title, description, status, blocker, is_next_action, position, encrypted_title, encrypted_description, created_at, updated_at, completed_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                task.id,
                task.workspace_id,
                task.title,
                task.description,
                task.status.as_str(),
                task.blocker,
                task.is_next_action as i32,
                max_position,
                task.encrypted_title,
                task.encrypted_description,
                task.created_at,
                task.updated_at,
                task.completed_at,
            ],
        )?;
        Ok(())
    }

    /// Get a task by ID
    pub fn get_task(&self, id: &str) -> Result<Option<Task>> {
        let mut stmt = self.connection().prepare(
            "SELECT id, workspace_id, title, description, status, blocker, is_next_action, position, encrypted_title, encrypted_description, created_at, updated_at, completed_at
             FROM tasks WHERE id = ?1",
        )?;

        let mut rows = stmt.query(params![id])?;

        match rows.next()? {
            Some(row) => Ok(Some(row_to_task(row)?)),
            None => Ok(None),
        }
    }

    /// List tasks for a workspace ordered by position
    pub fn list_tasks(&self, workspace_id: &str) -> Result<Vec<Task>> {
        let mut stmt = self.connection().prepare(
            "SELECT id, workspace_id, title, description, status, blocker, is_next_action, position, encrypted_title, encrypted_description, created_at, updated_at, completed_at
             FROM tasks WHERE workspace_id = ?1 ORDER BY position ASC",
        )?;

        let rows = stmt.query_map(params![workspace_id], |row| row_to_task(row))?;
        rows.collect()
    }

    /// Update a task
    pub fn update_task(&self, task: &Task) -> Result<()> {
        self.connection().execute(
            "UPDATE tasks SET
             title = ?2, description = ?3, status = ?4, blocker = ?5, is_next_action = ?6,
             position = ?7, encrypted_title = ?8, encrypted_description = ?9,
             updated_at = ?10, completed_at = ?11
             WHERE id = ?1",
            params![
                task.id,
                task.title,
                task.description,
                task.status.as_str(),
                task.blocker,
                task.is_next_action as i32,
                task.position,
                task.encrypted_title,
                task.encrypted_description,
                now(),
                task.completed_at,
            ],
        )?;
        Ok(())
    }

    /// Delete a task by ID
    pub fn delete_task(&self, id: &str) -> Result<()> {
        self.connection()
            .execute("DELETE FROM tasks WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// Reorder tasks within a workspace
    pub fn reorder_tasks(&self, workspace_id: &str, task_ids: &[String]) -> Result<()> {
        for (position, task_id) in task_ids.iter().enumerate() {
            self.connection().execute(
                "UPDATE tasks SET position = ?1, updated_at = ?2 WHERE id = ?3 AND workspace_id = ?4",
                params![position as i32, now(), task_id, workspace_id],
            )?;
        }
        Ok(())
    }

    /// Get the next action task for a workspace
    pub fn get_next_action_task(&self, workspace_id: &str) -> Result<Option<Task>> {
        let mut stmt = self.connection().prepare(
            "SELECT id, workspace_id, title, description, status, blocker, is_next_action, position, encrypted_title, encrypted_description, created_at, updated_at, completed_at
             FROM tasks WHERE workspace_id = ?1 AND is_next_action = 1 LIMIT 1",
        )?;

        let mut rows = stmt.query(params![workspace_id])?;

        match rows.next()? {
            Some(row) => Ok(Some(row_to_task(row)?)),
            None => Ok(None),
        }
    }

    // =========================================================================
    // Handoff Operations
    // =========================================================================

    /// Create a new handoff
    pub fn create_handoff(&self, handoff: &Handoff) -> Result<()> {
        self.connection().execute(
            "INSERT INTO handoffs (id, workspace_id, session_id, progress_summary, current_state, next_steps, blockers, what_worked, what_failed, key_decisions, encrypted_progress, encrypted_state, encrypted_learnings, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
            params![
                handoff.id,
                handoff.workspace_id,
                handoff.session_id,
                handoff.progress_summary,
                handoff.current_state,
                handoff.next_steps,
                handoff.blockers,
                handoff.what_worked,
                handoff.what_failed,
                handoff.key_decisions,
                handoff.encrypted_progress,
                handoff.encrypted_state,
                handoff.encrypted_learnings,
                handoff.created_at,
            ],
        )?;
        Ok(())
    }

    /// Get the latest handoff for a workspace
    pub fn get_latest_handoff(&self, workspace_id: &str) -> Result<Option<Handoff>> {
        let mut stmt = self.connection().prepare(
            "SELECT id, workspace_id, session_id, progress_summary, current_state, next_steps, blockers, what_worked, what_failed, key_decisions, encrypted_progress, encrypted_state, encrypted_learnings, created_at
             FROM handoffs WHERE workspace_id = ?1 ORDER BY created_at DESC LIMIT 1",
        )?;

        let mut rows = stmt.query(params![workspace_id])?;

        match rows.next()? {
            Some(row) => Ok(Some(row_to_handoff(row)?)),
            None => Ok(None),
        }
    }

    /// List handoffs for a workspace
    pub fn list_handoffs(&self, workspace_id: &str, limit: usize) -> Result<Vec<Handoff>> {
        let mut stmt = self.connection().prepare(
            "SELECT id, workspace_id, session_id, progress_summary, current_state, next_steps, blockers, what_worked, what_failed, key_decisions, encrypted_progress, encrypted_state, encrypted_learnings, created_at
             FROM handoffs WHERE workspace_id = ?1 ORDER BY created_at DESC LIMIT ?2",
        )?;

        let rows = stmt.query_map(params![workspace_id, limit as i64], |row| row_to_handoff(row))?;
        rows.collect()
    }

    /// Get a handoff by ID
    pub fn get_handoff(&self, id: &str) -> Result<Option<Handoff>> {
        let mut stmt = self.connection().prepare(
            "SELECT id, workspace_id, session_id, progress_summary, current_state, next_steps, blockers, what_worked, what_failed, key_decisions, encrypted_progress, encrypted_state, encrypted_learnings, created_at
             FROM handoffs WHERE id = ?1",
        )?;

        let mut rows = stmt.query(params![id])?;

        match rows.next()? {
            Some(row) => Ok(Some(row_to_handoff(row)?)),
            None => Ok(None),
        }
    }

    /// Delete a handoff by ID
    pub fn delete_handoff(&self, id: &str) -> Result<()> {
        self.connection()
            .execute("DELETE FROM handoffs WHERE id = ?1", params![id])?;
        Ok(())
    }
}

/// Map a database row to a Workspace
/// Column order: id, name, description, space_id, goal, success_criteria, status, blocker, context,
///               encrypted_goal, encrypted_context, created_at, updated_at, completed_at
fn row_to_workspace(row: &Row) -> Result<Workspace> {
    let status_str: String = row.get(6)?;
    Ok(Workspace {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        space_id: row.get(3)?,
        goal: row.get(4)?,
        success_criteria: row.get(5)?,
        status: WorkspaceStatus::from_str(&status_str).unwrap_or_default(),
        blocker: row.get(7)?,
        context: row.get(8)?,
        encrypted_goal: row.get(9)?,
        encrypted_context: row.get(10)?,
        created_at: row.get(11)?,
        updated_at: row.get(12)?,
        completed_at: row.get(13)?,
    })
}

/// Map a database row to a Task
/// Column order: id, workspace_id, title, description, status, blocker, is_next_action, position,
///               encrypted_title, encrypted_description, created_at, updated_at, completed_at
fn row_to_task(row: &Row) -> Result<Task> {
    let status_str: String = row.get(4)?;
    let is_next_action_int: i32 = row.get(6)?;
    Ok(Task {
        id: row.get(0)?,
        workspace_id: row.get(1)?,
        title: row.get(2)?,
        description: row.get(3)?,
        status: TaskStatus::from_str(&status_str).unwrap_or_default(),
        blocker: row.get(5)?,
        is_next_action: is_next_action_int != 0,
        position: row.get(7)?,
        encrypted_title: row.get(8)?,
        encrypted_description: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
        completed_at: row.get(12)?,
    })
}

/// Map a database row to a Handoff
/// Column order: id, workspace_id, session_id, progress_summary, current_state, next_steps, blockers,
///               what_worked, what_failed, key_decisions, encrypted_progress, encrypted_state,
///               encrypted_learnings, created_at
fn row_to_handoff(row: &Row) -> Result<Handoff> {
    Ok(Handoff {
        id: row.get(0)?,
        workspace_id: row.get(1)?,
        session_id: row.get(2)?,
        progress_summary: row.get(3)?,
        current_state: row.get(4)?,
        next_steps: row.get(5)?,
        blockers: row.get(6)?,
        what_worked: row.get(7)?,
        what_failed: row.get(8)?,
        key_decisions: row.get(9)?,
        encrypted_progress: row.get(10)?,
        encrypted_state: row.get(11)?,
        encrypted_learnings: row.get(12)?,
        created_at: row.get(13)?,
    })
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


    #[test]
    fn test_space_update_preserves_fields() {
        let db = setup_test_db();

        // Create space with all fields
        let space = Space::new(
            "Original Name".to_string(),
            Some("🏠".to_string()),
            Some(r#"{"rule":"test"}"#.to_string()),
        );
        db.create_space(&space).expect("Failed to create space");

        // Update only the name
        let mut updated = space.clone();
        updated.name = "Updated Name".to_string();
        db.update_space(&updated).expect("Failed to update space");

        // Verify other fields preserved
        let fetched = db.get_space(&space.id).unwrap().unwrap();
        assert_eq!(fetched.name, "Updated Name");
        assert_eq!(fetched.icon, Some("🏠".to_string()));
        assert_eq!(fetched.source_rules, Some(r#"{"rule":"test"}"#.to_string()));
    }

    #[test]
    fn test_multiple_spaces_ordering() {
        let db = setup_test_db();

        // Create spaces in non-alphabetical order
        let space_c = Space::new("Charlie".to_string(), None, None);
        let space_a = Space::new("Alpha".to_string(), None, None);
        let space_b = Space::new("Bravo".to_string(), None, None);

        db.create_space(&space_c).expect("Failed to create space");
        db.create_space(&space_a).expect("Failed to create space");
        db.create_space(&space_b).expect("Failed to create space");

        // List should return alphabetically
        let spaces = db.list_spaces().expect("Failed to list spaces");
        assert_eq!(spaces.len(), 3);
        assert_eq!(spaces[0].name, "Alpha");
        assert_eq!(spaces[1].name, "Bravo");
        assert_eq!(spaces[2].name, "Charlie");
    }

    #[test]
    fn test_memory_pagination() {
        let db = setup_test_db();

        // Create 10 memories
        for i in 0..10 {
            let memory = Memory::new(
                None,
                "test".to_string(),
                Some(format!("source-{}", i)),
                Some(format!("Title {}", i).into_bytes()),
                None,
                None,
                None,
            );
            db.create_memory(&memory).expect("Failed to create memory");
            // Small delay to ensure different timestamps
            std::thread::sleep(std::time::Duration::from_millis(10));
        }

        // Get first page (5 items)
        let page1 = db
            .list_memories(None, 5, 0)
            .expect("Failed to list memories");
        assert_eq!(page1.len(), 5);

        // Get second page (5 items)
        let page2 = db
            .list_memories(None, 5, 5)
            .expect("Failed to list memories");
        assert_eq!(page2.len(), 5);

        // Ensure no overlap between pages
        let page1_ids: Vec<_> = page1.iter().map(|m| &m.id).collect();
        for m in &page2 {
            assert!(!page1_ids.contains(&&m.id));
        }
    }

    #[test]
    fn test_memory_with_tags_integration() {
        let db = setup_test_db();

        // Create memory
        let memory = Memory::new(
            None,
            "browser".to_string(),
            Some("https://example.com".to_string()),
            Some(b"Test Title".to_vec()),
            None,
            Some(b"Content".to_vec()),
            Some(r#"{"key":"value"}"#.to_string()),
        );
        db.create_memory(&memory).expect("Failed to create memory");

        // Add multiple tags
        db.add_tags(&memory.id, &["rust".to_string(), "programming".to_string(), "test".to_string()])
            .expect("Failed to add tags");

        // Get memory with tags
        let memory_with_tags = db
            .get_memory_with_tags(&memory.id)
            .expect("Failed to get memory")
            .expect("Memory not found");

        assert_eq!(memory_with_tags.tags.len(), 3);
        assert!(memory_with_tags.tags.contains(&"rust".to_string()));
        assert!(memory_with_tags.tags.contains(&"programming".to_string()));
        assert!(memory_with_tags.tags.contains(&"test".to_string()));
    }

    #[test]
    fn test_tag_idempotent_add() {
        let db = setup_test_db();

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

        // Add the same tag twice
        db.add_tags(&memory.id, &["duplicate".to_string()])
            .expect("Failed to add tags");
        db.add_tags(&memory.id, &["duplicate".to_string()])
            .expect("Failed to add tags");

        // Should only have one instance of the tag
        let tags = db.get_tags(&memory.id).expect("Failed to get tags");
        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0], "duplicate");
    }

    #[test]
    fn test_list_tags_with_counts() {
        let db = setup_test_db();

        // Create multiple memories with different tags
        for i in 0..3 {
            let memory = Memory::new(
                None,
                "test".to_string(),
                None,
                None,
                None,
                None,
                Some(r#"{"n":true}"#.to_string()),
            );
            db.create_memory(&memory).expect("Failed to create memory");

            // All memories get "common" tag
            db.add_tags(&memory.id, &["common".to_string()])
                .expect("Failed to add tags");

            // Only some get "rare" tag
            if i == 0 {
                db.add_tags(&memory.id, &["rare".to_string()])
                    .expect("Failed to add tags");
            }
        }

        let tags_with_counts = db.list_tags_with_counts().expect("Failed to list tags");

        // Find common and rare tags
        let common = tags_with_counts.iter().find(|(name, _)| name == "common");
        let rare = tags_with_counts.iter().find(|(name, _)| name == "rare");

        assert!(common.is_some());
        assert!(rare.is_some());
        assert_eq!(common.unwrap().1, 3);
        assert_eq!(rare.unwrap().1, 1);
    }

    #[test]
    fn test_cleanup_orphan_tags() {
        let db = setup_test_db();

        // Create memory with tag
        let memory = Memory::new(
            None,
            "test".to_string(),
            None,
            None,
            None,
            None,
            Some(r#"{"t":1}"#.to_string()),
        );
        db.create_memory(&memory).expect("Failed to create memory");
        db.add_tags(&memory.id, &["orphan-tag".to_string()])
            .expect("Failed to add tags");

        // Delete the memory (this removes memory_tags but not tags)
        db.delete_memory(&memory.id)
            .expect("Failed to delete memory");

        // Tag should now be orphan
        let before_cleanup = db.list_tags_with_counts().expect("Failed to list tags");
        let orphan_exists = before_cleanup.iter().any(|(name, count)| name == "orphan-tag" && *count == 0);
        assert!(orphan_exists, "Orphan tag should exist before cleanup");

        // Cleanup orphans
        let cleaned = db.cleanup_orphan_tags().expect("Failed to cleanup");
        assert!(cleaned > 0);

        // Orphan should be gone
        let after_cleanup = db.list_tags_with_counts().expect("Failed to list tags");
        let orphan_still_exists = after_cleanup.iter().any(|(name, _)| name == "orphan-tag");
        assert!(!orphan_still_exists, "Orphan tag should be gone after cleanup");
    }

    #[test]
    fn test_get_memories_by_source() {
        let db = setup_test_db();

        // Create memories with different sources
        for i in 0..3 {
            let memory = Memory::new(
                None,
                "browser".to_string(),
                Some(format!("url-{}", i)),
                None,
                None,
                None,
                None,
            );
            db.create_memory(&memory).expect("Failed to create memory");
        }

        for i in 0..2 {
            let memory = Memory::new(
                None,
                "clipboard".to_string(),
                Some(format!("clip-{}", i)),
                None,
                None,
                None,
                None,
            );
            db.create_memory(&memory).expect("Failed to create memory");
        }

        // Get browser memories
        let browser_memories = db
            .get_memories_by_source("browser", 10)
            .expect("Failed to get memories");
        assert_eq!(browser_memories.len(), 3);

        // Get clipboard memories
        let clipboard_memories = db
            .get_memories_by_source("clipboard", 10)
            .expect("Failed to get memories");
        assert_eq!(clipboard_memories.len(), 2);

        // Limit works
        let limited = db
            .get_memories_by_source("browser", 2)
            .expect("Failed to get memories");
        assert_eq!(limited.len(), 2);
    }

    #[test]
    fn test_search_with_space_filter() {
        let db = setup_test_db();

        // Create two spaces
        let space1 = Space::new("Work".to_string(), None, None);
        let space2 = Space::new("Personal".to_string(), None, None);
        db.create_space(&space1).expect("Failed to create space");
        db.create_space(&space2).expect("Failed to create space");

        // Create memories in different spaces with same metadata
        let mem1 = Memory::new(
            Some(space1.id.clone()),
            "browser".to_string(),
            Some("https://rust.com".to_string()),
            None,
            None,
            None,
            Some(r#"{"title":"rust programming"}"#.to_string()),
        );
        let mem2 = Memory::new(
            Some(space2.id.clone()),
            "browser".to_string(),
            Some("https://rust.org".to_string()),
            None,
            None,
            None,
            Some(r#"{"title":"rust documentation"}"#.to_string()),
        );
        db.create_memory(&mem1).expect("Failed to create memory");
        db.create_memory(&mem2).expect("Failed to create memory");

        // Search all spaces
        let all_results = db.search_memories("rust", None).expect("Failed to search");
        assert_eq!(all_results.len(), 2);

        // Search specific space
        let space1_results = db
            .search_memories("rust", Some(&space1.id))
            .expect("Failed to search");
        assert_eq!(space1_results.len(), 1);
        assert_eq!(space1_results[0].space_id, Some(space1.id.clone()));
    }

    #[test]
    fn test_search_empty_query() {
        let db = setup_test_db();

        let memory = Memory::new(
            None,
            "browser".to_string(),
            Some("https://example.com".to_string()),
            None,
            None,
            None,
            Some(r#"{"title":"test"}"#.to_string()),
        );
        db.create_memory(&memory).expect("Failed to create memory");

        // Empty query should return empty results
        let results = db.search_memories("", None).expect("Failed to search");
        assert!(results.is_empty());

        // Whitespace-only query should return empty results
        let results = db.search_memories("   ", None).expect("Failed to search");
        assert!(results.is_empty());
    }

    #[test]
    fn test_delete_space_sets_memory_space_id_to_null() {
        let db = setup_test_db();

        // Create space and memory
        let space = Space::new("Test".to_string(), None, None);
        db.create_space(&space).expect("Failed to create space");

        let memory = Memory::new(
            Some(space.id.clone()),
            "test".to_string(),
            None,
            None,
            None,
            None,
            None,
        );
        db.create_memory(&memory).expect("Failed to create memory");

        // Delete space
        db.delete_space(&space.id).expect("Failed to delete space");

        // Memory should still exist but with space_id set to NULL (due to ON DELETE SET NULL)
        let fetched = db.get_memory(&memory.id).expect("Failed to get memory");
        assert!(fetched.is_some());
        assert_eq!(fetched.unwrap().space_id, None); // ON DELETE SET NULL behavior
    }

    #[test]
    fn test_memory_update_changes_updated_at() {
        let db = setup_test_db();

        // Create memory with a timestamp from the past
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        let past_timestamp = now - 10; // 10 seconds in the past

        let memory = Memory {
            id: nanoid::nanoid!(),
            space_id: None,
            source: "test".to_string(),
            source_id: None,
            title: None,
            summary: None,
            content: None,
            metadata: None,
            summary_title: None,
            summary_brief: None,
            summary_standard: None,
            summary_version: None,
            content_hash: None,
            last_accessed_at: None,
            access_count: None,
            created_at: past_timestamp,
            updated_at: past_timestamp,
        };
        db.create_memory(&memory).expect("Failed to create memory");

        // Update memory
        let mut updated = memory.clone();
        updated.source = "updated".to_string();
        db.update_memory(&updated).expect("Failed to update memory");

        // Verify updated_at changed to a more recent time
        let fetched = db.get_memory(&memory.id).unwrap().unwrap();
        assert!(fetched.updated_at > past_timestamp);
        assert!(fetched.updated_at >= now);
    }

    #[test]
    fn test_get_nonexistent_space() {
        let db = setup_test_db();

        let result = db.get_space("nonexistent-id").expect("Failed to query");
        assert!(result.is_none());
    }

    #[test]
    fn test_get_nonexistent_memory() {
        let db = setup_test_db();

        let result = db.get_memory("nonexistent-id").expect("Failed to query");
        assert!(result.is_none());
    }

    #[test]
    fn test_get_memory_with_tags_nonexistent() {
        let db = setup_test_db();

        let result = db.get_memory_with_tags("nonexistent-id").expect("Failed to query");
        assert!(result.is_none());
    }

    #[test]
    fn test_count_memories_empty() {
        let db = setup_test_db();

        let count = db.count_memories(None).expect("Failed to count");
        assert_eq!(count, 0);
    }
}
