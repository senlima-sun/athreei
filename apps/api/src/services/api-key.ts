/**
 * API Key service
 *
 * Utilities for generating, hashing, and validating API keys.
 * Uses cryptographic functions for security.
 */

import { eq, and, isNull } from "drizzle-orm"
import { type DatabaseClient } from "../lib/db"
import { apiKey, endpoint } from "@athreei/db"

/**
 * Result type for API key validation
 */
export type ApiKeyValidationResult =
  | {
      valid: true
      apiKeyRecord: typeof apiKey.$inferSelect
      endpointRecord: typeof endpoint.$inferSelect
      keyHash: string
    }
  | {
      valid: false
      error: string
    }

/**
 * Generate a secure random API key.
 *
 * Uses crypto.getRandomValues for cryptographic security.
 * Returns a base64url-encoded 32-byte random value.
 *
 * @returns A 43-character random API key (base64url without padding)
 *
 * @example
 * ```typescript
 * const key = generateApiKey()
 * // "xYz123AbC456..."
 * const fullKey = `ak_${key}`
 * // "ak_xYz123AbC456..."
 * ```
 */
export function generateApiKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  // Convert to base64url encoding (URL-safe, no padding)
  const base64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
  return base64
}

/**
 * Hash an API key using SHA-256.
 *
 * API keys are stored as hashes in the database for security.
 * The hash is returned as a lowercase hex string.
 *
 * @param key - The API key to hash (with or without "ak_" prefix)
 * @returns A 64-character hex string hash
 *
 * @example
 * ```typescript
 * const hash = await hashApiKey("xYz123AbC456...")
 * // "a1b2c3d4..."
 * ```
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

/**
 * Create a key prefix for display purposes.
 *
 * Returns the first 8 characters of the key with "ak_" prefix.
 * Used for identifying keys in the UI without exposing the full key.
 *
 * @param key - The API key (without prefix)
 * @returns A key prefix like "ak_xYz123Ab"
 */
export function createKeyPrefix(key: string): string {
  return `ak_${key.substring(0, 8)}`
}

/**
 * Create the full API key with prefix.
 *
 * @param key - The raw API key
 * @returns The full key with "ak_" prefix
 */
export function createFullKey(key: string): string {
  return `ak_${key}`
}

/**
 * Validate an API key and return associated endpoint information.
 *
 * Checks that the key:
 * - Exists and is not revoked
 * - Has not expired
 * - Is associated with an endpoint
 *
 * Also updates the last used timestamp and usage count.
 *
 * @param db - Database client instance
 * @param key - The API key to validate (with or without "ak_" prefix)
 * @returns Validation result with key/endpoint records or error
 *
 * @example
 * ```typescript
 * const result = await validateApiKey(db, "ak_xYz123...")
 * if (!result.valid) {
 *   return c.json({ error: result.error }, 401)
 * }
 * const { apiKeyRecord, endpointRecord } = result
 * ```
 */
export async function validateApiKey(
  db: DatabaseClient,
  key: string
): Promise<ApiKeyValidationResult> {
  // Strip "ak_" prefix if present (the key is stored without it)
  const keyToHash = key.startsWith("ak_") ? key.slice(3) : key
  const keyHash = await hashApiKey(keyToHash)

  // Find the API key by hash
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query

  const apiKeyRecord = (await dbQuery.apiKey.findFirst({
    where: and(eq(apiKey.keyHash, keyHash), isNull(apiKey.revokedAt)),
  })) as typeof apiKey.$inferSelect | undefined

  if (!apiKeyRecord) {
    return { valid: false, error: "Invalid or revoked API key" }
  }

  // Check expiration
  if (apiKeyRecord.expiresAt && new Date(apiKeyRecord.expiresAt) < new Date()) {
    return { valid: false, error: "API key has expired" }
  }

  // Get the associated endpoint
  if (!apiKeyRecord.endpointId) {
    return { valid: false, error: "API key is not associated with an endpoint" }
  }

  const endpointRecord = (await dbQuery.endpoint.findFirst({
    where: eq(endpoint.id, apiKeyRecord.endpointId),
  })) as typeof endpoint.$inferSelect | undefined

  if (!endpointRecord) {
    return { valid: false, error: "Associated endpoint not found" }
  }

  // Update last used timestamp
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .update(apiKey)
    .set({
      lastUsedAt: new Date(),
      usageCount: apiKeyRecord.usageCount + 1,
    })
    .where(eq(apiKey.id, apiKeyRecord.id))

  return {
    valid: true,
    apiKeyRecord,
    endpointRecord,
    keyHash,
  }
}

/**
 * Parse the Authorization header and extract API key.
 *
 * Expects format: "Bearer {api_key}"
 *
 * @param header - The Authorization header value
 * @returns The API key if valid format, null otherwise
 *
 * @example
 * ```typescript
 * const key = parseAuthHeader("Bearer ak_xYz123...")
 * // "ak_xYz123..."
 * ```
 */
export function parseAuthHeader(header: string | undefined): string | null {
  if (!header) return null

  const parts = header.split(" ")
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null
  }

  return parts[1]
}
