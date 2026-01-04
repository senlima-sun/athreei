/**
 * Database client setup
 *
 * Re-exports the database client from @athreei/db for use in the API server.
 */

import { getDb, createClient, type DatabaseClient } from "@athreei/db"

export { getDb, createClient, type DatabaseClient }

/**
 * Initialize database connection.
 * Should be called at server startup.
 */
export function initDatabase(): DatabaseClient {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required")
  }
  return createClient(databaseUrl)
}
