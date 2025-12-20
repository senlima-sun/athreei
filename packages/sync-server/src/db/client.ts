import { neon, neonConfig } from '@neondatabase/serverless';
import type {
  Account,
  Device,
  SyncItem,
  SyncState,
  SyncSettings,
} from './schema';

// Configure for development/production
neonConfig.fetchConnectionCache = true;

let sql: ReturnType<typeof neon>;

export function initDatabase(connectionString: string) {
  sql = neon(connectionString);
  return sql;
}

export function getDb() {
  if (!sql) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    sql = neon(connectionString);
  }
  return sql;
}

// Account operations
export async function createAccount(
  email: string,
  passwordHash: string
): Promise<Account> {
  const db = getDb();
  const [account] = await db<Account[]>`
    INSERT INTO accounts (email, password_hash)
    VALUES (${email}, ${passwordHash})
    RETURNING *
  `;
  return account;
}

export async function findAccountByEmail(email: string): Promise<Account | null> {
  const db = getDb();
  const [account] = await db<Account[]>`
    SELECT * FROM accounts WHERE email = ${email}
  `;
  return account || null;
}

export async function findAccountById(id: string): Promise<Account | null> {
  const db = getDb();
  const [account] = await db<Account[]>`
    SELECT * FROM accounts WHERE id = ${id}
  `;
  return account || null;
}

export async function deleteAccount(id: string): Promise<void> {
  const db = getDb();
  await db`DELETE FROM accounts WHERE id = ${id}`;
}

// Device operations
export async function createDevice(
  accountId: string,
  name: string,
  publicKey: string
): Promise<Device> {
  const db = getDb();
  const [device] = await db<Device[]>`
    INSERT INTO devices (account_id, name, public_key, last_seen)
    VALUES (${accountId}, ${name}, ${publicKey}, NOW())
    RETURNING *
  `;
  return device;
}

export async function findDevicesByAccountId(accountId: string): Promise<Device[]> {
  const db = getDb();
  return db<Device[]>`
    SELECT * FROM devices WHERE account_id = ${accountId}
    ORDER BY created_at DESC
  `;
}

export async function findDeviceById(id: string): Promise<Device | null> {
  const db = getDb();
  const [device] = await db<Device[]>`
    SELECT * FROM devices WHERE id = ${id}
  `;
  return device || null;
}

export async function updateDeviceLastSeen(id: string): Promise<void> {
  const db = getDb();
  await db`
    UPDATE devices SET last_seen = NOW() WHERE id = ${id}
  `;
}

export async function deleteDevice(id: string, accountId: string): Promise<void> {
  const db = getDb();
  await db`
    DELETE FROM devices WHERE id = ${id} AND account_id = ${accountId}
  `;
}

// Sync items operations
export async function createSyncItem(
  accountId: string,
  deviceId: string,
  itemType: string,
  encryptedData: string
): Promise<SyncItem> {
  const db = getDb();
  const [item] = await db<SyncItem[]>`
    INSERT INTO sync_items (account_id, device_id, item_type, encrypted_data)
    VALUES (${accountId}, ${deviceId}, ${itemType}, ${encryptedData})
    RETURNING *
  `;
  return item;
}

export async function updateSyncItem(
  id: string,
  accountId: string,
  encryptedData: string,
  version: number
): Promise<SyncItem | null> {
  const db = getDb();
  const [item] = await db<SyncItem[]>`
    UPDATE sync_items
    SET encrypted_data = ${encryptedData}, version = ${version + 1}, updated_at = NOW()
    WHERE id = ${id} AND account_id = ${accountId} AND version = ${version}
    RETURNING *
  `;
  return item || null;
}

export async function softDeleteSyncItem(
  id: string,
  accountId: string,
  version: number
): Promise<SyncItem | null> {
  const db = getDb();
  const [item] = await db<SyncItem[]>`
    UPDATE sync_items
    SET deleted_at = NOW(), version = ${version + 1}
    WHERE id = ${id} AND account_id = ${accountId} AND version = ${version}
    RETURNING *
  `;
  return item || null;
}

export async function findSyncItemsByAccountId(
  accountId: string,
  cursor?: string,
  limit = 100
): Promise<SyncItem[]> {
  const db = getDb();

  if (cursor) {
    return db<SyncItem[]>`
      SELECT * FROM sync_items
      WHERE account_id = ${accountId} AND updated_at > ${cursor}
      ORDER BY updated_at ASC
      LIMIT ${limit}
    `;
  }

  return db<SyncItem[]>`
    SELECT * FROM sync_items
    WHERE account_id = ${accountId}
    ORDER BY updated_at ASC
    LIMIT ${limit}
  `;
}

export async function findSyncItemById(
  id: string,
  accountId: string
): Promise<SyncItem | null> {
  const db = getDb();
  const [item] = await db<SyncItem[]>`
    SELECT * FROM sync_items WHERE id = ${id} AND account_id = ${accountId}
  `;
  return item || null;
}

// Sync state operations
export async function getSyncState(
  accountId: string,
  deviceId: string
): Promise<SyncState | null> {
  const db = getDb();
  const [state] = await db<SyncState[]>`
    SELECT * FROM sync_state
    WHERE account_id = ${accountId} AND device_id = ${deviceId}
  `;
  return state || null;
}

export async function updateSyncState(
  accountId: string,
  deviceId: string,
  cursor: string
): Promise<void> {
  const db = getDb();
  await db`
    INSERT INTO sync_state (account_id, device_id, last_sync, sync_cursor)
    VALUES (${accountId}, ${deviceId}, NOW(), ${cursor})
    ON CONFLICT (account_id, device_id)
    DO UPDATE SET last_sync = NOW(), sync_cursor = ${cursor}
  `;
}

// Sync settings operations
export async function getSyncSettings(accountId: string): Promise<SyncSettings | null> {
  const db = getDb();
  const [settings] = await db<SyncSettings[]>`
    SELECT * FROM sync_settings WHERE account_id = ${accountId}
  `;
  return settings || null;
}

export async function updateSyncSettings(
  accountId: string,
  settings: Partial<Omit<SyncSettings, 'account_id'>>
): Promise<SyncSettings> {
  const db = getDb();

  // Use COALESCE to only update provided fields, preserving existing values
  const [updated] = await db<SyncSettings[]>`
    UPDATE sync_settings
    SET sync_permissions = COALESCE(${settings.sync_permissions}, sync_permissions),
        sync_audit_log = COALESCE(${settings.sync_audit_log}, sync_audit_log),
        sync_sessions = COALESCE(${settings.sync_sessions}, sync_sessions),
        sync_settings = COALESCE(${settings.sync_settings}, sync_settings),
        audit_log_retention_days = COALESCE(${settings.audit_log_retention_days}, audit_log_retention_days)
    WHERE account_id = ${accountId}
    RETURNING *
  `;

  return updated;
}
