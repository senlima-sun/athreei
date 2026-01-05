/**
 * Database initialization and exports
 *
 * Uses Bun's native SQLite implementation for local storage.
 * Default location: ~/.athreei/data.db
 */

import { db } from "./db-instance"
import { runMigrations } from "./migrations"

// Run migrations on startup
runMigrations(db)

// Export database instance for advanced usage
export { db, db as database }

// Export repositories
export * from "./repositories/permissions"
export * from "./repositories/audit-log"
export * from "./repositories/sessions"
