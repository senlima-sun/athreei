/**
 * MCP Server Registry Schema (SQLite)
 *
 * Stores registered MCP servers and their configurations.
 */

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"
import { organization } from "./auth"

/**
 * MCP Server - registered MCP server instances
 */
export const mcpServer = sqliteTable("mcp_server", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  // Server configuration
  transport: text("transport").notNull(), // stdio, sse, websocket
  command: text("command"), // For stdio transport
  args: text("args"), // JSON array of arguments
  url: text("url"), // For SSE/WebSocket transport
  // Status
  status: text("status").notNull().default("active"), // active, inactive, error
  lastSeenAt: integer("lastSeenAt", { mode: "timestamp" }),
  // Metadata
  version: text("version"),
  capabilities: text("capabilities"), // JSON array of supported capabilities
  // Encrypted environment variables (AES-256-GCM encrypted JSON)
  encryptedEnv: text("encrypted_env"),
  envKeyVersion: integer("env_key_version"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
})

/**
 * MCP Tool - tools exposed by an MCP server
 */
export const mcpTool = sqliteTable("mcp_tool", {
  id: text("id").primaryKey(),
  serverId: text("serverId")
    .notNull()
    .references(() => mcpServer.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  inputSchema: text("inputSchema"), // JSON schema for tool input
  customDescription: text("customDescription"),
  customPrompt: text("customPrompt"),
  isEnabled: text("isEnabled").notNull().default("true"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
})

// =============================================================================
// Relations
// =============================================================================

export const mcpServerRelations = relations(mcpServer, ({ one, many }) => ({
  organization: one(organization, {
    fields: [mcpServer.organizationId],
    references: [organization.id],
  }),
  tools: many(mcpTool),
}))

export const mcpToolRelations = relations(mcpTool, ({ one }) => ({
  server: one(mcpServer, {
    fields: [mcpTool.serverId],
    references: [mcpServer.id],
  }),
}))
