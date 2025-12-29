/**
 * Namespaces Schema (PostgreSQL)
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

import { pgTable, text, timestamp, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organization } from "./auth";

/**
 * Namespace - logical grouping within an organization
 */
export const namespace = pgTable(
  "namespace",
  {
    id: text("id").primaryKey(),
    organizationId: text("organizationId")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    isDefault: boolean("isDefault").notNull().default(false),
    createdAt: timestamp("createdAt").notNull(),
    updatedAt: timestamp("updatedAt").notNull(),
  },
  (table) => [
    uniqueIndex("namespace_org_slug_idx").on(table.organizationId, table.slug),
  ]
);

/**
 * Namespace Resource Mapping - associates resources with namespaces
 *
 * This allows existing resources (MCP servers, endpoints, API keys)
 * to be assigned to namespaces without modifying their schemas.
 */
export const namespaceResource = pgTable(
  "namespace_resource",
  {
    id: text("id").primaryKey(),
    namespaceId: text("namespaceId")
      .notNull()
      .references(() => namespace.id, { onDelete: "cascade" }),
    resourceType: text("resourceType").notNull(), // mcp_server, endpoint, api_key
    resourceId: text("resourceId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => [
    uniqueIndex("namespace_resource_unique_idx").on(
      table.namespaceId,
      table.resourceType,
      table.resourceId
    ),
  ]
);

// =============================================================================
// Relations
// =============================================================================

export const namespaceRelations = relations(namespace, ({ one, many }) => ({
  organization: one(organization, {
    fields: [namespace.organizationId],
    references: [organization.id],
  }),
  resources: many(namespaceResource),
}));

export const namespaceResourceRelations = relations(namespaceResource, ({ one }) => ({
  namespace: one(namespace, {
    fields: [namespaceResource.namespaceId],
    references: [namespace.id],
  }),
}));
