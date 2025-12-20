/**
 * AES-256-GCM encryption/decryption for athreei data
 * Uses @noble/ciphers for secure, cross-platform encryption
 */

import { gcm } from "@noble/ciphers/aes"
import { randomBytes } from "@noble/ciphers/webcrypto"
import type { EncryptedData } from "./types.js"

/**
 * Generate a random nonce for AES-GCM
 * GCM mode requires a 12-byte (96-bit) nonce
 */
export function generateNonce(): Uint8Array {
  return randomBytes(12) // 96 bits for GCM
}

/**
 * Encode Uint8Array to base64 string
 */
function toBase64(data: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    // Node.js environment
    return Buffer.from(data).toString("base64")
  } else {
    // Browser environment
    const binary = String.fromCharCode(...data)
    return btoa(binary)
  }
}

/**
 * Decode base64 string to Uint8Array
 */
function fromBase64(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    // Node.js environment
    return new Uint8Array(Buffer.from(base64, "base64"))
  } else {
    // Browser environment
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
}

/**
 * Encrypt data using AES-256-GCM
 *
 * @param plaintext - Data to encrypt (will be JSON stringified)
 * @param key - 256-bit encryption key (32 bytes)
 * @param keyVersion - Version of the encryption key
 * @param nonce - Optional nonce (will be generated if not provided)
 * @returns EncryptedData with ciphertext, nonce, and metadata
 *
 * @example
 * ```ts
 * const key = await deriveKey("password")
 * const encrypted = encrypt({ sensitive: "data" }, key.key, key.version)
 * ```
 */
export function encrypt(
  plaintext: unknown,
  key: Uint8Array,
  keyVersion: number,
  nonce?: Uint8Array
): EncryptedData {
  if (key.length !== 32) {
    throw new Error("Key must be 32 bytes (256 bits) for AES-256")
  }

  // Generate nonce if not provided
  const encryptionNonce = nonce || generateNonce()

  if (encryptionNonce.length !== 12) {
    throw new Error("Nonce must be 12 bytes (96 bits) for AES-GCM")
  }

  // Convert plaintext to JSON string, then to bytes
  const plaintextJson = JSON.stringify(plaintext)
  const plaintextBytes = new TextEncoder().encode(plaintextJson)

  // Create AES-GCM cipher
  const cipher = gcm(key, encryptionNonce)

  // Encrypt the data
  // GCM mode returns ciphertext with authentication tag appended
  const ciphertext = cipher.encrypt(plaintextBytes)

  // Return encrypted data with metadata
  return {
    ciphertext: toBase64(ciphertext),
    nonce: toBase64(encryptionNonce),
    salt: "", // Salt is stored separately with the derived key
    keyVersion,
  }
}

/**
 * Decrypt data using AES-256-GCM
 *
 * @param encryptedData - EncryptedData object from encrypt()
 * @param key - 256-bit decryption key (must match encryption key)
 * @returns Decrypted data (parsed from JSON)
 * @throws Error if authentication fails or data is corrupted
 *
 * @example
 * ```ts
 * const key = await reDeriveKey("password", encrypted.salt)
 * const decrypted = decrypt(encrypted, key.key)
 * ```
 */
export function decrypt<T = unknown>(encryptedData: EncryptedData, key: Uint8Array): T {
  if (key.length !== 32) {
    throw new Error("Key must be 32 bytes (256 bits) for AES-256")
  }

  // Decode from base64
  const ciphertext = fromBase64(encryptedData.ciphertext)
  const nonce = fromBase64(encryptedData.nonce)

  if (nonce.length !== 12) {
    throw new Error("Nonce must be 12 bytes (96 bits) for AES-GCM")
  }

  // Create AES-GCM decipher
  const decipher = gcm(key, nonce)

  // Decrypt and authenticate
  // GCM will throw if authentication tag doesn't match (data tampered)
  let plaintextBytes: Uint8Array
  try {
    plaintextBytes = decipher.decrypt(ciphertext)
  } catch (error) {
    throw new Error("Decryption failed: invalid key or corrupted data")
  }

  // Convert bytes to string and parse JSON
  const plaintextJson = new TextDecoder().decode(plaintextBytes)

  try {
    return JSON.parse(plaintextJson) as T
  } catch (error) {
    throw new Error("Decryption succeeded but data is not valid JSON")
  }
}

/**
 * Encrypt permissions data
 * Convenience wrapper for encrypting Permission objects
 */
export function encryptPermission(
  permission: unknown,
  key: Uint8Array,
  keyVersion: number
): EncryptedData {
  return encrypt(permission, key, keyVersion)
}

/**
 * Decrypt permissions data
 * Convenience wrapper for decrypting Permission objects
 */
export function decryptPermission<T = unknown>(
  encryptedData: EncryptedData,
  key: Uint8Array
): T {
  return decrypt<T>(encryptedData, key)
}

/**
 * Encrypt audit log entry
 * Convenience wrapper for encrypting AuditLogEntry objects
 */
export function encryptAuditLog(
  auditLog: unknown,
  key: Uint8Array,
  keyVersion: number
): EncryptedData {
  return encrypt(auditLog, key, keyVersion)
}

/**
 * Decrypt audit log entry
 * Convenience wrapper for decrypting AuditLogEntry objects
 */
export function decryptAuditLog<T = unknown>(encryptedData: EncryptedData, key: Uint8Array): T {
  return decrypt<T>(encryptedData, key)
}

/**
 * Encrypt session data
 * Convenience wrapper for encrypting Session objects
 */
export function encryptSession(
  session: unknown,
  key: Uint8Array,
  keyVersion: number
): EncryptedData {
  return encrypt(session, key, keyVersion)
}

/**
 * Decrypt session data
 * Convenience wrapper for decrypting Session objects
 */
export function decryptSession<T = unknown>(encryptedData: EncryptedData, key: Uint8Array): T {
  return decrypt<T>(encryptedData, key)
}
