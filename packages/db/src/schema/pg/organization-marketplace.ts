/**
 * Organization Marketplace Settings Schema (PostgreSQL)
 * Controls marketplace and plugin restrictions per organization
 */

import {
  pgTable,
  text,
  timestamp,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { organization } from "./auth"

export const organizationMarketplaceSetting = pgTable(
  "organization_marketplace_setting",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    restrictMarketplaces: boolean("restrict_marketplaces")
      .notNull()
      .default(false),
    allowedMarketplaceIds: text("allowed_marketplace_ids")
      .notNull()
      .default("[]"),
    restrictPlugins: boolean("restrict_plugins").notNull().default(false),
    allowedPluginIds: text("allowed_plugin_ids").notNull().default("[]"),
    defaultPluginIds: text("default_plugin_ids").notNull().default("[]"),
    requireApproval: boolean("require_approval").notNull().default(false),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
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
