import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js"
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3"
import postgres from "postgres"
import Database from "better-sqlite3"
import * as pgSchema from "./schema/pg"
import * as sqliteSchema from "./schema/sqlite"

export type DatabaseClient =
  | ReturnType<typeof drizzlePostgres<typeof pgSchema>>
  | ReturnType<typeof drizzleSqlite<typeof sqliteSchema>>

export type DatabaseType = "postgresql" | "sqlite"

/**
 * Detects the database type from the connection URL.
 *
 * - postgres:// or postgresql:// -> PostgreSQL
 * - file: or any other path -> SQLite
 */
export function detectDatabaseType(url: string): DatabaseType {
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    return "postgresql"
  }
  return "sqlite"
}

/**
 * Get the schema for the current database type
 */
export function getSchema(dbType: DatabaseType) {
  return dbType === "postgresql" ? pgSchema : sqliteSchema
}

/**
 * Creates a Drizzle database client based on the DATABASE_URL.
 *
 * Supports:
 * - PostgreSQL: postgres://user:pass@host:port/db
 * - SQLite: file:./path/to/db.sqlite or ./path/to/db.sqlite
 */
export function createClient(databaseUrl?: string): DatabaseClient {
  const url = databaseUrl ?? process.env.DATABASE_URL

  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is required or must be passed as argument"
    )
  }

  const dbType = detectDatabaseType(url)

  if (dbType === "postgresql") {
    const client = postgres(url)
    return drizzlePostgres(client, { schema: pgSchema })
  }

  // SQLite: strip file: prefix if present
  const sqlitePath = url.replace(/^file:/, "")
  const sqlite = new Database(sqlitePath)
  return drizzleSqlite(sqlite, { schema: sqliteSchema })
}

/**
 * Global database client instance.
 * Lazily initialized on first access.
 */
let _db: DatabaseClient | null = null

/**
 * Gets the shared database client instance.
 * Creates a new client if one doesn't exist.
 */
export function getDb(): DatabaseClient {
  if (!_db) {
    _db = createClient()
  }
  return _db
}

/**
 * Resets the global database client.
 * Useful for testing or when switching databases.
 */
export function resetDb(): void {
  _db = null
}
