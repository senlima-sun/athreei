/**
 * Plugin Installation Schema (PostgreSQL)
 * Tracks plugin installations per organization
 */

import {
  pgTable,
  text,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { organization, user } from "./auth"
import { plugin, pluginVersion } from "./marketplaces"

export const pluginInstallation = pgTable(
  "plugin_installation",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    pluginId: text("plugin_id")
      .notNull()
      .references(() => plugin.id, { onDelete: "cascade" }),
    pluginVersionId: text("plugin_version_id")
      .notNull()
      .references(() => pluginVersion.id, { onDelete: "cascade" }),
    installedBy: text("installed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    scope: text("scope").notNull().default("organization"),
    status: text("status").notNull().default("active"),
    config: text("config"),
    encryptedEnv: text("encrypted_env"),
    envKeyVersion: integer("env_key_version"),
    installedAt: timestamp("installed_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_plugin_installation_unique").on(
      table.organizationId,
      table.pluginId,
      table.scope
    ),
    index("idx_plugin_installation_org").on(table.organizationId),
    index("idx_plugin_installation_plugin").on(table.pluginId),
    index("idx_plugin_installation_status").on(table.status),
    index("idx_plugin_installation_installer").on(table.installedBy),
  ]
)

export const pluginInstallationRelations = relations(
  pluginInstallation,
  ({ one }) => ({
    organization: one(organization, {
      fields: [pluginInstallation.organizationId],
      references: [organization.id],
    }),
    plugin: one(plugin, {
      fields: [pluginInstallation.pluginId],
      references: [plugin.id],
    }),
    pluginVersion: one(pluginVersion, {
      fields: [pluginInstallation.pluginVersionId],
      references: [pluginVersion.id],
    }),
    installer: one(user, {
      fields: [pluginInstallation.installedBy],
      references: [user.id],
    }),
  })
)
