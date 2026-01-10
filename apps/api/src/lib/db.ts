import {
  getDb,
  getPgDb,
  getSqliteDb,
  getDbType,
  createClient,
  createPgClient,
  createSqliteClient,
  type DatabaseClient,
  type PgDatabase,
  type SqliteDatabase,
  type DatabaseType,
} from "@athreei/db"

export {
  getDb,
  getPgDb,
  getSqliteDb,
  getDbType,
  createClient,
  createPgClient,
  createSqliteClient,
  type DatabaseClient,
  type PgDatabase,
  type SqliteDatabase,
  type DatabaseType,
}

export function initDatabase(): DatabaseClient {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required")
  }
  return createClient(databaseUrl)
}
