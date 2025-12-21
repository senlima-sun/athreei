import {
  createSyncItem,
  updateSyncItem,
  softDeleteSyncItem,
  findSyncItemsByAccountId,
  findSyncItemById,
  getSyncState,
  updateSyncState,
  getSyncSettings,
  findDeviceById,
  updateDeviceLastSeen,
} from '../db/client';
import { detectConflict } from './conflict';
import type {
  SyncPullResponse,
  SyncPushResponse,
  SyncItemResponse,
  ConflictResponse,
} from '../types';
import type { SyncItem, ItemType } from '../db/schema';

/**
 * Pull changes from server since last sync
 */
export async function pullChanges(
  accountId: string,
  deviceId: string,
  cursor?: string,
  limit = 100
): Promise<SyncPullResponse> {
  // Verify device belongs to account
  const device = await findDeviceById(deviceId);
  if (!device || device.account_id !== accountId) {
    throw new Error('Invalid device');
  }

  // Update device last seen
  await updateDeviceLastSeen(deviceId);

  // Get sync settings to filter items
  const settings = await getSyncSettings(accountId);

  // Get items since cursor
  let items = await findSyncItemsByAccountId(accountId, cursor, limit);

  // Filter based on sync settings
  if (settings) {
    items = items.filter((item) => {
      switch (item.item_type) {
        case 'permission':
          return settings.sync_permissions;
        case 'audit_log':
          return settings.sync_audit_log;
        case 'session':
          return settings.sync_sessions;
        case 'settings':
          return settings.sync_settings;
        default:
          return true;
      }
    });
  }

  // Map to response format
  const responseItems: SyncItemResponse[] = items.map((item) => ({
    id: item.id,
    itemType: item.item_type,
    encryptedData: item.encrypted_data,
    version: item.version,
    updatedAt: item.updated_at.toISOString(),
    deletedAt: item.deleted_at ? item.deleted_at.toISOString() : null,
    deviceId: item.device_id,
  }));

  // Determine cursor and hasMore
  const hasMore = items.length === limit;
  const newCursor = items.length > 0
    ? items[items.length - 1].updated_at.toISOString()
    : null;

  // Update sync state
  if (newCursor) {
    await updateSyncState(accountId, deviceId, newCursor);
  }

  return {
    items: responseItems,
    cursor: newCursor,
    hasMore,
  };
}

/**
 * Push changes to server with conflict detection
 */
export async function pushChanges(
  accountId: string,
  deviceId: string,
  items: Array<{
    id?: string;
    itemType: ItemType;
    encryptedData: string;
    version?: number;
    deleted?: boolean;
  }>
): Promise<SyncPushResponse> {
  // Verify device belongs to account
  const device = await findDeviceById(deviceId);
  if (!device || device.account_id !== accountId) {
    throw new Error('Invalid device');
  }

  // Update device last seen
  await updateDeviceLastSeen(deviceId);

  const conflicts: ConflictResponse[] = [];
  let synced = 0;

  for (const item of items) {
    try {
      if (item.deleted) {
        // Handle deletion (soft delete)
        if (!item.id) {
          continue; // Can't delete without ID
        }

        const existingItem = await findSyncItemById(item.id, accountId);
        const conflictResult = detectConflict(
          existingItem,
          item.version,
          item.id
        );

        if (conflictResult.hasConflict && conflictResult.conflict) {
          conflicts.push(conflictResult.conflict);
          continue;
        }

        if (existingItem) {
          await softDeleteSyncItem(item.id, accountId, item.version || 0);
          synced++;
        }
      } else if (item.id) {
        // Update existing item
        const existingItem = await findSyncItemById(item.id, accountId);
        const conflictResult = detectConflict(
          existingItem,
          item.version,
          item.id
        );

        if (conflictResult.hasConflict && conflictResult.conflict) {
          conflicts.push(conflictResult.conflict);
          continue;
        }

        if (existingItem) {
          await updateSyncItem(
            item.id,
            accountId,
            item.encryptedData,
            item.version || 0
          );
          synced++;
        } else {
          // Item doesn't exist, create new
          await createSyncItem(
            accountId,
            deviceId,
            item.itemType,
            item.encryptedData
          );
          synced++;
        }
      } else {
        // Create new item
        await createSyncItem(
          accountId,
          deviceId,
          item.itemType,
          item.encryptedData
        );
        synced++;
      }
    } catch (error) {
      console.error('Error syncing item:', error);
      // Continue with other items
    }
  }

  return {
    success: conflicts.length === 0,
    conflicts: conflicts.length > 0 ? conflicts : undefined,
    synced,
  };
}

/**
 * Get initial sync state for a device
 */
export async function getInitialSyncState(
  accountId: string,
  deviceId: string
): Promise<{ cursor: string | null; lastSync: string | null }> {
  const state = await getSyncState(accountId, deviceId);

  return {
    cursor: state?.sync_cursor || null,
    lastSync: state?.last_sync ? state.last_sync.toISOString() : null,
  };
}
