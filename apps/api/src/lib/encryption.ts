/**
 * Server-side encryption for MCP server environment variables
 *
 * Uses AES-256-GCM with a server-managed key from ENCRYPTION_KEY env var.
 * The key should be a 32-byte hex string (64 hex characters).
 */

import { encrypt, decrypt, type EncryptedData } from "@athreei/shared"

const CURRENT_KEY_VERSION = 1

/**
 * Get the encryption key from environment variable
 * @throws Error if ENCRYPTION_KEY is not set or invalid
 */
function getEncryptionKey(): Uint8Array {
  const keyHex = process.env.ENCRYPTION_KEY
  if (!keyHex) {
    throw new Error("ENCRYPTION_KEY environment variable is not set")
  }

  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error(
      "ENCRYPTION_KEY must be a valid 64-character hex string (32 bytes)"
    )
  }

  // Convert hex to Uint8Array
  const key = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    key[i] = parseInt(keyHex.slice(i * 2, i * 2 + 2), 16)
  }

  return key
}

/**
 * Encrypt environment variables for storage
 * @param env - Key-value pairs of environment variables
 * @returns Serialized encrypted data for database storage
 */
export function encryptEnv(env: Record<string, string>): string {
  const key = getEncryptionKey()
  const encrypted = encrypt(env, key, CURRENT_KEY_VERSION)
  return JSON.stringify(encrypted)
}

/**
 * Decrypt environment variables from storage
 * @param encryptedJson - JSON string from database
 * @returns Decrypted key-value pairs
 */
export function decryptEnv(encryptedJson: string): Record<string, string> {
  const key = getEncryptionKey()
  const encrypted: EncryptedData = JSON.parse(encryptedJson)
  return decrypt<Record<string, string>>(encrypted, key)
}

/**
 * Get the current encryption key version
 */
export function getCurrentKeyVersion(): number {
  return CURRENT_KEY_VERSION
}

/**
 * Check if encryption is configured
 */
export function isEncryptionConfigured(): boolean {
  const keyHex = process.env.ENCRYPTION_KEY
  return !!keyHex && keyHex.length === 64
}
