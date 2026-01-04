import { defineConfig } from "drizzle-kit"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required")
}

const isPostgres =
  databaseUrl.startsWith("postgres://") ||
  databaseUrl.startsWith("postgresql://")

export default defineConfig({
  // Use dialect-specific schema paths
  schema: isPostgres
    ? "./src/schema/pg/index.ts"
    : "./src/schema/sqlite/index.ts",
  out: "./drizzle",
  dialect: isPostgres ? "postgresql" : "sqlite",
  dbCredentials: isPostgres
    ? { url: databaseUrl }
    : { url: databaseUrl.replace(/^file:/, "") },
})
