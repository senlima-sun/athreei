import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { eq, and, gt, desc } from "drizzle-orm"
import * as schema from "./schema"
import type {
  Account,
  Device,
  SyncItem,
  SyncState,
  SyncSettings,
  ItemType,
  NewSyncSettings,
} from "./schema"

let client: ReturnType<typeof postgres>
let db: ReturnType<typeof drizzle<typeof schema>>

export function initDatabase(connectionString: string) {
  client = postgres(connectionString)
  db = drizzle(client, { schema })
  return client
}

export function getDb() {
  if (!db) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set")
    }
    client = postgres(connectionString)
    db = drizzle(client, { schema })
  }
  return db
}

export async function closeDatabase() {
  if (client) {
    await client.end()
  }
}

// Account operations
export async function createAccount(
  email: string,
  passwordHash: string
): Promise<Account> {
  const database = getDb()
  const [account] = await database
    .insert(schema.accounts)
    .values({
      email,
      password_hash: passwordHash,
    })
    .returning()
  if (!account) {
    throw new Error("Failed to create account")
  }
  return account
}

export async function findAccountByEmail(
  email: string
): Promise<Account | null> {
  const database = getDb()
  const account = await database.query.accounts.findFirst({
    where: eq(schema.accounts.email, email),
  })
  return account || null
}

export async function findAccountById(id: string): Promise<Account | null> {
  const database = getDb()
  const account = await database.query.accounts.findFirst({
    where: eq(schema.accounts.id, id),
  })
  return account || null
}

export async function deleteAccount(id: string): Promise<void> {
  const database = getDb()
  await database.delete(schema.accounts).where(eq(schema.accounts.id, id))
}

// Device operations
export async function createDevice(
  accountId: string,
  name: string,
  publicKey: string
): Promise<Device> {
  const database = getDb()
  const [device] = await database
    .insert(schema.devices)
    .values({
      account_id: accountId,
      name,
      public_key: publicKey,
      last_seen: new Date(),
    })
    .returning()
  if (!device) {
    throw new Error("Failed to create device")
  }
  return device
}

export async function findDevicesByAccountId(
  accountId: string
): Promise<Device[]> {
  const database = getDb()
  const devices = await database.query.devices.findMany({
    where: eq(schema.devices.account_id, accountId),
    orderBy: [desc(schema.devices.created_at)],
  })
  return devices
}

export async function findDeviceById(id: string): Promise<Device | null> {
  const database = getDb()
  const device = await database.query.devices.findFirst({
    where: eq(schema.devices.id, id),
  })
  return device || null
}

export async function updateDeviceLastSeen(id: string): Promise<void> {
  const database = getDb()
  await database
    .update(schema.devices)
    .set({ last_seen: new Date() })
    .where(eq(schema.devices.id, id))
}

export async function deleteDevice(
  id: string,
  accountId: string
): Promise<void> {
  const database = getDb()
  await database
    .delete(schema.devices)
    .where(
      and(eq(schema.devices.id, id), eq(schema.devices.account_id, accountId))
    )
}

// Sync items operations
export async function createSyncItem(
  accountId: string,
  deviceId: string,
  itemType: ItemType,
  encryptedData: string
): Promise<SyncItem> {
  const database = getDb()
  const [item] = await database
    .insert(schema.syncItems)
    .values({
      account_id: accountId,
      device_id: deviceId,
      item_type: itemType,
      encrypted_data: encryptedData,
    })
    .returning()
  if (!item) {
    throw new Error("Failed to create sync item")
  }
  return item
}

export async function updateSyncItem(
  id: string,
  accountId: string,
  encryptedData: string,
  version: number
): Promise<SyncItem | null> {
  const database = getDb()
  const [item] = await database
    .update(schema.syncItems)
    .set({
      encrypted_data: encryptedData,
      version: version + 1,
      updated_at: new Date(),
    })
    .where(
      and(
        eq(schema.syncItems.id, id),
        eq(schema.syncItems.account_id, accountId),
        eq(schema.syncItems.version, version)
      )
    )
    .returning()
  return item || null
}

