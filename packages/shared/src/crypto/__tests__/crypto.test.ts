/**
 * Comprehensive tests for athreei crypto module
 */

import { describe, it, expect } from "vitest"
import {
  deriveKey,
  reDeriveKey,
  generateSalt,
  verifyKeys,
  encrypt,
  decrypt,
  encryptPermission,
  decryptPermission,
  encryptAuditLog,
  decryptAuditLog,
  encryptSession,
  decryptSession,
  rotateKey,
  rotateKeyBatch,
  filterByKeyVersion,
  verifyKeyVersion,
  getKeyVersionStats,
  planKeyRotation,
  DEFAULT_CRYPTO_CONFIG,
  type EncryptedData,
  type Permission,
  type AuditLogEntry,
  type Session,
} from "../index.js"

describe("Argon2 Key Derivation", () => {
  it("should derive a key from password", async () => {
    const password = "test-password-123"
    const derived = await deriveKey(password)

    expect(derived.key).toBeInstanceOf(Uint8Array)
    expect(derived.key.length).toBe(32) // 256 bits
    expect(derived.salt).toBeInstanceOf(Uint8Array)
    expect(derived.salt.length).toBe(DEFAULT_CRYPTO_CONFIG.saltLength)
    expect(derived.version).toBe(1)
  })

  it("should produce consistent keys with same password and salt", async () => {
    const password = "consistent-password"
    const salt = generateSalt()

    const derived1 = await deriveKey(password, salt)
    const derived2 = await deriveKey(password, salt)

    expect(verifyKeys(derived1.key, derived2.key)).toBe(true)
  })

  it("should produce different keys with different salts", async () => {
    const password = "same-password"

    const derived1 = await deriveKey(password)
    const derived2 = await deriveKey(password)

    expect(verifyKeys(derived1.key, derived2.key)).toBe(false)
  })

  it("should produce different keys with different passwords", async () => {
    const salt = generateSalt()

    const derived1 = await deriveKey("password1", salt)
    const derived2 = await deriveKey("password2", salt)

    expect(verifyKeys(derived1.key, derived2.key)).toBe(false)
  })

  it("should re-derive key correctly", async () => {
    const password = "test-password"
    const derived = await deriveKey(password)

    const reDerived = await reDeriveKey(password, derived.salt)

    expect(verifyKeys(derived.key, reDerived.key)).toBe(true)
  })

  it("should generate random salts", () => {
    const salt1 = generateSalt()
    const salt2 = generateSalt()

    expect(salt1).toBeInstanceOf(Uint8Array)
    expect(salt2).toBeInstanceOf(Uint8Array)
    expect(salt1.length).toBe(DEFAULT_CRYPTO_CONFIG.saltLength)

    // Salts should be different
    expect(verifyKeys(salt1, salt2)).toBe(false)
  })

  it("should support custom key versions", async () => {
    const password = "versioned-password"
    const derived = await deriveKey(password, undefined, DEFAULT_CRYPTO_CONFIG, 42)

    expect(derived.version).toBe(42)
  })
})

