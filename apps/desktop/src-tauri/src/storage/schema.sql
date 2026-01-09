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
    summary BLOB,          -- encrypted
    content BLOB,          -- encrypted
    metadata TEXT,         -- JSON, unencrypted for FTS indexing
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_memories_space_id ON memories(space_id);
CREATE INDEX IF NOT EXISTS idx_memories_source ON memories(source);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_source_id ON memories(source_id);

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
