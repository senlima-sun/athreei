/**
 * Permissions Schema (SQLite)
 *
 * Controls which AI applications (by origin) can access specific tools.
 */

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"
import { organization } from "./auth"

/**
 * Permission - tool access control per origin
 */
export const permission = sqliteTable("permission", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  origin: text("origin").notNull(), // e.g., "claude.ai", "chatgpt.com"
  tool: text("tool").notNull(), // e.g., "browser_screenshot", "file_read"
  allowed: text("allowed").notNull().default("ask"), // "allowed" | "denied" | "ask"
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
})

export const permissionRelations = relations(permission, ({ one }) => ({
  organization: one(organization, {
    fields: [permission.organizationId],
    references: [organization.id],
  }),
}))
