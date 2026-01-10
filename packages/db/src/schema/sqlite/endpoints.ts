/**
 * Endpoints & API Keys Schema (SQLite)
 *
 * Stores API endpoints and their associated API keys for authentication.
 */

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"
import { organization, user } from "./auth"

/**
 * Endpoint - registered API endpoints
 */
export const endpoint = sqliteTable("endpoint", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  // Endpoint configuration
  url: text("url").notNull(),
  method: text("method").notNull().default("POST"), // GET, POST, etc.
  // Authentication
  authType: text("authType").notNull().default("api_key"), // api_key, oauth, none
  // Rate limiting
  rateLimit: integer("rateLimit"), // requests per minute
  // Status
  status: text("status").notNull().default("active"), // active, inactive
  // Timestamps
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
})

/**
 * API Key - authentication keys for accessing the API
 */
export const apiKey = sqliteTable("api_key", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  endpointId: text("endpointId").references(() => endpoint.id, {
    onDelete: "cascade",
  }),
  createdById: text("createdById")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // Key is stored as a hash, the actual key is only shown once at creation
  keyHash: text("keyHash").notNull(),
  keyPrefix: text("keyPrefix").notNull(), // First 8 chars for identification
  // Permissions
  scopes: text("scopes"), // JSON array of allowed scopes
  // Expiration
  expiresAt: integer("expiresAt", { mode: "timestamp" }),
  // Usage tracking
  lastUsedAt: integer("lastUsedAt", { mode: "timestamp" }),
  usageCount: integer("usageCount").notNull().default(0),
  // Status
  revokedAt: integer("revokedAt", { mode: "timestamp" }),
  revokedById: text("revokedById").references(() => user.id),
  // Timestamps
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
})

export const endpointRelations = relations(endpoint, ({ one, many }) => ({
  organization: one(organization, {
    fields: [endpoint.organizationId],
    references: [organization.id],
  }),
  apiKeys: many(apiKey),
}))

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
  organization: one(organization, {
    fields: [apiKey.organizationId],
    references: [organization.id],
  }),
  endpoint: one(endpoint, {
    fields: [apiKey.endpointId],
    references: [endpoint.id],
  }),
  createdBy: one(user, {
    fields: [apiKey.createdById],
    references: [user.id],
  }),
  revokedBy: one(user, {
    fields: [apiKey.revokedById],
    references: [user.id],
  }),
}))
