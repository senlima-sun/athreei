#!/usr/bin/env bun
/**
 * Migrate Registry to Marketplace
 *
 * One-time migration script that:
 * 1. Creates the system marketplace (if not exists)
 * 2. Reads the MCP registry JSON file
 * 3. Transforms entries to plugins with mcp_server components
 * 4. Inserts into marketplace tables
 *
 * Usage:
 *   bun run migrate-registry                    # Use default registry path
 *   bun run migrate-registry <registry-path>   # Use custom registry path
 *
 * Environment:
 *   DATABASE_URL - Required. PostgreSQL or SQLite connection string.
 */

import { readFileSync } from "fs"
import { eq } from "drizzle-orm"
import {
  createPgClient,
  createSqliteClient,
  detectDatabaseType,
} from "../client"
import * as pgSchema from "../schema/pg"
import * as sqliteSchema from "../schema/sqlite"
import {
  getSystemMarketplaceSeedData,
  SYSTEM_MARKETPLACE_ID,
} from "./system-marketplace"
import {
  parseRegistryJson,
  transformRegistryServers,
  type TransformedPlugin,
} from "./registry-to-marketplace"

const DEFAULT_REGISTRY_PATH = new URL(
  "../../../../registry/mcp-servers.json",
  import.meta.url
).pathname

interface MigrationResult {
  marketplaceCreated: boolean
  pluginsInserted: number
  pluginsSkipped: number
  errors: string[]
}

async function migratePostgres(
  db: ReturnType<typeof createPgClient>,
  transformedPlugins: TransformedPlugin[]
): Promise<MigrationResult> {
  const result: MigrationResult = {
    marketplaceCreated: false,
    pluginsInserted: 0,
    pluginsSkipped: 0,
    errors: [],
  }

  const existingMarketplace = await db.query.marketplace.findFirst({
    where: eq(pgSchema.marketplace.id, SYSTEM_MARKETPLACE_ID),
  })

  if (!existingMarketplace) {
    const marketplaceData = getSystemMarketplaceSeedData()
    await db.insert(pgSchema.marketplace).values(marketplaceData)
    result.marketplaceCreated = true
    console.log("  + Created system marketplace: public-mcp-servers")
  } else {
    console.log("  ~ System marketplace already exists")
  }

  for (const { plugin, version, component } of transformedPlugins) {
    const existingPlugin = await db.query.plugin.findFirst({
      where: eq(pgSchema.plugin.slug, plugin.slug),
    })

    if (existingPlugin) {
      console.log(`  ~ Skipping existing plugin: ${plugin.slug}`)
      result.pluginsSkipped++
      continue
    }

    try {
      await db.insert(pgSchema.plugin).values(plugin)
      await db.insert(pgSchema.pluginVersion).values(version)
      await db.insert(pgSchema.pluginComponent).values(component)
      console.log(`  + Inserted plugin: ${plugin.name}`)
      result.pluginsInserted++
    } catch (error) {
      const msg = `Failed to insert ${plugin.slug}: ${error instanceof Error ? error.message : String(error)}`
      result.errors.push(msg)
      console.error(`  ! ${msg}`)
    }
  }

  return result
}

async function migrateSqlite(
  db: ReturnType<typeof createSqliteClient>,
  transformedPlugins: TransformedPlugin[]
): Promise<MigrationResult> {
  const result: MigrationResult = {
    marketplaceCreated: false,
    pluginsInserted: 0,
    pluginsSkipped: 0,
    errors: [],
  }

  const existingMarketplace = await db.query.marketplace.findFirst({
    where: eq(sqliteSchema.marketplace.id, SYSTEM_MARKETPLACE_ID),
  })

  if (!existingMarketplace) {
    const marketplaceData = getSystemMarketplaceSeedData()
    await db.insert(sqliteSchema.marketplace).values(marketplaceData)
    result.marketplaceCreated = true
    console.log("  + Created system marketplace: public-mcp-servers")
  } else {
    console.log("  ~ System marketplace already exists")
  }

  for (const { plugin, version, component } of transformedPlugins) {
    const existingPlugin = await db.query.plugin.findFirst({
      where: eq(sqliteSchema.plugin.slug, plugin.slug),
    })

    if (existingPlugin) {
      console.log(`  ~ Skipping existing plugin: ${plugin.slug}`)
      result.pluginsSkipped++
      continue
    }

    try {
      await db.insert(sqliteSchema.plugin).values(plugin)
      await db.insert(sqliteSchema.pluginVersion).values(version)
      await db.insert(sqliteSchema.pluginComponent).values(component)
      console.log(`  + Inserted plugin: ${plugin.name}`)
      result.pluginsInserted++
    } catch (error) {
      const msg = `Failed to insert ${plugin.slug}: ${error instanceof Error ? error.message : String(error)}`
      result.errors.push(msg)
      console.error(`  ! ${msg}`)
    }
  }

  return result
}

async function main() {
  const registryPath = process.argv[2] || DEFAULT_REGISTRY_PATH

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("Error: DATABASE_URL environment variable is required")
    process.exit(1)
  }

  console.log("Registry to Marketplace Migration")
  console.log("==================================")
  console.log(`Registry path: ${registryPath}`)

  let registryJson: string
  try {
    registryJson = readFileSync(registryPath, "utf-8")
  } catch {
    console.error(`Error: Could not read registry file at ${registryPath}`)
    process.exit(1)
  }

  const registry = parseRegistryJson(registryJson)
  console.log(`Found ${registry.servers.length} servers in registry`)

  const transformedPlugins = transformRegistryServers(registry.servers)
  console.log(`Transformed ${transformedPlugins.length} plugins`)

  const dbType = detectDatabaseType(databaseUrl)
  console.log(`\nDatabase type: ${dbType}`)
  console.log("Starting migration...\n")

  let result: MigrationResult

  if (dbType === "postgresql") {
    const db = createPgClient(databaseUrl)
    result = await migratePostgres(db, transformedPlugins)
  } else {
    const db = createSqliteClient(databaseUrl)
    result = await migrateSqlite(db, transformedPlugins)
  }

  console.log("\n==================================")
  console.log("Migration Summary")
  console.log("==================================")
  console.log(
    `Marketplace created: ${result.marketplaceCreated ? "Yes" : "No (already existed)"}`
  )
  console.log(`Plugins inserted: ${result.pluginsInserted}`)
  console.log(`Plugins skipped: ${result.pluginsSkipped}`)
  console.log(`Errors: ${result.errors.length}`)

  if (result.errors.length > 0) {
    console.error("\nErrors encountered:")
    for (const error of result.errors) {
      console.error(`  - ${error}`)
    }
    process.exit(1)
  }

  console.log("\nMigration completed successfully!")
}

main()
