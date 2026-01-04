import type { SyncItem } from "../db/schema"
import type { ConflictResponse } from "../types"

export interface ConflictResult {
  hasConflict: boolean
  conflict?: ConflictResponse
}

/**
 * Detect conflicts using version-based conflict resolution
 * Last-write-wins with version checks
 */
export function detectConflict(
  serverItem: SyncItem | null,
  clientVersion: number | undefined,
  itemId: string
): ConflictResult {
  // No server item means no conflict (new item)
  if (!serverItem) {
    return { hasConflict: false }
  }

  // If client doesn't provide version, assume conflict
  if (clientVersion === undefined) {
    return {
      hasConflict: true,
      conflict: {
        itemId,
        serverVersion: serverItem.version,
        clientVersion: 0,
        serverData: mapSyncItemToResponse(serverItem),
      },
    }
  }

  // Version mismatch = conflict
  if (serverItem.version !== clientVersion) {
    return {
      hasConflict: true,
      conflict: {
        itemId,
        serverVersion: serverItem.version,
        clientVersion,
        serverData: mapSyncItemToResponse(serverItem),
      },
    }
  }

  return { hasConflict: false }
}

/**
 * Resolve conflicts based on vector clocks/timestamps
 * For now, we return conflicts to the client for manual resolution
 */
export function resolveConflict(
  serverItem: SyncItem,
  clientData: string,
  clientVersion: number
): "server" | "client" | "manual" {
  // If versions are close, require manual resolution
  if (Math.abs(serverItem.version - clientVersion) <= 1) {
    return "manual"
  }

  // Otherwise, last-write-wins (higher version)
  return serverItem.version > clientVersion ? "server" : "client"
}

/**
 * Check if a tombstone should be garbage collected
 */
export function shouldGarbageCollect(
  deletedAt: Date | null,
  retentionDays: number = 30
): boolean {
  if (!deletedAt) {
    return false
  }

  const now = new Date()
  const deletedTime = new Date(deletedAt).getTime()
  const daysSinceDeleted = (now.getTime() - deletedTime) / (1000 * 60 * 60 * 24)

  return daysSinceDeleted > retentionDays
}

// Helper to map SyncItem to response format
function mapSyncItemToResponse(item: SyncItem) {
  return {
    id: item.id,
    itemType: item.item_type,
    encryptedData: item.encrypted_data,
    version: item.version,
    updatedAt: item.updated_at.toISOString(),
    deletedAt: item.deleted_at ? item.deleted_at.toISOString() : null,
    deviceId: item.device_id,
  }
}
