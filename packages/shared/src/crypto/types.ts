/**
 * Cryptography types for athreei E2E encryption
 */

/**
 * Configuration for Argon2 key derivation
 */
export interface CryptoConfig {
  /**
   * Memory size in KiB (e.g., 65536 = 64 MiB)
   * Higher values increase security but require more memory
   */
  memory: number

  /**
   * Number of iterations
   * Higher values increase security but take more time
   */
  iterations: number

  /**
   * Degree of parallelism
   * Number of parallel threads to use
   */
  parallelism: number

  /**
   * Output key length in bytes
   * For AES-256, this should be 32 bytes
   */
  keyLength: number

  /**
   * Salt length in bytes
   * Recommended: 16 bytes minimum
   */
  saltLength: number
}

/**
 * Encrypted data container with all metadata needed for decryption
 */
export interface EncryptedData {
  /**
   * Base64-encoded ciphertext
   */
  ciphertext: string

  /**
   * Base64-encoded nonce/IV (12 bytes for GCM)
   */
  nonce: string

  /**
   * Base64-encoded salt used for key derivation
   */
  salt: string

  /**
   * Version of the encryption key used
   * Allows for key rotation and migration
   */
  keyVersion: number

  /**
   * Authentication tag for GCM mode (included in ciphertext by noble/ciphers)
   */
  tag?: string
}

/**
 * Result of key derivation operation
 */
export interface DerivedKey {
  /**
   * The derived encryption key
   */
  key: Uint8Array

  /**
   * The salt used for derivation
   */
  salt: Uint8Array

  /**
   * Key version identifier
   */
  version: number
}

/**
 * Options for key rotation
 */
export interface KeyRotationOptions {
  /**
   * The old key version to rotate from
   */
  oldVersion: number

  /**
   * The new key version to rotate to
   */
  newVersion: number

  /**
   * Optional: batch size for bulk re-encryption
   */
  batchSize?: number
}

/**
 * Default Argon2 configuration
 * Based on OWASP recommendations for client-side encryption
 */
export const DEFAULT_CRYPTO_CONFIG: CryptoConfig = {
  memory: 65536, // 64 MiB
  iterations: 3, // 3 iterations
  parallelism: 4, // 4 parallel threads
  keyLength: 32, // 256 bits for AES-256
  saltLength: 16, // 128 bits
}
