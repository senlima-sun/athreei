-- aiii Desktop Database Schema
-- SQLite with FTS5 for full-text search

-- Spaces table: logical groupings of memories
CREATE TABLE IF NOT EXISTS spaces (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon TEXT,
    source_rules TEXT,  -- JSON rules for automatic categorization
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Index for listing spaces by name
CREATE INDEX IF NOT EXISTS idx_spaces_name ON spaces(name);

-- Memories table: the core data store
CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY NOT NULL,
    space_id TEXT REFERENCES spaces(id) ON DELETE SET NULL,
    source TEXT NOT NULL,  -- e.g., "browser", "clipboard", "manual"
    source_id TEXT,        -- source-specific identifier (e.g., URL)
    title BLOB,            -- encrypted
    summary BLOB,          -- encrypted (user-provided summary)
    content BLOB,          -- encrypted
    metadata TEXT,         -- JSON, unencrypted for FTS indexing
    -- Auto-generated multi-level summaries (extractive, unencrypted for MCP)
    summary_title TEXT,    -- 5-15 tokens, auto-generated title/headline
    summary_brief TEXT,    -- 30-60 tokens, first + key sentences
    summary_standard TEXT, -- 100-200 tokens, top sentences by score
    summary_version INTEGER DEFAULT 0,  -- incremented when regenerated
    content_hash TEXT,     -- SHA-256 truncated, for staleness detection
    -- Access tracking for context injection relevance scoring
    last_accessed_at INTEGER,  -- timestamp of last context retrieval
    access_count INTEGER DEFAULT 0,  -- number of times retrieved for context
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_memories_space_id ON memories(space_id);
CREATE INDEX IF NOT EXISTS idx_memories_source ON memories(source);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_source_id ON memories(source_id);

-- Index for finding memories with stale/missing summaries
CREATE INDEX IF NOT EXISTS idx_memories_summary_version
ON memories(summary_version) WHERE summary_version = 0 OR summary_version IS NULL;

-- Tags table: reusable tags for categorization
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- Memory-tag junction table
CREATE TABLE IF NOT EXISTS memory_tags (
    memory_id TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (memory_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_memory_tags_tag_id ON memory_tags(tag_id);

-- FTS5 virtual table for full-text search on unencrypted metadata
-- This is a standalone FTS table (not content-synced) that we manage manually
CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
    memory_id,
    source,
    source_id,
    metadata,
    tags
);

-- Triggers to keep FTS index in sync with memories table

-- Insert trigger
CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
    INSERT INTO memories_fts(memory_id, source, source_id, metadata, tags)
    VALUES (
        NEW.id,
        NEW.source,
        COALESCE(NEW.source_id, ''),
        COALESCE(NEW.metadata, ''),
        ''
    );
END;

-- Update trigger
CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
    DELETE FROM memories_fts WHERE memory_id = OLD.id;
    INSERT INTO memories_fts(memory_id, source, source_id, metadata, tags)
    SELECT
        NEW.id,
        NEW.source,
        COALESCE(NEW.source_id, ''),
        COALESCE(NEW.metadata, ''),
        COALESCE(
            (SELECT GROUP_CONCAT(t.name, ' ')
             FROM memory_tags mt
             JOIN tags t ON mt.tag_id = t.id
             WHERE mt.memory_id = NEW.id),
            ''
        );
END;

-- Delete trigger
CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
    DELETE FROM memories_fts WHERE memory_id = OLD.id;
END;

-- Trigger to update FTS when tags change
CREATE TRIGGER IF NOT EXISTS memory_tags_ai AFTER INSERT ON memory_tags BEGIN
    UPDATE memories SET updated_at = (strftime('%s', 'now'))
    WHERE id = NEW.memory_id;
END;

CREATE TRIGGER IF NOT EXISTS memory_tags_ad AFTER DELETE ON memory_tags BEGIN
    UPDATE memories SET updated_at = (strftime('%s', 'now'))
    WHERE id = OLD.memory_id;
END;

-- =============================================================================
-- Trace Collector Schema
-- =============================================================================

-- Sessions table: tracks MCP client sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL,
    client_name TEXT,
    client_version TEXT,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    last_activity_at INTEGER,
    total_tool_calls INTEGER DEFAULT 0,
    total_errors INTEGER DEFAULT 0,
    total_duration_ms INTEGER DEFAULT 0,
    end_reason TEXT CHECK (end_reason IN ('client_disconnect', 'timeout', 'explicit', 'error'))
);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_ended ON sessions(ended_at DESC);

-- Traces table: records individual MCP tool calls
CREATE TABLE IF NOT EXISTS traces (
    id TEXT PRIMARY KEY NOT NULL,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    input_params TEXT,
    output_result TEXT,
    started_at INTEGER NOT NULL,
    duration_ms INTEGER,
    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
    error_message TEXT,
    error_type TEXT,
    memory_ids TEXT,
    space_ids TEXT,
    input_size_bytes INTEGER,
    output_size_bytes INTEGER
);

-- Traces indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_traces_session ON traces(session_id, started_at);
CREATE INDEX IF NOT EXISTS idx_traces_tool ON traces(tool_name, started_at);
CREATE INDEX IF NOT EXISTS idx_traces_status ON traces(status, started_at);
CREATE INDEX IF NOT EXISTS idx_traces_started ON traces(started_at DESC);

-- =============================================================================
-- Vector Embedding Schema (sqlite-vec)
-- =============================================================================

-- Memory embeddings table: stores vector representations of memory content
CREATE TABLE IF NOT EXISTS memory_embeddings (
    memory_id TEXT PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
    embedding BLOB NOT NULL,
    model_name TEXT NOT NULL,
    dimensions INTEGER NOT NULL,
    created_at INTEGER NOT NULL
);

-- vec0 virtual table for KNN vector similarity search
-- Uses 384 dimensions matching paraphrase-multilingual-MiniLM-L12-v2
CREATE VIRTUAL TABLE IF NOT EXISTS memories_vec USING vec0(
    memory_id TEXT PRIMARY KEY,
    embedding float[384]
);

-- Trigger to sync vec0 virtual table when embeddings are inserted
CREATE TRIGGER IF NOT EXISTS sync_memories_vec_insert
AFTER INSERT ON memory_embeddings
BEGIN
    INSERT OR REPLACE INTO memories_vec(memory_id, embedding)
    VALUES (NEW.memory_id, NEW.embedding);
END;

-- Trigger to sync vec0 virtual table when embeddings are updated
CREATE TRIGGER IF NOT EXISTS sync_memories_vec_update
AFTER UPDATE ON memory_embeddings
BEGIN
    DELETE FROM memories_vec WHERE memory_id = OLD.memory_id;
    INSERT INTO memories_vec(memory_id, embedding)
    VALUES (NEW.memory_id, NEW.embedding);
END;

-- Trigger to remove from vec0 when embeddings are deleted
CREATE TRIGGER IF NOT EXISTS sync_memories_vec_delete
AFTER DELETE ON memory_embeddings
BEGIN
    DELETE FROM memories_vec WHERE memory_id = OLD.memory_id;
END;

-- =============================================================================
-- Workspace & Handoff Schema
-- =============================================================================

-- Workspaces table: goal-oriented containers for AI task tracking
CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    space_id TEXT REFERENCES spaces(id) ON DELETE SET NULL,
    goal TEXT NOT NULL,
    success_criteria TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'in_progress', 'blocked', 'paused', 'completed', 'abandoned', 'archived')),
    blocker TEXT,
    context TEXT,
    encrypted_goal BLOB,
    encrypted_context BLOB,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    completed_at INTEGER
);

