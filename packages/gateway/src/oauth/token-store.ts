/**
 * Encrypted Token Store
 *
 * Securely stores OAuth tokens locally using AES-256-GCM encryption.
 * Key management:
 * - Primary: OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service)
 * - Fallback: Password-derived key via Argon2id
 * - Last resort: In-memory only (tokens don't persist)
 */

import { homedir } from "os"
import { join } from "path"
import { readFile, writeFile, rename, mkdir, chmod } from "fs/promises"
import { existsSync } from "fs"
import { encrypt, decrypt, type EncryptedData } from "@athreei/shared"
import type { TokenStore, StoredTokenData, KeySource } from "./types.js"
import { log } from "../logger.js"

const ATHREEI_DIR = join(homedir(), ".athreei")
const TOKENS_FILE = join(ATHREEI_DIR, "tokens.enc")
const KEY_VERSION = 1

/**
 * Encrypted token store with in-memory caching
 */
export class EncryptedTokenStore {
  private cache: TokenStore | null = null
  private encryptionKey: Uint8Array | null = null
  private keySource: KeySource

  constructor(keySource: KeySource, key?: Uint8Array) {
    this.keySource = keySource
    if (key) {
      this.encryptionKey = key
    }
  }

  /**
   * Set the encryption key (called after key derivation)
   */
  setKey(key: Uint8Array): void {
    this.encryptionKey = key
  }

  /**
   * Get token for a server URL
   */
  async get(serverUrl: string): Promise<StoredTokenData | null> {
    const store = await this.load()
    return store.tokens[serverUrl] ?? null
  }

  /**
   * Store token for a server URL
   */
  async set(serverUrl: string, token: StoredTokenData): Promise<void> {
    const store = await this.load()
    store.tokens[serverUrl] = token
    await this.save(store)
    log.info(`Stored OAuth token for ${token.provider}`)
  }

  /**
   * Delete token for a server URL
   */
  async delete(serverUrl: string): Promise<void> {
    const store = await this.load()
    const token = store.tokens[serverUrl]
    if (token) {
      delete store.tokens[serverUrl]
      await this.save(store)
      log.info(`Deleted OAuth token for ${token.provider}`)
    }
  }

  /**
   * List all stored tokens (metadata only)
   */
  async list(): Promise<Array<{ serverUrl: string; provider: string; expiresAt?: number }>> {
    const store = await this.load()
    return Object.entries(store.tokens).map(([serverUrl, token]) => ({
      serverUrl,
      provider: token.provider,
      expiresAt: token.expiresAt,
    }))
  }

  /**
   * Check if token exists and is not expired
   */
  async hasValidToken(serverUrl: string): Promise<boolean> {
    const token = await this.get(serverUrl)
    if (!token) return false
    if (token.expiresAt && Date.now() > token.expiresAt) return false
    return true
  }

  /**
   * Clear all tokens
   */
  async clear(): Promise<void> {
    this.cache = { version: 1, tokens: {} }
    await this.save(this.cache)
    log.info("Cleared all OAuth tokens")
  }

  /**
   * Load token store from disk
   */
  private async load(): Promise<TokenStore> {
    if (this.cache) return this.cache

    if (!this.encryptionKey) {
      throw new Error("Encryption key not set")
    }

    try {
      if (!existsSync(TOKENS_FILE)) {
        this.cache = { version: 1, tokens: {} }
        return this.cache
      }

      const encrypted = await readFile(TOKENS_FILE, "utf-8")
      const encryptedData: EncryptedData = JSON.parse(encrypted)
      this.cache = decrypt<TokenStore>(encryptedData, this.encryptionKey)
      return this.cache
    } catch (error) {
      // File doesn't exist or can't be decrypted
      log.warn("Could not load token store, starting fresh:", error)
      this.cache = { version: 1, tokens: {} }
      return this.cache
    }
  }

  /**
   * Save token store to disk with atomic write
   */
  private async save(store: TokenStore): Promise<void> {
    if (!this.encryptionKey) {
      if (this.keySource.type === "memory") {
        // In-memory only mode - just update cache
        this.cache = store
        return
      }
      throw new Error("Encryption key not set")
    }

    // Ensure directory exists
    await mkdir(ATHREEI_DIR, { recursive: true })

    // Encrypt
    const encrypted = encrypt(store, this.encryptionKey, KEY_VERSION)
    const json = JSON.stringify(encrypted)

    // Atomic write with restricted permissions
    const tempPath = `${TOKENS_FILE}.tmp`
    await writeFile(tempPath, json, { mode: 0o600 })
    await rename(tempPath, TOKENS_FILE)

    // Ensure correct permissions on final file
    await chmod(TOKENS_FILE, 0o600)

    this.cache = store
  }
}

/**
 * Create a token store with the appropriate key source
 */
export async function createTokenStore(
  keySource: KeySource,
  getPassword?: () => Promise<string>
): Promise<EncryptedTokenStore> {
  const store = new EncryptedTokenStore(keySource)

  switch (keySource.type) {
    case "keychain": {
      const key = await getKeychainKey()
      if (key) {
        store.setKey(key)
      } else {
        throw new Error("Failed to get key from keychain")
      }
      break
    }

    case "password": {
      const { deriveKey } = await import("@athreei/shared")
      const derived = await deriveKey(keySource.password)
      store.setKey(derived.key)
      break
    }

    case "memory": {
      // Generate ephemeral key - tokens won't persist
      const key = crypto.getRandomValues(new Uint8Array(32))
      store.setKey(key)
      log.warn("Using in-memory token storage - tokens will not persist across restarts")
      break
    }
  }

  return store
}

/**
 * Get or create encryption key from OS keychain
 */
async function getKeychainKey(): Promise<Uint8Array | null> {
  try {
    // Try to import keytar for cross-platform keychain access
    const keytar = await import("keytar").catch(() => null)
    if (!keytar) {
      log.debug("keytar not available, keychain storage unavailable")
      return null
    }

    const SERVICE = "athreei"
    const ACCOUNT = "oauth-tokens"

    // Try to get existing key
    const existingKey = await keytar.getPassword(SERVICE, ACCOUNT)
    if (existingKey) {
      return Buffer.from(existingKey, "base64")
    }

    // Generate new key and store
    const newKey = crypto.getRandomValues(new Uint8Array(32))
    await keytar.setPassword(SERVICE, ACCOUNT, Buffer.from(newKey).toString("base64"))
    log.info("Created new encryption key in OS keychain")

    return newKey
  } catch (error) {
    log.debug("Keychain access failed:", error)
    return null
  }
}

/**
 * Check if keychain is available on this system
 */
export async function isKeychainAvailable(): Promise<boolean> {
  try {
    const keytar = await import("keytar").catch(() => null)
    if (!keytar) return false

    // Try a test operation
    await keytar.findCredentials("athreei-test")
    return true
  } catch {
    return false
  }
}
