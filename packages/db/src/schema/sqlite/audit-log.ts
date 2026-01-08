/**
 * Audit Log Schema (SQLite)
 *
 * Stores audit events for organization activities like MCP server changes,
 * member management, and API key operations.
 */

import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"
import { organization, user } from "./auth"

/**
 * Audit Log - stores audit events for organization activities
 */
export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    action: text("action").notNull(), // e.g., "mcp_server.created", "member.invited"
    actorId: text("actorId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetType: text("targetType").notNull(), // e.g., "mcp_server", "member", "api_key"
    targetId: text("targetId").notNull(),
    metadata: text("metadata"), // JSON string with additional details
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("audit_log_organization_idx").on(table.organizationId),
    index("audit_log_actor_idx").on(table.actorId),
    index("audit_log_action_idx").on(table.action),
    index("audit_log_created_at_idx").on(table.createdAt),
  ]
)

// =============================================================================
// Relations
// =============================================================================

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  organization: one(organization, {
    fields: [auditLog.organizationId],
    references: [organization.id],
  }),
  actor: one(user, {
    fields: [auditLog.actorId],
    references: [user.id],
  }),
}))
