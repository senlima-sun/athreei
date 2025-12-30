#!/usr/bin/env bun
/**
 * Seed runner for MCP Registry
 *
 * Usage:
 *   bun run seed                    # Seed with a demo organization
 *   bun run seed <organizationId>   # Seed with specific organization
 *
 * Environment:
 *   DATABASE_URL - Required. PostgreSQL or SQLite connection string.
 */

import { createClient, detectDatabaseType, getSchema } from "../client";
import { getMcpServerSeedData, validateSeedData, openSourceMcpServers } from "./mcp-registry";

async function main() {
  const organizationId = process.argv[2];

  if (!organizationId) {
    console.error("Error: Organization ID is required");
    console.error("Usage: bun run seed <organizationId>");
    process.exit(1);
  }

  // Validate seed data before attempting to insert
  const validation = validateSeedData(openSourceMcpServers);
  if (!validation.valid) {
    console.error("Seed data validation failed:");
    for (const error of validation.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Error: DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const dbType = detectDatabaseType(databaseUrl);
  console.log(`Database type: ${dbType}`);
  console.log(`Seeding MCP servers for organization: ${organizationId}`);

  try {
    const db = createClient(databaseUrl);
    const schema = getSchema(dbType);
    const seedData = getMcpServerSeedData(organizationId);

    console.log(`\nInserting ${seedData.length} MCP servers...`);

    // Insert each server
    for (const server of seedData) {
      await db.insert(schema.mcpServer).values(server);
      console.log(`  + ${server.name}`);
    }

    console.log("\nSeed completed successfully!");
    console.log(`Inserted ${seedData.length} MCP servers.`);
  } catch (error) {
    console.error("Failed to seed database:", error);
    process.exit(1);
  }
}

main();
