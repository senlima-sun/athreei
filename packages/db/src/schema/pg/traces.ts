/**
 * Traces & Observability Schema (PostgreSQL)
 */

import {
  pgTable,
  text,
  timestamp,
  doublePrecision,
  index,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { organization, user } from "./auth"
import { mcpServer } from "./mcp-servers"

export const trace = pgTable(
  "trace",
  {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  userId: text("userId").references(() => user.id, { onDelete: "set null" }),
  mcpServerId: text("mcpServerId").references(() => mcpServer.id, {
    onDelete: "set null",
  }),
  traceId: text("traceId").notNull(),
  parentSpanId: text("parentSpanId"),
  spanId: text("spanId").notNull(),
  name: text("name").notNull(),
  kind: text("kind").notNull().default("internal"),
  status: text("status").notNull(),
  statusMessage: text("statusMessage"),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  durationMs: doublePrecision("durationMs"),
  attributes: text("attributes"),
  events: text("events"),
  createdAt: timestamp("createdAt").notNull(),
  },
  (table) => [
    index("trace_org_time_idx").on(table.organizationId, table.startTime),
    index("trace_org_status_idx").on(table.organizationId, table.status),
    index("trace_org_status_time_idx").on(
      table.organizationId,
      table.status,
      table.startTime
    ),
    index("trace_mcp_server_idx").on(table.mcpServerId),
  ]
)

export const log = pgTable("log", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  traceId: text("traceId"),
  userId: text("userId").references(() => user.id, { onDelete: "set null" }),
  level: text("level").notNull(),
  message: text("message").notNull(),
  attributes: text("attributes"),
  source: text("source"),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("createdAt").notNull(),
})

export const metric = pgTable("metric", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  value: doublePrecision("value").notNull(),
  dimensions: text("dimensions"),
  timestamp: timestamp("timestamp").notNull(),
  createdAt: timestamp("createdAt").notNull(),
})

export const traceRelations = relations(trace, ({ one }) => ({
  organization: one(organization, {
    fields: [trace.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [trace.userId],
    references: [user.id],
  }),
  mcpServer: one(mcpServer, {
    fields: [trace.mcpServerId],
    references: [mcpServer.id],
  }),
}))

export const logRelations = relations(log, ({ one }) => ({
  organization: one(organization, {
    fields: [log.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [log.userId],
    references: [user.id],
  }),
}))

export const metricRelations = relations(metric, ({ one }) => ({
  organization: one(organization, {
    fields: [metric.organizationId],
    references: [organization.id],
  }),
}))
