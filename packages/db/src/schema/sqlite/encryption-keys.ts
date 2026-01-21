/**
 * Encryption Keys Schema (SQLite)
 *
 * Stores encryption keys for gateway trace synchronization.
 */

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"
import { organization, user } from "./auth"

export const encryptionKey = sqliteTable("encryption_key", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  createdById: text("createdById")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("keyHash").notNull(),
  keyPrefix: text("keyPrefix").notNull(),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("active"),
  rotatedAt: integer("rotatedAt", { mode: "timestamp" }),
  revokedAt: integer("revokedAt", { mode: "timestamp" }),
  revokedById: text("revokedById").references(() => user.id),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
})

export const encryptionKeyRelations = relations(encryptionKey, ({ one }) => ({
  organization: one(organization, {
    fields: [encryptionKey.organizationId],
    references: [organization.id],
  }),
  createdBy: one(user, {
    fields: [encryptionKey.createdById],
    references: [user.id],
  }),
  revokedBy: one(user, {
    fields: [encryptionKey.revokedById],
    references: [user.id],
  }),
}))
