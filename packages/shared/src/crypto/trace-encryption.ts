/**
 * E2E Encryption for Trace Data
 *
 * Uses XChaCha20-Poly1305 for authenticated encryption of trace payloads.
 * This provides:
 * - 256-bit key security
 * - 192-bit (24-byte) nonce - safe to use with random generation
 * - AEAD (Authenticated Encryption with Associated Data)
 *
 * Key management:
 * - User's encryption key derived from password (Argon2)
 * - Key stored locally in Gateway config
 * - Platform never sees plaintext traces
 */

import { xchacha20poly1305 } from "@noble/ciphers/chacha"
import { randomBytes } from "@noble/ciphers/webcrypto"
import type { DerivedKey, CryptoConfig } from "./types.js"
import { deriveKey } from "./argon2.js"
import { DEFAULT_CRYPTO_CONFIG } from "./types.js"

/**
 * Trace payload containing sensitive request/response data
 */
export interface TracePayload {
  /** Tool call request arguments */
  request: unknown
  /** Tool call response (on success) */
  response?: unknown
  /** Error message (on failure) */
  error?: string
}

/**
 * Encrypted trace data with metadata for decryption
 */
export interface EncryptedTrace {
  /** Base64-encoded nonce (24 bytes for XChaCha20) */
  nonce: string
  /** Base64-encoded ciphertext with authentication tag */
  ciphertext: string
  /** Key version used for encryption (for key rotation) */
  keyVersion: number
  /** Encryption algorithm identifier */
  algorithm: "xchacha20poly1305"
}

/**
 * Configuration for trace encryption
 */
export interface TraceEncryptionConfig {
  /** Encryption key (32 bytes / 256 bits) */
  key: Uint8Array
  /** Key version for tracking rotation */
  keyVersion: number
}

/**
 * XChaCha20-Poly1305 nonce length in bytes (192 bits)
 */
const XCHACHA_NONCE_LENGTH = 24

/**
 * Generate a cryptographically secure random nonce for XChaCha20
 */
export function generateTraceNonce(): Uint8Array {
  return randomBytes(XCHACHA_NONCE_LENGTH)
}

/**
 * Encode Uint8Array to base64 string
 */
function toBase64(data: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(data).toString("base64")
  } else {
    const binary = String.fromCharCode(...data)
    return btoa(binary)
  }
}

/**
 * Decode base64 string to Uint8Array
 */
function fromBase64(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"))
  } else {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
}

/**
 * Encrypt a trace payload using XChaCha20-Poly1305
 *
 * @param payload - The trace payload to encrypt
 * @param key - 256-bit encryption key (32 bytes)
 * @param keyVersion - Version of the encryption key (default: 1)
 * @param nonce - Optional nonce (24 bytes, generated if not provided)
 * @returns Encrypted trace with nonce and metadata
 *
 * @example
 * ```ts
 * const encryptedTrace = encryptTrace(
 *   { request: { url: "..." }, response: { data: "..." } },
 *   userKey,
 *   1
 * )
 * ```
 */
export function encryptTrace(
  payload: TracePayload,
  key: Uint8Array,
  keyVersion: number = 1,
  nonce?: Uint8Array
): EncryptedTrace {
  // Validate key length
  if (key.length !== 32) {
    throw new Error("Key must be 32 bytes (256 bits) for XChaCha20-Poly1305")
  }

  // Generate or validate nonce
  const encryptionNonce = nonce || generateTraceNonce()
  if (encryptionNonce.length !== XCHACHA_NONCE_LENGTH) {
    throw new Error(`Nonce must be ${XCHACHA_NONCE_LENGTH} bytes for XChaCha20`)
  }

  // Convert payload to JSON bytes
  const plaintextJson = JSON.stringify(payload)
  const plaintextBytes = new TextEncoder().encode(plaintextJson)

  // Create cipher and encrypt
  const cipher = xchacha20poly1305(key, encryptionNonce)
  const ciphertext = cipher.encrypt(plaintextBytes)

  return {
    nonce: toBase64(encryptionNonce),
    ciphertext: toBase64(ciphertext),
    keyVersion,
    algorithm: "xchacha20poly1305",
  }
}

/**
 * Decrypt an encrypted trace payload
 *
 * @param encryptedTrace - The encrypted trace data
 * @param key - 256-bit decryption key (must match encryption key)
 * @returns Decrypted trace payload
 * @throws Error if authentication fails or data is corrupted
 *
 * @example
 * ```ts
 * const payload = decryptTrace(encryptedTrace, userKey)
 * console.log(payload.request, payload.response)
 * ```
 */
export function decryptTrace(
  encryptedTrace: EncryptedTrace,
  key: Uint8Array
): TracePayload {
  // Validate key length
  if (key.length !== 32) {
    throw new Error("Key must be 32 bytes (256 bits) for XChaCha20-Poly1305")
  }

  // Validate algorithm
  if (encryptedTrace.algorithm !== "xchacha20poly1305") {
    throw new Error(
      `Unsupported encryption algorithm: ${encryptedTrace.algorithm}`
    )
  }

  // Decode from base64
  const nonce = fromBase64(encryptedTrace.nonce)
  const ciphertext = fromBase64(encryptedTrace.ciphertext)

  // Validate nonce length
  if (nonce.length !== XCHACHA_NONCE_LENGTH) {
    throw new Error(
      `Invalid nonce length: expected ${XCHACHA_NONCE_LENGTH}, got ${nonce.length}`
    )
  }

  // Create cipher and decrypt
  const cipher = xchacha20poly1305(key, nonce)

  let plaintextBytes: Uint8Array
  try {
    plaintextBytes = cipher.decrypt(ciphertext)
  } catch (error) {
    throw new Error("Decryption failed: invalid key or corrupted data")
  }

  // Parse JSON
  const plaintextJson = new TextDecoder().decode(plaintextBytes)

  try {
    return JSON.parse(plaintextJson) as TracePayload
  } catch (error) {
    throw new Error("Decryption succeeded but payload is not valid JSON")
  }
}

