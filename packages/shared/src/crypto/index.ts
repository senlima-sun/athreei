/**
 * @athreei/shared/crypto - E2E encryption module
 *
 * This module provides secure end-to-end encryption for athreei data:
 * - Argon2id key derivation from passwords
 * - AES-256-GCM authenticated encryption
 * - Key rotation and versioning
 *
 * Usage:
 * ```ts
 * import { deriveKey, encrypt, decrypt } from "@athreei/shared/crypto"
 *
 * // Derive key from password
 * const derived = await deriveKey("user-password")
 *
 * // Encrypt sensitive data
 * const encrypted = encrypt(myData, derived.key, derived.version)
 *
 * // Later: decrypt with same password
 * const reDerived = await deriveKey("user-password", encrypted.salt)
 * const decrypted = decrypt(encrypted, reDerived.key)
 * ```
 */

// Export types
export type {
  CryptoConfig,
  EncryptedData,
  DerivedKey,
  KeyRotationOptions,
} from "./types.js"

export { DEFAULT_CRYPTO_CONFIG } from "./types.js"

// Export key derivation functions
export {
  deriveKey,
  reDeriveKey,
  generateSalt,
  verifyKeys,
} from "./argon2.js"

// Export encryption functions
export {
  encrypt,
  decrypt,
  generateNonce,
  encryptPermission,
  decryptPermission,
  encryptAuditLog,
  decryptAuditLog,
  encryptSession,
  decryptSession,
} from "./encryption.js"

// Export key rotation functions
export {
  rotateKey,
  rotateKeyBatch,
  filterByKeyVersion,
  verifyKeyVersion,
  getKeyVersionStats,
  planKeyRotation,
} from "./rotation.js"
