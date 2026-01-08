/**
 * Permissions Schema (PostgreSQL)
 *
 * Controls which AI applications (by origin) can access specific tools.
 */

import { pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { organization } from "./auth"

/**
 * Permission - tool access control per origin
 */
export const permission = pgTable("permission", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  origin: text("origin").notNull(), // e.g., "claude.ai", "chatgpt.com"
  tool: text("tool").notNull(), // e.g., "browser_screenshot", "file_read"
  allowed: text("allowed").notNull().default("ask"), // "allowed" | "denied" | "ask"
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
})

// =============================================================================
// Relations
// =============================================================================

export const permissionRelations = relations(permission, ({ one }) => ({
  organization: one(organization, {
    fields: [permission.organizationId],
    references: [organization.id],
  }),
}))
