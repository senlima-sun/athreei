/**
 * Argon2 key derivation for password-based encryption
 * Uses @noble/hashes for secure, cross-platform key derivation
 */

import { argon2id } from "@noble/hashes/argon2"
import type { CryptoConfig, DerivedKey } from "./types"
import { DEFAULT_CRYPTO_CONFIG } from "./types"

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(
  length: number = DEFAULT_CRYPTO_CONFIG.saltLength
): Uint8Array {
  // Use crypto.getRandomValues for secure random generation
  const salt = new Uint8Array(length)

  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(salt)
  } else {
    // Fallback for Node.js environments without global crypto
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeCrypto = require("crypto") as typeof import("crypto")
    nodeCrypto.randomFillSync(salt)
  }

  return salt
}

/**
 * Derive an encryption key from a password using Argon2id
 *
 * @param password - User password to derive key from
 * @param salt - Salt for key derivation (will be generated if not provided)
 * @param config - Argon2 configuration parameters
 * @param keyVersion - Version identifier for the derived key
 * @returns DerivedKey with key, salt, and version
 *
 * @example
 * ```ts
 * const derived = await deriveKey("user-password", undefined, DEFAULT_CRYPTO_CONFIG, 1)
 * // Use derived.key for encryption
 * // Store derived.salt for future derivation
 * ```
 */
export async function deriveKey(
  password: string,
  salt?: Uint8Array,
  config: CryptoConfig = DEFAULT_CRYPTO_CONFIG,
  keyVersion: number = 1
): Promise<DerivedKey> {
  // Generate salt if not provided
  const derivationSalt = salt || generateSalt(config.saltLength)

  // Convert password to Uint8Array
  const passwordBytes = new TextEncoder().encode(password)

  // Derive key using Argon2id
  // Argon2id is the recommended variant combining resistance to both
  // side-channel and GPU attacks
  const key = argon2id(passwordBytes, derivationSalt, {
    m: config.memory, // Memory in KiB
    t: config.iterations, // Time cost (iterations)
    p: config.parallelism, // Parallelism
    dkLen: config.keyLength, // Desired key length
  })

  return {
    key,
    salt: derivationSalt,
    version: keyVersion,
  }
}

/**
 * Re-derive a key from a password and existing salt
 * Used when decrypting data with stored salt
 *
 * @param password - User password
 * @param salt - Previously stored salt
 * @param config - Argon2 configuration (must match original)
 * @param keyVersion - Key version identifier
 * @returns DerivedKey with the re-derived key
 */
export async function reDeriveKey(
  password: string,
  salt: Uint8Array,
  config: CryptoConfig = DEFAULT_CRYPTO_CONFIG,
  keyVersion: number = 1
): Promise<DerivedKey> {
  return deriveKey(password, salt, config, keyVersion)
}

/**
 * Verify that two keys are identical
 * Used for testing and validation
 */
export function verifyKeys(key1: Uint8Array, key2: Uint8Array): boolean {
  if (key1.length !== key2.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < key1.length; i++) {
    result |= (key1[i] ?? 0) ^ (key2[i] ?? 0)
  }

  return result === 0
}
