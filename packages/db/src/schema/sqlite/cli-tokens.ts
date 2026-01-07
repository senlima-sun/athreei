/**
 * CLI Token database schema (SQLite)
 *
 * These tables support CLI-Platform authentication:
 * - cliToken: Long-lived tokens (90 days) for CLI API authentication
 * - cliAuthSession: Short-lived sessions (5 min) for browser-based auth flow
 */

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"
import { user, organization } from "./auth"

// =============================================================================
// CLI Token Table
// =============================================================================

/**
 * CLI Token - stores hashed authentication tokens for CLI access
 *
 * Token is hashed (SHA-256) before storage. The plaintext token is only
 * shown once during creation and cannot be retrieved.
 */
export const cliToken = sqliteTable("cli_token", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organization.id, {
    onDelete: "cascade",
  }),
  name: text("name"),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
})

// =============================================================================
// CLI Auth Session Table
// =============================================================================

/**
 * CLI Auth Session - temporary sessions for browser-based authentication flow
 *
 * Flow:
 * 1. CLI creates session with unique state and callback port
 * 2. User authenticates in browser
 * 3. Browser redirects to CLI callback with auth result
 * 4. CLI exchanges session for long-lived token
 */
export const cliAuthSession = sqliteTable("cli_auth_session", {
  id: text("id").primaryKey(),
  state: text("state").notNull().unique(),
  callbackPort: integer("callback_port").notNull(),
  userId: text("user_id").references(() => user.id),
  organizationId: text("organization_id"),
  status: text("status", {
    enum: ["pending", "authorized", "used", "expired"],
  })
    .notNull()
    .default("pending"),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
})

// =============================================================================
// Relations
// =============================================================================

export const cliTokenRelations = relations(cliToken, ({ one }) => ({
  user: one(user, {
    fields: [cliToken.userId],
    references: [user.id],
  }),
  organization: one(organization, {
    fields: [cliToken.organizationId],
    references: [organization.id],
  }),
}))

export const cliAuthSessionRelations = relations(cliAuthSession, ({ one }) => ({
  user: one(user, {
    fields: [cliAuthSession.userId],
    references: [user.id],
  }),
}))
