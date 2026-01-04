import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  index,
  uniqueIndex,
  primaryKey,
  customType,
} from "drizzle-orm/pg-core"
import { InferSelectModel, InferInsertModel, relations } from "drizzle-orm"

// Enum for sync item types
export const itemTypeEnum = pgEnum("item_type", [
  "permission",
  "session",
  "audit_log",
  "settings",
])

// Enum for trace status
export const traceStatusEnum = pgEnum("trace_status", ["success", "error"])

// Custom type for bytea (binary data)
const bytea = customType<{ data: Uint8Array; dpiName: string }>({
  dataType() {
    return "bytea"
  },
  toDriver(value: Uint8Array): Buffer {
    return Buffer.from(value)
  },
  fromDriver(value: unknown): Uint8Array {
    if (value instanceof Buffer) {
      return new Uint8Array(value)
    }
    if (typeof value === "string") {
      // Handle hex-encoded bytea strings from PostgreSQL (e.g., "\x...")
      if (value.startsWith("\\x")) {
        const hex = value.slice(2)
        const bytes = new Uint8Array(hex.length / 2)
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
        }
        return bytes
      }
      return new Uint8Array(Buffer.from(value))
    }
    return new Uint8Array()
  },
})

// Accounts table
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    password_hash: text("password_hash").notNull(),
    /** Salt for trace encryption key derivation (Argon2, 16 bytes) */
    encryption_salt: bytea("encryption_salt"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    emailIdx: index("idx_accounts_email").on(table.email),
  })
)

// Devices table
export const devices = pgTable(
  "devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    account_id: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    public_key: text("public_key").notNull(),
    last_seen: timestamp("last_seen", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    accountIdIdx: index("idx_devices_account_id").on(table.account_id),
  })
)

// Sync items table
export const syncItems = pgTable(
  "sync_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    account_id: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    device_id: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    item_type: itemTypeEnum("item_type").notNull(),
    encrypted_data: text("encrypted_data").notNull(),
    version: integer("version").notNull().default(1),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deleted_at: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    accountIdIdx: index("idx_sync_items_account_id").on(table.account_id),
    deviceIdIdx: index("idx_sync_items_device_id").on(table.device_id),
    itemTypeIdx: index("idx_sync_items_type").on(table.item_type),
    updatedAtIdx: index("idx_sync_items_updated_at").on(table.updated_at),
    deletedAtIdx: index("idx_sync_items_deleted_at").on(table.deleted_at),
  })
)

// Sync state table (composite primary key)
export const syncState = pgTable(
  "sync_state",
  {
    account_id: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    device_id: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    last_sync: timestamp("last_sync", { withTimezone: true }),
    sync_cursor: text("sync_cursor"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.account_id, table.device_id] }),
  })
)

// Sync settings table
export const syncSettings = pgTable("sync_settings", {
  account_id: uuid("account_id")
    .primaryKey()
    .references(() => accounts.id, { onDelete: "cascade" }),
  sync_permissions: boolean("sync_permissions").default(true).notNull(),
  sync_audit_log: boolean("sync_audit_log").default(true).notNull(),
  sync_sessions: boolean("sync_sessions").default(true).notNull(),
  sync_settings: boolean("sync_settings").default(true).notNull(),
  audit_log_retention_days: integer("audit_log_retention_days")
    .default(90)
    .notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// Traces table - stores encrypted tool call traces from Gateway
export const traces = pgTable(
  "traces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    account_id: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    namespace_id: uuid("namespace_id"),
    mcp_server_id: uuid("mcp_server_id"),
    endpoint_id: uuid("endpoint_id"),
    tool_name: text("tool_name").notNull(),
    request_id: uuid("request_id").notNull(),
    encrypted_payload: bytea("encrypted_payload").notNull(),
    status: traceStatusEnum("status").notNull(),
    duration_ms: integer("duration_ms"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    accountIdIdx: index("idx_traces_account_id").on(table.account_id),
    namespaceIdIdx: index("idx_traces_namespace_id").on(table.namespace_id),
    mcpServerIdIdx: index("idx_traces_mcp_server_id").on(table.mcp_server_id),
    endpointIdIdx: index("idx_traces_endpoint_id").on(table.endpoint_id),
    toolNameIdx: index("idx_traces_tool_name").on(table.tool_name),
    statusIdx: index("idx_traces_status").on(table.status),
    createdAtIdx: index("idx_traces_created_at").on(table.created_at),
    requestIdIdx: index("idx_traces_request_id").on(table.request_id),
    // Unique constraint to prevent duplicate traces on retry
    accountRequestUnique: uniqueIndex("idx_traces_account_request_unique").on(
      table.account_id,
      table.request_id
    ),
  })
)

// Inferred types for TypeScript
export type Account = InferSelectModel<typeof accounts>
export type NewAccount = InferInsertModel<typeof accounts>

export type Device = InferSelectModel<typeof devices>
export type NewDevice = InferInsertModel<typeof devices>

export type SyncItem = InferSelectModel<typeof syncItems>
export type NewSyncItem = InferInsertModel<typeof syncItems>

export type SyncState = InferSelectModel<typeof syncState>
export type NewSyncState = InferInsertModel<typeof syncState>

export type SyncSettings = InferSelectModel<typeof syncSettings>
export type NewSyncSettings = InferInsertModel<typeof syncSettings>

export type Trace = InferSelectModel<typeof traces>
export type NewTrace = InferInsertModel<typeof traces>

// Derived union type from enum values
export type ItemType = (typeof itemTypeEnum.enumValues)[number]
export type TraceStatus = (typeof traceStatusEnum.enumValues)[number]

// Relations
export const accountsRelations = relations(accounts, ({ many, one }) => ({
  devices: many(devices),
  syncItems: many(syncItems),
  syncSettings: one(syncSettings),
  syncStates: many(syncState),
  traces: many(traces),
}))

export const devicesRelations = relations(devices, ({ one, many }) => ({
  account: one(accounts, {
    fields: [devices.account_id],
    references: [accounts.id],
  }),
  syncItems: many(syncItems),
  syncStates: many(syncState),
}))

export const syncItemsRelations = relations(syncItems, ({ one }) => ({
  account: one(accounts, {
    fields: [syncItems.account_id],
    references: [accounts.id],
  }),
  device: one(devices, {
    fields: [syncItems.device_id],
    references: [devices.id],
  }),
}))

export const syncStateRelations = relations(syncState, ({ one }) => ({
  account: one(accounts, {
    fields: [syncState.account_id],
    references: [accounts.id],
  }),
  device: one(devices, {
    fields: [syncState.device_id],
    references: [devices.id],
  }),
}))

export const syncSettingsRelations = relations(syncSettings, ({ one }) => ({
  account: one(accounts, {
    fields: [syncSettings.account_id],
    references: [accounts.id],
  }),
}))

export const tracesRelations = relations(traces, ({ one }) => ({
  account: one(accounts, {
    fields: [traces.account_id],
    references: [accounts.id],
  }),
}))
