/**
 * Rules Schema (SQLite)
 *
 * Rules are groups of markdown guidelines that influence AI behavior.
 * They can be scoped globally, to namespaces, or to specific endpoints.
 */

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"
import { organization } from "./auth"

export const rule = sqliteTable("rule", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  priority: integer("priority").notNull().default(0),
  scope: text("scope").notNull().default("namespace"),
  isEnabled: text("isEnabled").notNull().default("true"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
})

export const ruleRelations = relations(rule, ({ one }) => ({
  organization: one(organization, {
    fields: [rule.organizationId],
    references: [organization.id],
  }),
}))
