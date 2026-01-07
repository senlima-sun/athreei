/**
 * CLI Token database schema (PostgreSQL)
 *
 * These tables support CLI-Platform authentication:
 * - cliToken: Long-lived tokens (90 days) for CLI API authentication
 * - cliAuthSession: Short-lived sessions (5 min) for browser-based auth flow
 */

import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core"
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
export const cliToken = pgTable("cli_token", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  organizationId: text("organization_id").references(() => organization.id, {
    onDelete: "cascade",
  }),
  name: text("name"),
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
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
export const cliAuthSession = pgTable("cli_auth_session", {
  id: text("id").primaryKey(),
  state: text("state").notNull(),
  callbackPort: integer("callback_port").notNull(),
  userId: text("user_id").references(() => user.id),
  organizationId: text("organization_id"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
