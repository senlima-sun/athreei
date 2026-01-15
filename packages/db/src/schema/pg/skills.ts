/**
 * Skills Schema (PostgreSQL)
 *
 * Skills are groups of markdown instructions that define AI capabilities.
 * They can be assigned to namespaces to customize AI behavior.
 */

import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { organization } from "./auth"

export const skill = pgTable("skill", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  tags: text("tags"),
  isEnabled: text("isEnabled").notNull().default("true"),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
})

export const skillRelations = relations(skill, ({ one }) => ({
  organization: one(organization, {
    fields: [skill.organizationId],
    references: [organization.id],
  }),
}))