describe("AES-256-GCM Encryption", () => {
  it("should encrypt and decrypt data correctly", async () => {
    const password = "encryption-password"
    const derived = await deriveKey(password)

    const data = { message: "secret data", value: 12345 }
    const encrypted = encrypt(data, derived.key, derived.version)

    expect(encrypted.ciphertext).toBeTruthy()
    expect(encrypted.nonce).toBeTruthy()
    expect(encrypted.keyVersion).toBe(derived.version)

    const decrypted = decrypt(encrypted, derived.key)
    expect(decrypted).toEqual(data)
  })

  it("should handle complex data structures", async () => {
    const password = "complex-data-password"
    const derived = await deriveKey(password)

    const complexData = {
      string: "test",
      number: 42,
      boolean: true,
      null: null,
      array: [1, 2, 3],
      nested: {
        deep: {
          value: "nested",
        },
      },
    }

    const encrypted = encrypt(complexData, derived.key, derived.version)
    const decrypted = decrypt(encrypted, derived.key)

    expect(decrypted).toEqual(complexData)
  })

  it("should fail decryption with wrong key", async () => {
    const data = { secret: "value" }

    const key1 = await deriveKey("password1")
    const key2 = await deriveKey("password2")

    const encrypted = encrypt(data, key1.key, key1.version)

    expect(() => decrypt(encrypted, key2.key)).toThrow()
  })

  it("should fail decryption with corrupted ciphertext", async () => {
    const password = "tamper-test"
    const derived = await deriveKey(password)

    const data = { value: "original" }
    const encrypted = encrypt(data, derived.key, derived.version)

    // Tamper with ciphertext
    const tampered: EncryptedData = {
      ...encrypted,
      ciphertext: encrypted.ciphertext.slice(0, -4) + "XXXX",
    }

    expect(() => decrypt(tampered, derived.key)).toThrow()
  })

  it("should validate key size", async () => {
    const invalidKey = new Uint8Array(16) // Only 128 bits
    const data = { test: "data" }

    expect(() => encrypt(data, invalidKey, 1)).toThrow("Key must be 32 bytes")
  })

  it("should encrypt permissions", async () => {
    const password = "permission-password"
    const derived = await deriveKey(password)

    const permission: Permission = {
      id: "perm-1",
      origin: "https://example.com",
      tool: "click",
      allowed: "allowed",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const encrypted = encryptPermission(permission, derived.key, derived.version)
    const decrypted = decryptPermission<Permission>(encrypted, derived.key)

    expect(decrypted).toEqual(permission)
  })

  it("should encrypt audit logs", async () => {
    const password = "audit-password"
    const derived = await deriveKey(password)

    const auditLog: AuditLogEntry = {
      id: "audit-1",
      timestamp: Date.now(),
      aiApp: "test-app",
      tool: "type",
      origin: "https://example.com",
      args: { selector: "#input", text: "test" },
      status: "success",
    }

    const encrypted = encryptAuditLog(auditLog, derived.key, derived.version)
    const decrypted = decryptAuditLog<AuditLogEntry>(encrypted, derived.key)

    expect(decrypted).toEqual(auditLog)
  })

  it("should encrypt sessions", async () => {
    const password = "session-password"
    const derived = await deriveKey(password)

    const session: Session = {
      id: "session-1",
      tabId: 123,
      origin: "https://example.com",
      startedAt: Date.now(),
      metadata: { userAgent: "test" },
    }

    const encrypted = encryptSession(session, derived.key, derived.version)
    const decrypted = decryptSession<Session>(encrypted, derived.key)

    expect(decrypted).toEqual(session)
  })
})

describe("Key Rotation", () => {
  it("should rotate a single encrypted item", async () => {
    const data = { sensitive: "information" }

    const oldKey = await deriveKey("old-password", undefined, DEFAULT_CRYPTO_CONFIG, 1)
    const newKey = await deriveKey("new-password", undefined, DEFAULT_CRYPTO_CONFIG, 2)

    // Encrypt with old key
    const encrypted = encrypt(data, oldKey.key, oldKey.version)
    expect(encrypted.keyVersion).toBe(1)

    // Rotate to new key
    const rotated = rotateKey(encrypted, oldKey.key, newKey.key, newKey.version)
    expect(rotated.keyVersion).toBe(2)

    // Verify we can decrypt with new key
    const decrypted = decrypt(rotated, newKey.key)
    expect(decrypted).toEqual(data)

    // Verify we cannot decrypt with old key
    expect(() => decrypt(rotated, oldKey.key)).toThrow()
  })

  it("should rotate multiple items in batch", async () => {
    const items = [
      { id: 1, data: "item1" },
      { id: 2, data: "item2" },
      { id: 3, data: "item3" },
    ]

    const oldKey = await deriveKey("old-password", undefined, DEFAULT_CRYPTO_CONFIG, 1)
    const newKey = await deriveKey("new-password", undefined, DEFAULT_CRYPTO_CONFIG, 2)

    // Encrypt all items with old key
    const encrypted = items.map((item) => encrypt(item, oldKey.key, oldKey.version))

    // Rotate all items
    const rotated = await rotateKeyBatch(encrypted, oldKey.key, newKey.key, {
      oldVersion: 1,
      newVersion: 2,
    })

    expect(rotated.length).toBe(items.length)

    // Verify all items rotated correctly
    rotated.forEach((item, index) => {
      expect(item.keyVersion).toBe(2)
      const decrypted = decrypt(item, newKey.key)
      expect(decrypted).toEqual(items[index])
    })
  })

  it("should filter items by key version", async () => {
    const key = await deriveKey("test-password")

    const v1Items = [
      encrypt({ id: 1 }, key.key, 1),
      encrypt({ id: 2 }, key.key, 1),
    ]

    const v2Items = [
      encrypt({ id: 3 }, key.key, 2),
      encrypt({ id: 4 }, key.key, 2),
    ]

    const allItems = [...v1Items, ...v2Items]

    const filteredV1 = filterByKeyVersion(allItems, 1)
    const filteredV2 = filterByKeyVersion(allItems, 2)

    expect(filteredV1.length).toBe(2)
    expect(filteredV2.length).toBe(2)
    expect(filteredV1.every((item) => item.keyVersion === 1)).toBe(true)
    expect(filteredV2.every((item) => item.keyVersion === 2)).toBe(true)
  })

  it("should verify key versions", async () => {
    const key = await deriveKey("test-password")

    const allV1 = [
      encrypt({ id: 1 }, key.key, 1),
      encrypt({ id: 2 }, key.key, 1),
    ]

    const mixed = [
      encrypt({ id: 1 }, key.key, 1),
      encrypt({ id: 2 }, key.key, 2),
    ]

    expect(verifyKeyVersion(allV1, 1)).toBe(true)
    expect(verifyKeyVersion(allV1, 2)).toBe(false)
    expect(verifyKeyVersion(mixed, 1)).toBe(false)
    expect(verifyKeyVersion(mixed, 2)).toBe(false)
  })

  it("should get key version statistics", async () => {
    const key = await deriveKey("test-password")

    const items = [
      encrypt({ id: 1 }, key.key, 1),
      encrypt({ id: 2 }, key.key, 1),
      encrypt({ id: 3 }, key.key, 1),
      encrypt({ id: 4 }, key.key, 2),
      encrypt({ id: 5 }, key.key, 2),
      encrypt({ id: 6 }, key.key, 3),
    ]

    const stats = getKeyVersionStats(items)

    expect(stats.get(1)).toBe(3)
    expect(stats.get(2)).toBe(2)
    expect(stats.get(3)).toBe(1)
    expect(stats.get(4)).toBeUndefined()
  })

  it("should plan key rotation", async () => {
    const key = await deriveKey("test-password")

    const items = [
      encrypt({ id: 1 }, key.key, 1),
      encrypt({ id: 2 }, key.key, 1),
      encrypt({ id: 3 }, key.key, 2),
      encrypt({ id: 4 }, key.key, 2),
      encrypt({ id: 5 }, key.key, 2),
    ]

    const plan = planKeyRotation(items, 2)

    expect(plan.totalItems).toBe(5)
    expect(plan.itemsToRotate).toBe(2) // 2 items at v1
    expect(plan.itemsAlreadyRotated).toBe(3) // 3 items at v2
    expect(plan.versionStats.get(1)).toBe(2)
    expect(plan.versionStats.get(2)).toBe(3)
    expect(plan.itemsNeedingRotation.length).toBe(2)
  })

  it("should handle version mismatch in batch rotation", async () => {
    const key = await deriveKey("test-password")

    const items = [
      encrypt({ id: 1 }, key.key, 1),
      encrypt({ id: 2 }, key.key, 2), // Wrong version
    ]

    const newKey = await deriveKey("new-password", undefined, DEFAULT_CRYPTO_CONFIG, 3)

    await expect(
      rotateKeyBatch(items, key.key, newKey.key, {
        oldVersion: 1,
        newVersion: 3,
      })
    ).rejects.toThrow("Key version mismatch")
  })
})

describe("Integration Tests", () => {
  it("should complete full encryption lifecycle", async () => {
    const password = "user-password"

    // 1. Derive initial key
    const derived = await deriveKey(password)

    // 2. Encrypt multiple data types
    const permission: Permission = {
      id: "perm-1",
      origin: "https://example.com",
      tool: "click",
      allowed: "allowed",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    const auditLog: AuditLogEntry = {
      id: "audit-1",
      timestamp: Date.now(),
      tool: "type",
      status: "success",
    }

    const encryptedPerm = encryptPermission(permission, derived.key, derived.version)
    const encryptedAudit = encryptAuditLog(auditLog, derived.key, derived.version)

    // 3. Simulate storage (convert to JSON and back)
    const storedPerm = JSON.parse(JSON.stringify(encryptedPerm))
    const storedAudit = JSON.parse(JSON.stringify(encryptedAudit))

    // 4. Re-derive key (simulating new session)
    const reDerived = await reDeriveKey(password, derived.salt)

    // 5. Decrypt
    const decryptedPerm = decryptPermission<Permission>(storedPerm, reDerived.key)
    const decryptedAudit = decryptAuditLog<AuditLogEntry>(storedAudit, reDerived.key)

    expect(decryptedPerm).toEqual(permission)
    expect(decryptedAudit).toEqual(auditLog)
  })

  it("should handle complete key rotation workflow", async () => {
    // Initial setup with v1 key
    const oldPassword = "old-password"
    const oldKey = await deriveKey(oldPassword, undefined, DEFAULT_CRYPTO_CONFIG, 1)

    // Create and encrypt data
    const permissions: Permission[] = [
      {
        id: "p1",
        origin: "https://example.com",
        tool: "click",
        allowed: "allowed",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "p2",
        origin: "https://test.com",
        tool: "type",
        allowed: "ask",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ]

    const encrypted = permissions.map((p) =>
      encryptPermission(p, oldKey.key, oldKey.version)
    )

    // Plan rotation
    const plan = planKeyRotation(encrypted, 2)
    expect(plan.itemsToRotate).toBe(2)

    // Generate new key
    const newPassword = "new-password"
    const newKey = await deriveKey(newPassword, undefined, DEFAULT_CRYPTO_CONFIG, 2)

    // Rotate all data
    const rotated = await rotateKeyBatch(encrypted, oldKey.key, newKey.key, {
      oldVersion: 1,
      newVersion: 2,
    })

    // Verify rotation
    expect(verifyKeyVersion(rotated, 2)).toBe(true)

    // Decrypt with new key
    const decrypted = rotated.map((r) => decryptPermission<Permission>(r, newKey.key))

    expect(decrypted).toEqual(permissions)
  })
})