-- Workspace indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_space ON workspaces(space_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_status ON workspaces(status);
CREATE INDEX IF NOT EXISTS idx_workspaces_updated ON workspaces(updated_at DESC);

-- Tasks table: individual work items within a workspace
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'in_progress', 'completed', 'blocked', 'deferred')),
    blocker TEXT,
    is_next_action INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    encrypted_title BLOB,
    encrypted_description BLOB,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    completed_at INTEGER
);

-- Task indexes
CREATE INDEX IF NOT EXISTS idx_tasks_workspace ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_next ON tasks(workspace_id, is_next_action) WHERE is_next_action = 1;
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(workspace_id, position);

-- Handoffs table: session state captures for seamless resumption
CREATE TABLE IF NOT EXISTS handoffs (
    id TEXT PRIMARY KEY NOT NULL,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    session_id TEXT,
    progress_summary TEXT NOT NULL,
    current_state TEXT NOT NULL,
    next_steps TEXT,
    blockers TEXT,
    what_worked TEXT,
    what_failed TEXT,
    key_decisions TEXT,
    encrypted_progress BLOB,
    encrypted_state BLOB,
    encrypted_learnings BLOB,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Handoff indexes
CREATE INDEX IF NOT EXISTS idx_handoffs_workspace ON handoffs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_created ON handoffs(workspace_id, created_at DESC);