export async function softDeleteSyncItem(
  id: string,
  accountId: string,
  version: number
): Promise<SyncItem | null> {
  const database = getDb()
  const [item] = await database
    .update(schema.syncItems)
    .set({
      deleted_at: new Date(),
      version: version + 1,
    })
    .where(
      and(
        eq(schema.syncItems.id, id),
        eq(schema.syncItems.account_id, accountId),
        eq(schema.syncItems.version, version)
      )
    )
    .returning()
  return item || null
}

export async function findSyncItemsByAccountId(
  accountId: string,
  cursor?: string,
  limit = 100
): Promise<SyncItem[]> {
  const database = getDb()

  const conditions = cursor
    ? and(
        eq(schema.syncItems.account_id, accountId),
        gt(schema.syncItems.updated_at, new Date(cursor))
      )
    : eq(schema.syncItems.account_id, accountId)

  const items = await database
    .select()
    .from(schema.syncItems)
    .where(conditions)
    .orderBy(schema.syncItems.updated_at)
    .limit(limit)

  return items
}

export async function findSyncItemById(
  id: string,
  accountId: string
): Promise<SyncItem | null> {
  const database = getDb()
  const item = await database.query.syncItems.findFirst({
    where: and(
      eq(schema.syncItems.id, id),
      eq(schema.syncItems.account_id, accountId)
    ),
  })
  return item || null
}

// Sync state operations
export async function getSyncState(
  accountId: string,
  deviceId: string
): Promise<SyncState | null> {
  const database = getDb()
  const state = await database.query.syncState.findFirst({
    where: and(
      eq(schema.syncState.account_id, accountId),
      eq(schema.syncState.device_id, deviceId)
    ),
  })
  return state || null
}

export async function updateSyncState(
  accountId: string,
  deviceId: string,
  cursor: string
): Promise<void> {
  const database = getDb()
  await database
    .insert(schema.syncState)
    .values({
      account_id: accountId,
      device_id: deviceId,
      last_sync: new Date(),
      sync_cursor: cursor,
    })
    .onConflictDoUpdate({
      target: [schema.syncState.account_id, schema.syncState.device_id],
      set: {
        last_sync: new Date(),
        sync_cursor: cursor,
      },
    })
}

// Sync settings operations
export async function getSyncSettings(
  accountId: string
): Promise<SyncSettings | null> {
  const database = getDb()
  const settings = await database.query.syncSettings.findFirst({
    where: eq(schema.syncSettings.account_id, accountId),
  })
  return settings || null
}

export async function updateSyncSettings(
  accountId: string,
  settings: Partial<Omit<SyncSettings, "account_id">>
): Promise<SyncSettings> {
  const database = getDb()

  // Build the update object with only the fields that were provided
  const updateValues: Partial<Omit<NewSyncSettings, "account_id">> = {}

  if (settings.sync_permissions !== undefined) {
    updateValues.sync_permissions = settings.sync_permissions
  }
  if (settings.sync_audit_log !== undefined) {
    updateValues.sync_audit_log = settings.sync_audit_log
  }
  if (settings.sync_sessions !== undefined) {
    updateValues.sync_sessions = settings.sync_sessions
  }
  if (settings.sync_settings !== undefined) {
    updateValues.sync_settings = settings.sync_settings
  }
  if (settings.audit_log_retention_days !== undefined) {
    updateValues.audit_log_retention_days = settings.audit_log_retention_days
  }

  const [updated] = await database
    .update(schema.syncSettings)
    .set(updateValues)
    .where(eq(schema.syncSettings.account_id, accountId))
    .returning()

  if (!updated) {
    throw new Error("Failed to update sync settings")
  }
  return updated
}
