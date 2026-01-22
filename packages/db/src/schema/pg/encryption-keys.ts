/**
 * Encryption Keys Schema (PostgreSQL)
 *
 * Stores encryption keys for gateway trace synchronization.
 */

import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { organization, user } from "./auth"

export const encryptionKey = pgTable("encryption_key", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  createdById: text("createdById")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("keyHash").notNull().unique(),
  keyPrefix: text("keyPrefix").notNull(),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("active"),
  rotatedAt: timestamp("rotatedAt"),
  revokedAt: timestamp("revokedAt"),
  revokedById: text("revokedById").references(() => user.id),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
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
