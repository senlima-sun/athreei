import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js"
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3"
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js"
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3"
import postgres from "postgres"
import Database from "better-sqlite3"
import * as pgSchema from "./schema/pg"
import * as sqliteSchema from "./schema/sqlite"

export type PgDatabase = PostgresJsDatabase<typeof pgSchema>
export type SqliteDatabase = BetterSQLite3Database<typeof sqliteSchema>

export type DatabaseClient = PgDatabase | SqliteDatabase

export type DatabaseType = "postgresql" | "sqlite"

export type DbSchema = typeof pgSchema | typeof sqliteSchema
export type PgSchema = typeof pgSchema
export type SqliteSchema = typeof sqliteSchema

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
 * Creates a PostgreSQL-only Drizzle database client.
 * Use this when you know you're connecting to PostgreSQL.
 */
export function createPgClient(databaseUrl?: string): PgDatabase {
  const url = databaseUrl ?? process.env.DATABASE_URL

  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is required or must be passed as argument"
    )
  }

  const client = postgres(url)
  return drizzlePostgres(client, { schema: pgSchema })
}

/**
 * Creates a SQLite-only Drizzle database client.
 * Use this when you know you're connecting to SQLite.
 */
export function createSqliteClient(databaseUrl?: string): SqliteDatabase {
  const url = databaseUrl ?? process.env.DATABASE_URL

  if (!url) {
    throw new Error(
      "DATABASE_URL environment variable is required or must be passed as argument"
    )
  }

  const sqlitePath = url.replace(/^file:/, "")
  const sqlite = new Database(sqlitePath)
  return drizzleSqlite(sqlite, { schema: sqliteSchema })
}

/**
 * Global database client instance.
 * Lazily initialized on first access.
 */
let _db: DatabaseClient | null = null
let _dbType: DatabaseType | null = null

/**
 * Gets the shared database client instance.
 * Creates a new client if one doesn't exist.
 */
export function getDb(): DatabaseClient {
  if (!_db) {
    _db = createClient()
    _dbType = detectDatabaseType(process.env.DATABASE_URL ?? "")
  }
  return _db
}

/**
 * Gets the shared database client typed for PostgreSQL.
 * Throws if DATABASE_URL is not a PostgreSQL connection.
 */
export function getPgDb(): PgDatabase {
  const url = process.env.DATABASE_URL ?? ""
  if (detectDatabaseType(url) !== "postgresql") {
    throw new Error("getPgDb() requires a PostgreSQL DATABASE_URL")
  }
  return getDb() as PgDatabase
}

/**
 * Gets the shared database client typed for SQLite.
 * Throws if DATABASE_URL is not a SQLite connection.
 */
export function getSqliteDb(): SqliteDatabase {
  const url = process.env.DATABASE_URL ?? ""
  if (detectDatabaseType(url) !== "sqlite") {
    throw new Error("getSqliteDb() requires a SQLite DATABASE_URL")
  }
  return getDb() as SqliteDatabase
}

/**
 * Returns the current database type.
 */
export function getDbType(): DatabaseType {
  if (!_dbType) {
    _dbType = detectDatabaseType(process.env.DATABASE_URL ?? "")
  }
  return _dbType
}

/**
 * Resets the global database client.
 * Useful for testing or when switching databases.
 */
export function resetDb(): void {
  _db = null
  _dbType = null
}