/**
 * Encrypt trace payload to raw bytes (nonce + ciphertext)
 *
 * This is a lower-level function that returns the encrypted data
 * as a single Uint8Array with the nonce prepended.
 *
 * @param payload - The trace payload to encrypt
 * @param key - 256-bit encryption key (32 bytes)
 * @returns Uint8Array containing nonce (24 bytes) + ciphertext
 */
export function encryptTraceToBytes(
  payload: TracePayload,
  key: Uint8Array
): Uint8Array {
  if (key.length !== 32) {
    throw new Error("Key must be 32 bytes (256 bits) for XChaCha20-Poly1305")
  }

  const nonce = generateTraceNonce()
  const plaintextJson = JSON.stringify(payload)
  const plaintextBytes = new TextEncoder().encode(plaintextJson)

  const cipher = xchacha20poly1305(key, nonce)
  const ciphertext = cipher.encrypt(plaintextBytes)

  // Concatenate nonce + ciphertext
  const result = new Uint8Array(nonce.length + ciphertext.length)
  result.set(nonce, 0)
  result.set(ciphertext, nonce.length)

  return result
}

/**
 * Decrypt trace payload from raw bytes (nonce + ciphertext)
 *
 * @param encryptedBytes - Uint8Array containing nonce (24 bytes) + ciphertext
 * @param key - 256-bit decryption key (32 bytes)
 * @returns Decrypted trace payload
 */
export function decryptTraceFromBytes(
  encryptedBytes: Uint8Array,
  key: Uint8Array
): TracePayload {
  if (key.length !== 32) {
    throw new Error("Key must be 32 bytes (256 bits) for XChaCha20-Poly1305")
  }

  if (encryptedBytes.length <= XCHACHA_NONCE_LENGTH) {
    throw new Error(
      "Encrypted data too short: must contain nonce and ciphertext"
    )
  }

  // Extract nonce and ciphertext
  const nonce = encryptedBytes.slice(0, XCHACHA_NONCE_LENGTH)
  const ciphertext = encryptedBytes.slice(XCHACHA_NONCE_LENGTH)

  const cipher = xchacha20poly1305(key, nonce)

  let plaintextBytes: Uint8Array
  try {
    plaintextBytes = cipher.decrypt(ciphertext)
  } catch (error) {
    throw new Error("Decryption failed: invalid key or corrupted data")
  }

  const plaintextJson = new TextDecoder().decode(plaintextBytes)

  try {
    return JSON.parse(plaintextJson) as TracePayload
  } catch (error) {
    throw new Error("Decryption succeeded but payload is not valid JSON")
  }
}

/**
 * Derive an encryption key from a password for trace encryption
 *
 * This is a convenience wrapper around deriveKey that uses
 * the appropriate configuration for trace encryption.
 *
 * @param password - User password to derive key from
 * @param salt - Optional salt (generated if not provided)
 * @param config - Optional Argon2 configuration
 * @param keyVersion - Optional key version identifier
 * @returns DerivedKey with key, salt, and version
 *
 * @example
 * ```ts
 * const derived = await deriveTraceKey("user-password")
 * const encrypted = encryptTrace(payload, derived.key, derived.version)
 * ```
 */
export async function deriveTraceKey(
  password: string,
  salt?: Uint8Array,
  config?: CryptoConfig,
  keyVersion?: number
): Promise<DerivedKey> {
  return deriveKey(
    password,
    salt,
    config || DEFAULT_CRYPTO_CONFIG,
    keyVersion || 1
  )
}

/**
 * Validate that an object conforms to the EncryptedTrace interface
 */
export function isValidEncryptedTrace(data: unknown): data is EncryptedTrace {
  if (typeof data !== "object" || data === null) {
    return false
  }

  const trace = data as Record<string, unknown>

  return (
    typeof trace.nonce === "string" &&
    typeof trace.ciphertext === "string" &&
    typeof trace.keyVersion === "number" &&
    trace.algorithm === "xchacha20poly1305"
  )
}

/**
 * Batch encrypt multiple trace payloads
 *
 * @param payloads - Array of trace payloads to encrypt
 * @param key - 256-bit encryption key (32 bytes)
 * @param keyVersion - Version of the encryption key
 * @returns Array of encrypted traces
 */
export function encryptTraceBatch(
  payloads: TracePayload[],
  key: Uint8Array,
  keyVersion: number = 1
): EncryptedTrace[] {
  return payloads.map((payload) => encryptTrace(payload, key, keyVersion))
}

/**
 * Batch decrypt multiple encrypted traces
 *
 * @param encryptedTraces - Array of encrypted traces
 * @param key - 256-bit decryption key
 * @returns Array of decrypted trace payloads
 */
export function decryptTraceBatch(
  encryptedTraces: EncryptedTrace[],
  key: Uint8Array
): TracePayload[] {
  return encryptedTraces.map((trace) => decryptTrace(trace, key))
}
