/**
 * OAuth Token Storage Schema (PostgreSQL)
 *
 * Stores OAuth tokens and session state for MCP server authentication.
 * Tokens are encrypted at rest using application-level encryption.
 */

import { pgTable, text, timestamp, integer, unique } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { user } from "../pg/auth"

// =============================================================================
// OAuth Session Table
// =============================================================================

/**
 * Temporary storage for OAuth flow state during authorization.
 * Records are short-lived (5 minute TTL) and deleted after callback.
 */
export const oauthSession = pgTable("oauth_session", {
  // Primary key: OAuth state parameter (cryptographically random)
  id: text("id").primaryKey(),

  // User initiating the OAuth flow
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),

  // Provider name (e.g., "Sentry", "GitHub")
  provider: text("provider").notNull(),

  // MCP server URL being authenticated
  serverUrl: text("server_url").notNull(),

  // PKCE code verifier (encrypted)
  encryptedCodeVerifier: text("encrypted_code_verifier").notNull(),

  // Redirect URI used for this flow
  redirectUri: text("redirect_uri").notNull(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
})

// =============================================================================
// OAuth Token Table
// =============================================================================

/**
 * Persistent storage for OAuth tokens.
 * Each user can have one token per MCP server URL.
 */
export const oauthToken = pgTable(
  "oauth_token",
  {
    id: text("id").primaryKey(),

    // Token owner
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),

    // Provider name for display
    provider: text("provider").notNull(),

    // MCP server URL this token authenticates
    serverUrl: text("server_url").notNull(),

    // Encrypted tokens (AES-256-GCM)
    encryptedAccessToken: text("encrypted_access_token").notNull(),
    encryptedRefreshToken: text("encrypted_refresh_token"),

    // Token metadata
    expiresAt: timestamp("expires_at"),
    scope: text("scope"),

    // Encryption key version (for key rotation)
    keyVersion: integer("key_version").default(1).notNull(),

    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    // Unique constraint: one token per user per server
    unique("oauth_token_user_server_unique").on(table.userId, table.serverUrl),
  ]
)

// =============================================================================
// Relations
// =============================================================================

export const oauthSessionRelations = relations(oauthSession, ({ one }) => ({
  user: one(user, {
    fields: [oauthSession.userId],
    references: [user.id],
  }),
}))

export const oauthTokenRelations = relations(oauthToken, ({ one }) => ({
  user: one(user, {
    fields: [oauthToken.userId],
    references: [user.id],
  }),
}))
