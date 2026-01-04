/**
 * MCP Server Registry Schema (PostgreSQL)
 */

import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { organization } from "./auth"

export const mcpServer = pgTable("mcp_server", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  transport: text("transport").notNull(),
  command: text("command"),
  args: text("args"),
  url: text("url"),
  status: text("status").notNull().default("active"),
  lastSeenAt: timestamp("lastSeenAt"),
  version: text("version"),
  capabilities: text("capabilities"),
  // Encrypted environment variables (AES-256-GCM encrypted JSON)
  encryptedEnv: text("encrypted_env"),
  envKeyVersion: integer("env_key_version"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
})

export const mcpTool = pgTable("mcp_tool", {
  id: text("id").primaryKey(),
  serverId: text("serverId")
    .notNull()
    .references(() => mcpServer.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  inputSchema: text("inputSchema"),
  customDescription: text("customDescription"),
  customPrompt: text("customPrompt"),
  isEnabled: text("isEnabled").notNull().default("true"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
})

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
