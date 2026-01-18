/**
 * Organization Marketplace Settings Schema (SQLite)
 * Controls marketplace and plugin restrictions per organization
 */

import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"
import { organization } from "./auth"

export const organizationMarketplaceSetting = sqliteTable(
  "organization_marketplace_setting",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    restrictMarketplaces: integer("restrict_marketplaces", { mode: "boolean" })
      .notNull()
      .default(false),
    allowedMarketplaceIds: text("allowed_marketplace_ids")
      .notNull()
      .default("[]"),
    restrictPlugins: integer("restrict_plugins", { mode: "boolean" })
      .notNull()
      .default(false),
    allowedPluginIds: text("allowed_plugin_ids").notNull().default("[]"),
    defaultPluginIds: text("default_plugin_ids").notNull().default("[]"),
    requireApproval: integer("require_approval", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("idx_org_marketplace_setting_org").on(table.organizationId),
  ]
)

export const organizationMarketplaceSettingRelations = relations(
  organizationMarketplaceSetting,
  ({ one }) => ({
    organization: one(organization, {
      fields: [organizationMarketplaceSetting.organizationId],
      references: [organization.id],
    }),
  })
)
