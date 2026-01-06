/**
 * Token encryption for CLI
 * Uses AES-256-GCM for encrypting/decrypting MCP server tokens
 */

import { gcm } from "@noble/ciphers/aes"
import { randomBytes } from "@noble/ciphers/webcrypto"
import { scrypt } from "@noble/hashes/scrypt"
import { homedir } from "os"
import { join } from "path"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs"

const ENCRYPTED_PREFIX = "encrypted:"
const CONFIG_DIR = join(homedir(), ".a3i")
const KEY_FILE = join(CONFIG_DIR, ".key")

/**
 * Get or create a machine-specific encryption key
 * Key is derived from a random seed stored in ~/.a3i/.key
 */
function getEncryptionKey(): Uint8Array {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }

  let seed: Uint8Array

  if (existsSync(KEY_FILE)) {
    // Read existing seed
    const seedBase64 = readFileSync(KEY_FILE, "utf-8").trim()
    seed = Buffer.from(seedBase64, "base64")
  } else {
    // Generate new seed
    seed = randomBytes(32)
    writeFileSync(KEY_FILE, Buffer.from(seed).toString("base64"), {
      mode: 0o600, // Read/write for owner only
    })
  }

  // Derive key from seed using scrypt
  return scrypt(seed, new TextEncoder().encode("a3i-cli-key"), {
    N: 2 ** 14,
    r: 8,
    p: 1,
    dkLen: 32,
  })
}

/**
 * Encrypt a token
 * Returns "encrypted:base64..." format
 */
export function encryptToken(plainToken: string): string {
  const key = getEncryptionKey()
  const nonce = randomBytes(12) // 96 bits for GCM
  const plaintext = new TextEncoder().encode(plainToken)

  const cipher = gcm(key, nonce)
  const ciphertext = cipher.encrypt(plaintext)

  // Combine nonce + ciphertext and encode as base64
  const combined = new Uint8Array(nonce.length + ciphertext.length)
  combined.set(nonce, 0)
  combined.set(ciphertext, nonce.length)

  return ENCRYPTED_PREFIX + Buffer.from(combined).toString("base64")
}

/**
 * Decrypt a token
 * Accepts "encrypted:base64..." format
 */
export function decryptToken(encryptedToken: string): string {
  if (!isEncrypted(encryptedToken)) {
    // Return as-is if not encrypted
    return encryptedToken
  }

  const key = getEncryptionKey()
  const base64 = encryptedToken.slice(ENCRYPTED_PREFIX.length)
  const combined = Buffer.from(base64, "base64")

  // Extract nonce and ciphertext
  const nonce = combined.subarray(0, 12)
  const ciphertext = combined.subarray(12)

  const decipher = gcm(key, nonce)
  const plaintext = decipher.decrypt(ciphertext)

  return new TextDecoder().decode(plaintext)
}

/**
 * Check if a token is encrypted
 */
export function isEncrypted(token: string): boolean {
  return token.startsWith(ENCRYPTED_PREFIX)
}
