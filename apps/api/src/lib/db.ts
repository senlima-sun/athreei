import { getDb, createClient, type DatabaseClient } from "@athreei/db"

export { getDb, createClient, type DatabaseClient }

export function initDatabase(): DatabaseClient {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required")
  }
  return createClient(databaseUrl)
}
