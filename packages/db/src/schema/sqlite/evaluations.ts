/**
 * Evaluations Schema (SQLite)
 *
 * Evaluations store user feedback on AI outputs, linked to traces.
 * This enables measuring skill/rule effectiveness over time.
 */

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"
import { organization, user } from "./auth"
import { trace } from "./traces"

export const evaluation = sqliteTable("evaluation", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  traceId: text("traceId")
    .notNull()
    .references(() => trace.id, { onDelete: "cascade" }),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(),
  feedback: text("feedback"),
  activeSkillIds: text("activeSkillIds"),
  activeRuleIds: text("activeRuleIds"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
})

export const evaluationRelations = relations(evaluation, ({ one }) => ({
  organization: one(organization, {
    fields: [evaluation.organizationId],
    references: [organization.id],
  }),
  trace: one(trace, {
    fields: [evaluation.traceId],
    references: [trace.id],
  }),
  user: one(user, {
    fields: [evaluation.userId],
    references: [user.id],
  }),
}))
