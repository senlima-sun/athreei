/**
 * Namespaces Schema (SQLite)
 *
 * Provides logical isolation within organizations for MCP servers,
 * endpoints, and other resources. Similar to Kubernetes namespaces.
 *
 * Use cases:
 * - Environment separation (production, staging, development)
 * - Team/project isolation within an organization
 * - SSE routing per namespace (e.g., prod.myorg.athreei.com)
 * - Granular API key scoping
 */

import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"
import { organization } from "./auth"

/**
 * Namespace - logical grouping within an organization
 */
export const namespace = sqliteTable(
  "namespace",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    isDefault: integer("isDefault", { mode: "boolean" })
      .notNull()
      .default(false),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("namespace_org_slug_idx").on(table.organizationId, table.slug),
  ]
)

/**
 * Namespace Resource Mapping - associates resources with namespaces
 *
 * This allows existing resources (MCP servers, endpoints, API keys)
 * to be assigned to namespaces without modifying their schemas.
 */
export const namespaceResource = sqliteTable(
  "namespace_resource",
  {
    id: text("id").primaryKey(),
    namespaceId: text("namespaceId")
      .notNull()
      .references(() => namespace.id, { onDelete: "cascade" }),
    resourceType: text("resourceType").notNull(), // mcp_server, endpoint, api_key
    resourceId: text("resourceId").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    uniqueIndex("namespace_resource_unique_idx").on(
      table.namespaceId,
      table.resourceType,
      table.resourceId
    ),
  ]
)

export const namespaceRelations = relations(namespace, ({ one, many }) => ({
  organization: one(organization, {
    fields: [namespace.organizationId],
    references: [organization.id],
  }),
  resources: many(namespaceResource),
}))

export const namespaceResourceRelations = relations(
  namespaceResource,
  ({ one }) => ({
    namespace: one(namespace, {
      fields: [namespaceResource.namespaceId],
      references: [namespace.id],
    }),
  })
)

export const namespaceHook = sqliteTable(
  "namespace_hook",
  {
    id: text("id").primaryKey(),
    namespaceId: text("namespaceId")
      .notNull()
      .references(() => namespace.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    toolNamePattern: text("toolNamePattern"),
    handler: text("handler").notNull(),
    priority: integer("priority").notNull().default(100),
    isEnabled: integer("isEnabled", { mode: "boolean" }).notNull().default(true),
    sourcePluginId: text("sourcePluginId"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    index("namespace_hook_namespace_idx").on(table.namespaceId),
    index("namespace_hook_event_idx").on(table.event),
  ]
)

export const namespaceHookRelations = relations(namespaceHook, ({ one }) => ({
  namespace: one(namespace, {
    fields: [namespaceHook.namespaceId],
    references: [namespace.id],
  }),
}))
