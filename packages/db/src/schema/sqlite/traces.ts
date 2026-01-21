/**
 * Traces & Observability Schema (SQLite)
 *
 * Stores request traces and logs for debugging and monitoring.
 */

import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core"
import { relations } from "drizzle-orm"
import { organization, user } from "./auth"
import { mcpServer } from "./mcp-servers"

/**
 * Trace - a single request/response trace
 */
export const trace = sqliteTable(
  "trace",
  {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  // Optional associations
  userId: text("userId").references(() => user.id, { onDelete: "set null" }),
  mcpServerId: text("mcpServerId").references(() => mcpServer.id, {
    onDelete: "set null",
  }),
  // Trace metadata
  traceId: text("traceId").notNull(), // For distributed tracing correlation
  parentSpanId: text("parentSpanId"), // Parent span for nested traces
  spanId: text("spanId").notNull(),
  // Request info
  name: text("name").notNull(), // Operation name
  kind: text("kind").notNull().default("internal"), // client, server, internal
  // Status
  status: text("status").notNull(), // ok, error
  statusMessage: text("statusMessage"),
  // Timing
  startTime: integer("startTime", { mode: "timestamp" }).notNull(),
  endTime: integer("endTime", { mode: "timestamp" }),
  durationMs: real("durationMs"),
  // Data
  attributes: text("attributes"), // JSON object of key-value pairs
  events: text("events"), // JSON array of trace events
  // Timestamps
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
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

/**
 * Log - structured log entries
 */
export const log = sqliteTable("log", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  // Optional associations
  traceId: text("traceId"), // Link to trace if applicable
  userId: text("userId").references(() => user.id, { onDelete: "set null" }),
  level: text("level").notNull(), // debug, info, warn, error, fatal
  message: text("message").notNull(),
  attributes: text("attributes"), // JSON object of structured data
  // Source
  source: text("source"), // Service or component name
  // Timestamp
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
})

/**
 * Metric - time-series metrics for monitoring
 */
export const metric = sqliteTable("metric", {
  id: text("id").primaryKey(),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  // Metric identity
  name: text("name").notNull(), // e.g., "request_count", "response_time_ms"
  type: text("type").notNull(), // counter, gauge, histogram
  // Value
  value: real("value").notNull(),
  // Dimensions for filtering/grouping
  dimensions: text("dimensions"), // JSON object of key-value pairs
  // Timestamp
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
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
