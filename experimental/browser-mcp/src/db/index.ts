/**
 * Database initialization and exports
 *
 * Uses Bun's native SQLite implementation for local storage.
 * Default location: ~/.athreei/data.db
 */

import { db } from "./db-instance"
import { runMigrations } from "./migrations"

runMigrations(db)

export { db, db as database }

export * from "./repositories/permissions"
export * from "./repositories/audit-log"
export * from "./repositories/sessions"
