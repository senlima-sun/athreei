/**
 * Key rotation mechanism for re-encrypting data with new keys
 * Allows for secure key updates without data loss
 */

import type { EncryptedData, KeyRotationOptions } from "./types"
import { decrypt, encrypt } from "./encryption"

/**
 * Re-encrypt data with a new key
 *
 * This is used when rotating encryption keys to maintain forward secrecy.
 * The old key is used to decrypt the data, then the new key encrypts it.
 *
 * @param encryptedData - Data encrypted with old key
 * @param oldKey - The old encryption key
 * @param newKey - The new encryption key
 * @param newKeyVersion - Version number for the new key
 * @returns EncryptedData encrypted with new key
 *
 * @example
 * ```ts
 * const oldKey = await deriveKey("old-password", oldSalt, config, 1)
 * const newKey = await deriveKey("new-password", undefined, config, 2)
 * const reEncrypted = rotateKey(encrypted, oldKey.key, newKey.key, newKey.version)
 * ```
 */
export function rotateKey(
  encryptedData: EncryptedData,
  oldKey: Uint8Array,
  newKey: Uint8Array,
  newKeyVersion: number
): EncryptedData {
  // Decrypt with old key
  const plaintext = decrypt(encryptedData, oldKey)

  // Re-encrypt with new key
  const reEncrypted = encrypt(plaintext, newKey, newKeyVersion)

  // Preserve the salt from the original if it exists
  // (though typically salt is stored separately)
  if (encryptedData.salt) {
    reEncrypted.salt = encryptedData.salt
  }

  return reEncrypted
}

/**
 * Rotate keys for multiple encrypted items
 *
 * @param items - Array of encrypted data items
 * @param oldKey - The old encryption key
 * @param newKey - The new encryption key
 * @param options - Key rotation options
 * @returns Array of re-encrypted items
 *
 * @example
 * ```ts
 * const reEncryptedItems = await rotateKeyBatch(
 *   encryptedPermissions,
 *   oldKey.key,
 *   newKey.key,
 *   { oldVersion: 1, newVersion: 2 }
 * )
 * ```
 */
export async function rotateKeyBatch(
  items: EncryptedData[],
  oldKey: Uint8Array,
  newKey: Uint8Array,
  options: KeyRotationOptions
): Promise<EncryptedData[]> {
  const batchSize = options.batchSize || 100
  const results: EncryptedData[] = []

  // Process in batches to avoid blocking for too long
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)

    const reEncryptedBatch = batch.map((item) => {
      // Verify the item is using the expected old version
      if (item.keyVersion !== options.oldVersion) {
        throw new Error(
          `Key version mismatch: expected ${options.oldVersion}, got ${item.keyVersion}`
        )
      }

      return rotateKey(item, oldKey, newKey, options.newVersion)
    })

    results.push(...reEncryptedBatch)

    // Allow event loop to process other tasks between batches
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  return results
}

/**
 * Filter encrypted items by key version
 *
 * Useful for identifying which items need to be re-encrypted
 * during a key rotation operation
 *
 * @param items - Array of encrypted data items
 * @param version - Key version to filter for
 * @returns Items matching the specified key version
 */
export function filterByKeyVersion(
  items: EncryptedData[],
  version: number
): EncryptedData[] {
  return items.filter((item) => item.keyVersion === version)
}

/**
 * Verify all items use the expected key version
 *
 * @param items - Array of encrypted data items
 * @param expectedVersion - Expected key version
 * @returns true if all items match expected version
 */
export function verifyKeyVersion(
  items: EncryptedData[],
  expectedVersion: number
): boolean {
  return items.every((item) => item.keyVersion === expectedVersion)
}

/**
 * Get statistics about key versions in a dataset
 *
 * @param items - Array of encrypted data items
 * @returns Map of version numbers to count of items
 *
 * @example
 * ```ts
 * const stats = getKeyVersionStats(encryptedData)
 * console.log(`Items using v1: ${stats.get(1)}`)
 * console.log(`Items using v2: ${stats.get(2)}`)
 * ```
 */
export function getKeyVersionStats(
  items: EncryptedData[]
): Map<number, number> {
  const stats = new Map<number, number>()

  for (const item of items) {
    const count = stats.get(item.keyVersion) || 0
    stats.set(item.keyVersion, count + 1)
  }

  return stats
}

/**
 * Create a key rotation plan
 *
 * Analyzes a dataset and returns information about what needs to be rotated
 *
 * @param items - Array of encrypted data items
 * @param targetVersion - The version to rotate to
 * @returns Object with rotation statistics and items to rotate
 */
export function planKeyRotation(
  items: EncryptedData[],
  targetVersion: number
): {
  totalItems: number
  itemsToRotate: number
  itemsAlreadyRotated: number
  versionStats: Map<number, number>
  itemsNeedingRotation: EncryptedData[]
} {
  const versionStats = getKeyVersionStats(items)
  const itemsNeedingRotation = items.filter(
    (item) => item.keyVersion !== targetVersion
  )

  return {
    totalItems: items.length,
    itemsToRotate: itemsNeedingRotation.length,
    itemsAlreadyRotated: items.length - itemsNeedingRotation.length,
    versionStats,
    itemsNeedingRotation,
  }
}
