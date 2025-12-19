/**
 * Database migration system
 *
 * Tracks and applies migrations in order.
 * Migrations are stored in the _migrations table.
 */

import type { Database } from "bun:sqlite"

interface Migration {
  id: number
  name: string
  sql: string
}

// Define all migrations in order
const migrations: Migration[] = [
  {
    id: 1,
    name: "initial_schema",
    sql: `
      -- Permissions table
      CREATE TABLE permissions (
        id TEXT PRIMARY KEY,
        origin TEXT NOT NULL,
        tool TEXT NOT NULL,
        allowed INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(origin, tool)
      );

      -- Indexes for permissions
      CREATE INDEX idx_permissions_origin ON permissions(origin);
      CREATE INDEX idx_permissions_tool ON permissions(tool);
      CREATE INDEX idx_permissions_origin_tool ON permissions(origin, tool);

      -- Audit log table
      CREATE TABLE audit_log (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        ai_app TEXT,
        tool TEXT NOT NULL,
        origin TEXT,
        args TEXT,
        result TEXT,
        status TEXT NOT NULL
      );

      -- Indexes for audit log
      CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);
      CREATE INDEX idx_audit_log_origin ON audit_log(origin);
      CREATE INDEX idx_audit_log_tool ON audit_log(tool);
      CREATE INDEX idx_audit_log_status ON audit_log(status);
      CREATE INDEX idx_audit_log_ai_app ON audit_log(ai_app);

      -- Sessions table
      CREATE TABLE sessions (
        id TEXT PRIMARY KEY,
        tab_id INTEGER,
        origin TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        ended_at INTEGER,
        metadata TEXT
      );

      -- Indexes for sessions
      CREATE INDEX idx_sessions_origin ON sessions(origin);
      CREATE INDEX idx_sessions_tab_id ON sessions(tab_id);
      CREATE INDEX idx_sessions_started_at ON sessions(started_at);
      CREATE INDEX idx_sessions_ended_at ON sessions(ended_at);
    `,
  },
]

/**
 * Run all pending migrations
 */
export function runMigrations(db: Database): void {
  // Create migrations tracking table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    )
  `)

  // Get already applied migrations
  const appliedMigrations = db
    .query<{ id: number }, []>("SELECT id FROM _migrations ORDER BY id")
    .all()
  const appliedIds = new Set(appliedMigrations.map((m) => m.id))

  // Apply pending migrations
  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) {
      continue // Already applied
    }

    console.log(`Applying migration ${migration.id}: ${migration.name}`)

    // Run migration in a transaction
    db.transaction(() => {
      // Execute migration SQL
      db.exec(migration.sql)

      // Record migration as applied
      db
        .query(
          "INSERT INTO _migrations (id, name, applied_at) VALUES (?, ?, ?)"
        )
        .run(migration.id, migration.name, Date.now())
    })()

    console.log(`Migration ${migration.id} applied successfully`)
  }
}
