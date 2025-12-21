import { pgTable, uuid, text, timestamp, integer, boolean, pgEnum, index, primaryKey } from 'drizzle-orm/pg-core';
import { InferSelectModel, InferInsertModel, relations } from 'drizzle-orm';

// Enum for sync item types
export const itemTypeEnum = pgEnum('item_type', ['permission', 'session', 'audit_log', 'settings']);

// Accounts table
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index('idx_accounts_email').on(table.email),
}));

// Devices table
export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_id: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  public_key: text('public_key').notNull(),
  last_seen: timestamp('last_seen', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  accountIdIdx: index('idx_devices_account_id').on(table.account_id),
}));

// Sync items table
export const syncItems = pgTable('sync_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  account_id: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  device_id: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  item_type: itemTypeEnum('item_type').notNull(),
  encrypted_data: text('encrypted_data').notNull(),
  version: integer('version').notNull().default(1),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  accountIdIdx: index('idx_sync_items_account_id').on(table.account_id),
  deviceIdIdx: index('idx_sync_items_device_id').on(table.device_id),
  itemTypeIdx: index('idx_sync_items_type').on(table.item_type),
  updatedAtIdx: index('idx_sync_items_updated_at').on(table.updated_at),
  deletedAtIdx: index('idx_sync_items_deleted_at').on(table.deleted_at),
}));

// Sync state table (composite primary key)
export const syncState = pgTable('sync_state', {
  account_id: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  device_id: uuid('device_id').notNull().references(() => devices.id, { onDelete: 'cascade' }),
  last_sync: timestamp('last_sync', { withTimezone: true }),
  sync_cursor: text('sync_cursor'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.account_id, table.device_id] }),
}));

// Sync settings table
export const syncSettings = pgTable('sync_settings', {
  account_id: uuid('account_id').primaryKey().references(() => accounts.id, { onDelete: 'cascade' }),
  sync_permissions: boolean('sync_permissions').default(true).notNull(),
  sync_audit_log: boolean('sync_audit_log').default(true).notNull(),
  sync_sessions: boolean('sync_sessions').default(true).notNull(),
  sync_settings: boolean('sync_settings').default(true).notNull(),
  audit_log_retention_days: integer('audit_log_retention_days').default(90).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Inferred types for TypeScript
export type Account = InferSelectModel<typeof accounts>;
export type NewAccount = InferInsertModel<typeof accounts>;

export type Device = InferSelectModel<typeof devices>;
export type NewDevice = InferInsertModel<typeof devices>;

export type SyncItem = InferSelectModel<typeof syncItems>;
export type NewSyncItem = InferInsertModel<typeof syncItems>;

export type SyncState = InferSelectModel<typeof syncState>;
export type NewSyncState = InferInsertModel<typeof syncState>;

export type SyncSettings = InferSelectModel<typeof syncSettings>;
export type NewSyncSettings = InferInsertModel<typeof syncSettings>;

// Derived union type from enum values
export type ItemType = typeof itemTypeEnum.enumValues[number];

// Relations
export const accountsRelations = relations(accounts, ({ many, one }) => ({
  devices: many(devices),
  syncItems: many(syncItems),
  syncSettings: one(syncSettings),
  syncStates: many(syncState),
}));

export const devicesRelations = relations(devices, ({ one, many }) => ({
  account: one(accounts, {
    fields: [devices.account_id],
    references: [accounts.id],
  }),
  syncItems: many(syncItems),
  syncStates: many(syncState),
}));

export const syncItemsRelations = relations(syncItems, ({ one }) => ({
  account: one(accounts, {
    fields: [syncItems.account_id],
    references: [accounts.id],
  }),
  device: one(devices, {
    fields: [syncItems.device_id],
    references: [devices.id],
  }),
}));

export const syncStateRelations = relations(syncState, ({ one }) => ({
  account: one(accounts, {
    fields: [syncState.account_id],
    references: [accounts.id],
  }),
  device: one(devices, {
    fields: [syncState.device_id],
    references: [devices.id],
  }),
}));

export const syncSettingsRelations = relations(syncSettings, ({ one }) => ({
  account: one(accounts, {
    fields: [syncSettings.account_id],
    references: [accounts.id],
  }),
}));
