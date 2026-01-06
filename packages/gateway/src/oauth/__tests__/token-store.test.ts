/**
 * Tests for Encrypted Token Store
 *
 * Tests token storage with encryption/decryption using mocked dependencies.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

// Hoist mock implementations
const { mockKeytar, mockEncrypt, mockDecrypt, mockDeriveKey, mockFs } =
  vi.hoisted(() => ({
    mockKeytar: {
      getPassword: vi.fn(),
      setPassword: vi.fn(),
      findCredentials: vi.fn(),
    },
    mockEncrypt: vi.fn(),
    mockDecrypt: vi.fn(),
    mockDeriveKey: vi.fn().mockResolvedValue({
      key: new Uint8Array(32).fill(2),
      salt: "test-salt",
    }),
    mockFs: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      rename: vi.fn(),
      mkdir: vi.fn(),
      chmod: vi.fn(),
    },
  }))

// Mock keytar
vi.mock("keytar", () => mockKeytar)

// Mock @athreei/shared encryption functions
vi.mock("@athreei/shared", () => ({
  encrypt: mockEncrypt,
  decrypt: mockDecrypt,
  deriveKey: mockDeriveKey,
}))

// Mock fs/promises
vi.mock("fs/promises", () => mockFs)

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(false),
}))

// Mock os.homedir
vi.mock("os", () => ({
  homedir: () => "/home/testuser",
}))

// Mock logger
vi.mock("../../logger.js", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import {
  EncryptedTokenStore,
  createTokenStore,
  isKeychainAvailable,
} from "../token-store.js"
import type { StoredTokenData } from "../types.js"

describe("EncryptedTokenStore", () => {
  const testKey = new Uint8Array(32).fill(1)

  const testToken: StoredTokenData = {
    access_token: "test_access_token",
    token_type: "Bearer",
    refresh_token: "test_refresh_token",
    expires_in: 3600,
    expiresAt: Date.now() + 3600000,
    obtainedAt: Date.now(),
    provider: "TestProvider",
    serverUrl: "https://api.example.com",
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Default encryption mock behavior
    mockEncrypt.mockImplementation((data) => ({
      ciphertext: Buffer.from(JSON.stringify(data)).toString("base64"),
      nonce: "test-nonce",
      salt: "",
      keyVersion: 1,
    }))

    mockDecrypt.mockImplementation((encrypted) => {
      return JSON.parse(Buffer.from(encrypted.ciphertext, "base64").toString())
    })

    mockFs.mkdir.mockResolvedValue(undefined)
    mockFs.writeFile.mockResolvedValue(undefined)
    mockFs.rename.mockResolvedValue(undefined)
    mockFs.chmod.mockResolvedValue(undefined)
  })

  describe("constructor", () => {
    it("creates store with key source", () => {
      const store = new EncryptedTokenStore({ type: "memory" })
      expect(store).toBeInstanceOf(EncryptedTokenStore)
    })

    it("accepts pre-configured key", () => {
      const store = new EncryptedTokenStore({ type: "memory" }, testKey)
      expect(store).toBeInstanceOf(EncryptedTokenStore)
    })
  })

  describe("setKey", () => {
    it("sets the encryption key", () => {
      const store = new EncryptedTokenStore({ type: "memory" })
      store.setKey(testKey)
      // Key is set internally - verify by attempting operations
      expect(() => store.setKey(testKey)).not.toThrow()
    })
  })

  describe("get", () => {
    it("returns null when no token exists", async () => {
      const store = new EncryptedTokenStore({ type: "memory" }, testKey)

      const result = await store.get("https://nonexistent.com")

      expect(result).toBeNull()
    })

    it("returns stored token by server URL", async () => {
      const store = new EncryptedTokenStore({ type: "memory" }, testKey)
      await store.set(testToken.serverUrl, testToken)

      const result = await store.get(testToken.serverUrl)

      expect(result).toEqual(testToken)
    })

    it("throws when encryption key is not set", async () => {
      const store = new EncryptedTokenStore({ type: "keychain" })

      await expect(store.get("https://example.com")).rejects.toThrow(
        "Encryption key not set"
      )
    })
  })

  describe("set", () => {
    it("stores token for server URL", async () => {
      const store = new EncryptedTokenStore({ type: "memory" }, testKey)

      await store.set(testToken.serverUrl, testToken)

      const result = await store.get(testToken.serverUrl)
      expect(result).toEqual(testToken)
    })

    it("overwrites existing token", async () => {
      const store = new EncryptedTokenStore({ type: "memory" }, testKey)
      await store.set(testToken.serverUrl, testToken)

      const updatedToken = {
        ...testToken,
        access_token: "new_access_token",
      }
      await store.set(testToken.serverUrl, updatedToken)

      const result = await store.get(testToken.serverUrl)
      expect(result?.access_token).toBe("new_access_token")
    })

    it("persists to encrypted file for non-memory key source", async () => {
      // Use password key source which should persist
      const store = new EncryptedTokenStore(
        { type: "password", password: "test" },
        testKey
      )
      await store.set(testToken.serverUrl, testToken)

      // Verify encrypt was called
      expect(mockEncrypt).toHaveBeenCalled()
    })
  })

  describe("delete", () => {
    it("removes token for server URL", async () => {
      const store = new EncryptedTokenStore({ type: "memory" }, testKey)
      await store.set(testToken.serverUrl, testToken)

      await store.delete(testToken.serverUrl)

      const result = await store.get(testToken.serverUrl)
      expect(result).toBeNull()
    })

    it("does nothing when token does not exist", async () => {
      const store = new EncryptedTokenStore({ type: "memory" }, testKey)

      // Should not throw
      await expect(
        store.delete("https://nonexistent.com")
      ).resolves.not.toThrow()
    })
  })

  describe("list", () => {
    it("returns empty array when no tokens stored", async () => {
      const store = new EncryptedTokenStore({ type: "memory" }, testKey)

      const result = await store.list()

      expect(result).toEqual([])
    })

    it("returns metadata for all stored tokens", async () => {
      const store = new EncryptedTokenStore({ type: "memory" }, testKey)

      const token1 = {
        ...testToken,
        serverUrl: "https://api1.example.com",
        provider: "Provider1",
      }
      const token2 = {
        ...testToken,
        serverUrl: "https://api2.example.com",
        provider: "Provider2",
      }

      await store.set(token1.serverUrl, token1)
      await store.set(token2.serverUrl, token2)

      const result = await store.list()

      expect(result).toHaveLength(2)
      expect(result).toContainEqual({
        serverUrl: "https://api1.example.com",
        provider: "Provider1",
        expiresAt: token1.expiresAt,
      })
      expect(result).toContainEqual({
        serverUrl: "https://api2.example.com",
        provider: "Provider2",
        expiresAt: token2.expiresAt,
      })
    })

    it("does not expose access tokens", async () => {
      const store = new EncryptedTokenStore({ type: "memory" }, testKey)
      await store.set(testToken.serverUrl, testToken)

      const result = await store.list()

      const tokenInfo = result[0]
      expect(tokenInfo).not.toHaveProperty("access_token")
      expect(tokenInfo).not.toHaveProperty("refresh_token")
    })
  })

  describe("hasValidToken", () => {
    it("returns false when no token exists", async () => {
      const store = new EncryptedTokenStore({ type: "memory" }, testKey)

      const result = await store.hasValidToken("https://nonexistent.com")

      expect(result).toBe(false)
    })

    it("returns true for valid non-expired token", async () => {
      const store = new EncryptedTokenStore({ type: "memory" }, testKey)
      const validToken = {
        ...testToken,
        expiresAt: Date.now() + 3600000, // 1 hour from now
      }
      await store.set(validToken.serverUrl, validToken)

      const result = await store.hasValidToken(validToken.serverUrl)

      expect(result).toBe(true)
    })

    it("returns false for expired token", async () => {
      const store = new EncryptedTokenStore({ type: "memory" }, testKey)
      const expiredToken = {
        ...testToken,
        expiresAt: Date.now() - 1000, // 1 second ago
      }
      await store.set(expiredToken.serverUrl, expiredToken)

      const result = await store.hasValidToken(expiredToken.serverUrl)

      expect(result).toBe(false)
    })

    it("returns true for token without expiry", async () => {
      const store = new EncryptedTokenStore({ type: "memory" }, testKey)
      const noExpiryToken = {
        ...testToken,
        expiresAt: undefined,
      }
      await store.set(noExpiryToken.serverUrl, noExpiryToken)

      const result = await store.hasValidToken(noExpiryToken.serverUrl)

      expect(result).toBe(true)
    })
  })

  describe("clear", () => {
    it("removes all stored tokens", async () => {
      const store = new EncryptedTokenStore({ type: "memory" }, testKey)

      await store.set("https://api1.example.com", {
        ...testToken,
        serverUrl: "https://api1.example.com",
      })
      await store.set("https://api2.example.com", {
        ...testToken,
        serverUrl: "https://api2.example.com",
      })

      await store.clear()

      const list = await store.list()
      expect(list).toHaveLength(0)
    })
  })
})

describe("createTokenStore", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFs.mkdir.mockResolvedValue(undefined)
    mockFs.writeFile.mockResolvedValue(undefined)
    mockFs.rename.mockResolvedValue(undefined)
    mockFs.chmod.mockResolvedValue(undefined)
  })

  it("creates store with memory key source", async () => {
    const store = await createTokenStore({ type: "memory" })

    expect(store).toBeInstanceOf(EncryptedTokenStore)
  })

  it("creates store with password key source", async () => {
    const store = await createTokenStore({
      type: "password",
      password: "test-password",
    })

    expect(store).toBeInstanceOf(EncryptedTokenStore)
  })

  it("creates store with keychain key source when keytar is available", async () => {
    // Mock keytar returning existing key
    mockKeytar.getPassword.mockResolvedValue(
      Buffer.from(new Uint8Array(32).fill(3)).toString("base64")
    )

    const store = await createTokenStore({ type: "keychain" })

    expect(store).toBeInstanceOf(EncryptedTokenStore)
    expect(mockKeytar.getPassword).toHaveBeenCalledWith(
      "athreei",
      "oauth-tokens"
    )
  })

  it("generates new keychain key if none exists", async () => {
    mockKeytar.getPassword.mockResolvedValue(null)
    mockKeytar.setPassword.mockResolvedValue(undefined)

    const store = await createTokenStore({ type: "keychain" })

    expect(store).toBeInstanceOf(EncryptedTokenStore)
    expect(mockKeytar.setPassword).toHaveBeenCalled()
  })

  it("throws when keychain access fails", async () => {
    mockKeytar.getPassword.mockRejectedValue(
      new Error("Keychain access denied")
    )

    await expect(createTokenStore({ type: "keychain" })).rejects.toThrow(
      "Failed to get key from keychain"
    )
  })
})

describe("isKeychainAvailable", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns true when keytar is available and functional", async () => {
    mockKeytar.findCredentials.mockResolvedValue([])

    const result = await isKeychainAvailable()

    expect(result).toBe(true)
  })

  it("returns false when keytar operations fail", async () => {
    mockKeytar.findCredentials.mockRejectedValue(new Error("Access denied"))

    const result = await isKeychainAvailable()

    expect(result).toBe(false)
  })
})
