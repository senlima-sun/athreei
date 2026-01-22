/**
 * Marketplace Schema (PostgreSQL)
 * Defines marketplace registry for plugin distribution
 */

import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { organization, user } from "./auth"

export const marketplace = pgTable(
  "marketplace",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    ownerType: text("owner_type").notNull().default("system"),
    ownerId: text("owner_id"),
    sourceType: text("source_type").notNull().default("internal"),
    sourceUrl: text("source_url"),
    sourceRepo: text("source_repo"),
    sourceRef: text("source_ref"),
    isPublic: boolean("is_public").notNull().default(false),
    isDefault: boolean("is_default").notNull().default(false),
    autoUpdate: boolean("auto_update").notNull().default(true),
    lastSyncedAt: timestamp("last_synced_at"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_marketplace_slug").on(table.slug),
    index("idx_marketplace_owner").on(table.ownerType, table.ownerId),
    index("idx_marketplace_public").on(table.isPublic),
  ]
)

export const marketplaceRelations = relations(marketplace, ({ one, many }) => ({
  ownerOrganization: one(organization, {
    fields: [marketplace.ownerId],
    references: [organization.id],
  }),
  ownerUser: one(user, {
    fields: [marketplace.ownerId],
    references: [user.id],
  }),
  plugins: many(plugin),
}))

export const plugin = pgTable(
  "plugin",
  {
    id: text("id").primaryKey(),
    marketplaceId: text("marketplace_id")
      .notNull()
      .references(() => marketplace.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category"),
    tags: text("tags").notNull().default("[]"),
    author: text("author"),
    homepage: text("homepage"),
    repository: text("repository"),
    license: text("license"),
    iconUrl: text("icon_url"),
    isVerified: boolean("is_verified").notNull().default(false),
    isFeatured: boolean("is_featured").notNull().default(false),
    downloadCount: text("download_count").notNull().default("0"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_plugin_marketplace_slug").on(
      table.marketplaceId,
      table.slug
    ),
    index("idx_plugin_marketplace").on(table.marketplaceId),
    index("idx_plugin_category").on(table.category),
    index("idx_plugin_featured").on(table.isFeatured),
  ]
)

export const pluginRelations = relations(plugin, ({ one, many }) => ({
  marketplace: one(marketplace, {
    fields: [plugin.marketplaceId],
    references: [marketplace.id],
  }),
  versions: many(pluginVersion),
}))

export const pluginVersion = pgTable(
  "plugin_version",
  {
    id: text("id").primaryKey(),
    pluginId: text("plugin_id")
      .notNull()
      .references(() => plugin.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    changelog: text("changelog"),
    manifest: text("manifest").notNull(),
    sourceHash: text("source_hash"),
    isLatest: boolean("is_latest").notNull().default(false),
    validationStatus: text("validation_status").notNull().default("pending"),
    validationErrors: text("validation_errors"),
    validationWarnings: text("validation_warnings"),
    publishedAt: timestamp("published_at").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_plugin_version_unique").on(table.pluginId, table.version),
    index("idx_plugin_version_plugin").on(table.pluginId),
    index("idx_plugin_version_latest").on(table.pluginId, table.isLatest),
    index("idx_plugin_version_validation").on(table.validationStatus),
  ]
)

export const pluginVersionRelations = relations(
  pluginVersion,
  ({ one, many }) => ({
    plugin: one(plugin, {
      fields: [pluginVersion.pluginId],
      references: [plugin.id],
    }),
    components: many(pluginComponent),
  })
)

export const pluginComponent = pgTable(
  "plugin_component",
  {
    id: text("id").primaryKey(),
    pluginVersionId: text("plugin_version_id")
      .notNull()
      .references(() => pluginVersion.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    config: text("config").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("idx_plugin_component_version").on(table.pluginVersionId),
    index("idx_plugin_component_type").on(table.type),
  ]
)

export const pluginComponentRelations = relations(
  pluginComponent,
  ({ one }) => ({
    pluginVersion: one(pluginVersion, {
      fields: [pluginComponent.pluginVersionId],
      references: [pluginVersion.id],
    }),
  })
)

export const pluginSubmission = pgTable(
  "plugin_submission",
  {
    id: text("id").primaryKey(),
    marketplaceId: text("marketplace_id")
      .notNull()
      .references(() => marketplace.id, { onDelete: "cascade" }),
    submitterId: text("submitter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    pluginSlug: text("plugin_slug").notNull(),
    pluginName: text("plugin_name").notNull(),
    description: text("description"),
    category: text("category"),
    sourceType: text("source_type").notNull().default("github"),
    sourceRepo: text("source_repo").notNull(),
    sourceRef: text("source_ref").notNull().default("main"),
    sourcePath: text("source_path"),
    version: text("version").notNull(),
    manifestJson: text("manifest_json").notNull(),
    status: text("status").notNull().default("pending"),
    validationStatus: text("validation_status"),
    validationErrors: text("validation_errors"),
    validationWarnings: text("validation_warnings"),
    reviewerId: text("reviewer_id").references(() => user.id),
    reviewedAt: timestamp("reviewed_at"),
    reviewNotes: text("review_notes"),
    rejectionReason: text("rejection_reason"),
    publishedPluginId: text("published_plugin_id").references(() => plugin.id),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("idx_plugin_submission_marketplace").on(table.marketplaceId),
    index("idx_plugin_submission_submitter").on(table.submitterId),
    index("idx_plugin_submission_status").on(table.status),
    index("idx_plugin_submission_created").on(table.createdAt),
    index("idx_plugin_submission_lookup").on(
      table.marketplaceId,
      table.pluginSlug,
      table.version,
      table.status
    ),
  ]
)

export const pluginSubmissionRelations = relations(
  pluginSubmission,
  ({ one }) => ({
    marketplace: one(marketplace, {
      fields: [pluginSubmission.marketplaceId],
      references: [marketplace.id],
    }),
    submitter: one(user, {
      fields: [pluginSubmission.submitterId],
      references: [user.id],
      relationName: "submitter",
    }),
    reviewer: one(user, {
      fields: [pluginSubmission.reviewerId],
      references: [user.id],
      relationName: "reviewer",
    }),
    publishedPlugin: one(plugin, {
      fields: [pluginSubmission.publishedPluginId],
      references: [plugin.id],
    }),
  })
)
