import { migrate } from "drizzle-orm/postgres-js/migrator"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "../schema"

async function runMigrations() {
  const dbUrl = process.env.DATABASE_URL

  if (!dbUrl) {
    console.error("DATABASE_URL environment variable is required")
    process.exit(1)
  }

  // Create a separate postgres client for migrations
  const migrationClient = postgres(dbUrl, { max: 1 })
  const db = drizzle(migrationClient, { schema })

  console.log("Running database migrations...")

  try {
    // Run migrations from the drizzle folder
    await migrate(db, { migrationsFolder: "./drizzle" })
    console.log("Migrations completed successfully!")
  } catch (error) {
    console.error("Migration failed:", error)
    process.exit(1)
  } finally {
    await migrationClient.end()
  }
}

runMigrations()
