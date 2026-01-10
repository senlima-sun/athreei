import { getDb, type PgDatabase } from "./db"

export function db(): PgDatabase {
  return getDb() as PgDatabase
}
