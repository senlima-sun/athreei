/**
 * Endpoints & API Keys Schema (PostgreSQL)
 */

import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organization, user } from "./auth";

export const endpoint = pgTable("endpoint", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  url: text("url").notNull(),
  method: text("method").notNull().default("POST"),
  authType: text("authType").notNull().default("api_key"),
  rateLimit: integer("rateLimit"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const apiKey = pgTable("api_key", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  endpointId: text("endpointId").references(() => endpoint.id, {
    onDelete: "cascade",
  }),
  createdById: text("createdById")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  keyHash: text("keyHash").notNull(),
  keyPrefix: text("keyPrefix").notNull(),
  scopes: text("scopes"),
  expiresAt: timestamp("expiresAt"),
  lastUsedAt: timestamp("lastUsedAt"),
  usageCount: integer("usageCount").notNull().default(0),
  revokedAt: timestamp("revokedAt"),
  revokedById: text("revokedById").references(() => user.id),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const endpointRelations = relations(endpoint, ({ one, many }) => ({
  organization: one(organization, {
    fields: [endpoint.organizationId],
    references: [organization.id],
  }),
  apiKeys: many(apiKey),
}));

export const apiKeyRelations = relations(apiKey, ({ one }) => ({
  organization: one(organization, {
    fields: [apiKey.organizationId],
    references: [organization.id],
  }),
  endpoint: one(endpoint, {
    fields: [apiKey.endpointId],
    references: [endpoint.id],
  }),
  createdBy: one(user, {
    fields: [apiKey.createdById],
    references: [user.id],
  }),
  revokedBy: one(user, {
    fields: [apiKey.revokedById],
    references: [user.id],
  }),
}));
