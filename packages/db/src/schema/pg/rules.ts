/**
 * Rules Schema (PostgreSQL)
 *
 * Rules are groups of markdown guidelines that influence AI behavior.
 * They can be scoped globally, to namespaces, or to specific endpoints.
 */

import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { organization } from "./auth"

export const rule = pgTable("rule", {
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
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
})

export const ruleRelations = relations(rule, ({ one }) => ({
  organization: one(organization, {
    fields: [rule.organizationId],
    references: [organization.id],
  }),
}))
