/**
 * Tests for Trace Encryption utilities
 *
 * Tests cover:
 * - Basic encrypt/decrypt round-trip
 * - Key validation
 * - Nonce generation
 * - Error handling
 * - Batch operations
 * - Key derivation
 */

import { describe, it, expect, beforeEach } from "vitest"
import {
  encryptTrace,
  decryptTrace,
  encryptTraceToBytes,
  decryptTraceFromBytes,
  deriveTraceKey,
  generateTraceNonce,
  isValidEncryptedTrace,
  encryptTraceBatch,
  decryptTraceBatch,
  type TracePayload,
  type EncryptedTrace,
} from "../trace-encryption.js"
import { randomBytes } from "@noble/ciphers/webcrypto"

// Generate a valid 32-byte test key
function generateTestKey(): Uint8Array {
  return randomBytes(32)
}

describe("Trace Encryption", () => {
  let testKey: Uint8Array

  beforeEach(() => {
    testKey = generateTestKey()
  })

  describe("encryptTrace", () => {
    it("encrypts a simple trace payload", () => {
      const payload: TracePayload = {
        request: { url: "https://example.com", method: "GET" },
        response: { status: 200, data: "OK" },
      }

      const encrypted = encryptTrace(payload, testKey)

      expect(encrypted).toBeDefined()
      expect(encrypted.nonce).toBeDefined()
      expect(encrypted.ciphertext).toBeDefined()
      expect(encrypted.keyVersion).toBe(1)
      expect(encrypted.algorithm).toBe("xchacha20poly1305")
    })

    it("encrypts a trace with error", () => {
      const payload: TracePayload = {
        request: { url: "https://example.com" },
        error: "Connection timeout",
      }

      const encrypted = encryptTrace(payload, testKey)

      expect(encrypted).toBeDefined()
      expect(encrypted.algorithm).toBe("xchacha20poly1305")
    })

    it("uses custom key version", () => {
      const payload: TracePayload = { request: {} }
      const encrypted = encryptTrace(payload, testKey, 5)

      expect(encrypted.keyVersion).toBe(5)
    })

    it("uses custom nonce when provided", () => {
      const payload: TracePayload = { request: {} }
      const customNonce = randomBytes(24)

      const encrypted = encryptTrace(payload, testKey, 1, customNonce)

      // Decode and compare
      const nonceBytes = Buffer.from(encrypted.nonce, "base64")
      expect(Buffer.from(customNonce).equals(nonceBytes)).toBe(true)
    })

    it("throws error for invalid key length", () => {
      const payload: TracePayload = { request: {} }
      const shortKey = randomBytes(16) // Only 16 bytes

      expect(() => encryptTrace(payload, shortKey)).toThrow(
        "Key must be 32 bytes"
      )
    })

    it("throws error for invalid nonce length", () => {
      const payload: TracePayload = { request: {} }
      const shortNonce = randomBytes(12) // Only 12 bytes

      expect(() => encryptTrace(payload, testKey, 1, shortNonce)).toThrow(
        "Nonce must be 24 bytes"
      )
    })

    it("produces different ciphertext for same payload (random nonce)", () => {
      const payload: TracePayload = { request: { data: "test" } }

      const encrypted1 = encryptTrace(payload, testKey)
      const encrypted2 = encryptTrace(payload, testKey)

      expect(encrypted1.nonce).not.toBe(encrypted2.nonce)
      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext)
    })

    it("handles complex nested objects", () => {
      const payload: TracePayload = {
        request: {
          nested: {
            deeply: {
              value: [1, 2, 3, { key: "value" }],
            },
          },
        },
        response: {
          array: [null, undefined, true, false, 0, ""],
        },
      }

      const encrypted = encryptTrace(payload, testKey)
      const decrypted = decryptTrace(encrypted, testKey)

      expect(decrypted.request).toEqual(payload.request)
      // Note: undefined becomes null in JSON
      expect(decrypted.response).toEqual({
        array: [null, null, true, false, 0, ""],
      })
    })
  })

  describe("decryptTrace", () => {
    it("decrypts an encrypted trace payload", () => {
      const original: TracePayload = {
        request: { url: "https://api.example.com", headers: { auth: "token" } },
        response: { status: 200, body: { success: true } },
      }

      const encrypted = encryptTrace(original, testKey)
      const decrypted = decryptTrace(encrypted, testKey)

      expect(decrypted.request).toEqual(original.request)
      expect(decrypted.response).toEqual(original.response)
      expect(decrypted.error).toBeUndefined()
    })

    it("decrypts a trace with error", () => {
      const original: TracePayload = {
        request: { url: "https://example.com" },
        error: "Server error 500",
      }

      const encrypted = encryptTrace(original, testKey)
      const decrypted = decryptTrace(encrypted, testKey)

      expect(decrypted.error).toBe(original.error)
    })

    it("throws error for wrong key", () => {
      const payload: TracePayload = { request: { secret: "data" } }
      const encrypted = encryptTrace(payload, testKey)

      const wrongKey = generateTestKey()

      expect(() => decryptTrace(encrypted, wrongKey)).toThrow(
        "Decryption failed"
      )
    })

    it("throws error for tampered ciphertext", () => {
      const payload: TracePayload = { request: { secret: "data" } }
      const encrypted = encryptTrace(payload, testKey)

      // Tamper with ciphertext
      const tamperedCiphertext = Buffer.from(encrypted.ciphertext, "base64")
      tamperedCiphertext[10] ^= 0xff
      const tampered: EncryptedTrace = {
        ...encrypted,
        ciphertext: tamperedCiphertext.toString("base64"),
      }

      expect(() => decryptTrace(tampered, testKey)).toThrow("Decryption failed")
    })

    it("throws error for invalid algorithm", () => {
      const encrypted: EncryptedTrace = {
        nonce: "base64nonce",
        ciphertext: "base64ciphertext",
        keyVersion: 1,
        algorithm: "aes-256-gcm" as any,
      }

      expect(() => decryptTrace(encrypted, testKey)).toThrow(
        "Unsupported encryption algorithm"
      )
    })

    it("throws error for invalid key length", () => {
      const payload: TracePayload = { request: {} }
      const encrypted = encryptTrace(payload, testKey)
      const shortKey = randomBytes(16)

      expect(() => decryptTrace(encrypted, shortKey)).toThrow(
        "Key must be 32 bytes"
      )
    })
  })

  describe("encryptTraceToBytes / decryptTraceFromBytes", () => {
    it("round-trips correctly", () => {
      const original: TracePayload = {
        request: { data: "test" },
        response: { result: true },
      }

      const encrypted = encryptTraceToBytes(original, testKey)
      const decrypted = decryptTraceFromBytes(encrypted, testKey)

      expect(decrypted).toEqual(original)
    })

    it("returns nonce prepended to ciphertext", () => {
      const payload: TracePayload = { request: {} }
      const encrypted = encryptTraceToBytes(payload, testKey)

      // Should be at least 24 bytes (nonce) + some ciphertext
      expect(encrypted.length).toBeGreaterThan(24)
    })

    it("throws error for invalid key in encryption", () => {
      const payload: TracePayload = { request: {} }
      const shortKey = randomBytes(16)

      expect(() => encryptTraceToBytes(payload, shortKey)).toThrow(
        "Key must be 32 bytes"
      )
    })

    it("throws error for too short encrypted data", () => {
      const shortData = randomBytes(20) // Less than nonce length

      expect(() => decryptTraceFromBytes(shortData, testKey)).toThrow(
        "Encrypted data too short"
      )
    })

    it("throws error for wrong key", () => {
      const payload: TracePayload = { request: { secret: "data" } }
      const encrypted = encryptTraceToBytes(payload, testKey)
      const wrongKey = generateTestKey()

      expect(() => decryptTraceFromBytes(encrypted, wrongKey)).toThrow(
        "Decryption failed"
      )
    })
  })

  describe("generateTraceNonce", () => {
    it("generates 24-byte nonce", () => {
      const nonce = generateTraceNonce()
      expect(nonce.length).toBe(24)
    })

    it("generates different nonces each time", () => {
      const nonce1 = generateTraceNonce()
      const nonce2 = generateTraceNonce()

      expect(Buffer.from(nonce1).equals(Buffer.from(nonce2))).toBe(false)
    })
  })

  describe("deriveTraceKey", () => {
    it("derives a 32-byte key from password", async () => {
      const derived = await deriveTraceKey("test-password")

      expect(derived.key.length).toBe(32)
      expect(derived.salt.length).toBeGreaterThan(0)
      expect(derived.version).toBe(1)
    })

    it("produces same key with same password and salt", async () => {
      const derived1 = await deriveTraceKey("test-password")
      const derived2 = await deriveTraceKey("test-password", derived1.salt)

      expect(Buffer.from(derived1.key).equals(Buffer.from(derived2.key))).toBe(
        true
      )
    })

    it("produces different key with different password", async () => {
      const derived1 = await deriveTraceKey("password1")
      const derived2 = await deriveTraceKey("password2", derived1.salt)

      expect(Buffer.from(derived1.key).equals(Buffer.from(derived2.key))).toBe(
        false
      )
    })

    it("uses custom key version", async () => {
      const derived = await deriveTraceKey("password", undefined, undefined, 5)

      expect(derived.version).toBe(5)
    })

    it("can encrypt/decrypt with derived key", async () => {
      const derived = await deriveTraceKey("my-secret-password")
      const payload: TracePayload = { request: { sensitive: "data" } }

      const encrypted = encryptTrace(payload, derived.key, derived.version)
      const decrypted = decryptTrace(encrypted, derived.key)

      expect(decrypted.request).toEqual(payload.request)
    })
  })

  describe("isValidEncryptedTrace", () => {
    it("returns true for valid encrypted trace", () => {
      const encrypted = encryptTrace({ request: {} }, testKey)
      expect(isValidEncryptedTrace(encrypted)).toBe(true)
    })

    it("returns false for null", () => {
      expect(isValidEncryptedTrace(null)).toBe(false)
    })

    it("returns false for undefined", () => {
      expect(isValidEncryptedTrace(undefined)).toBe(false)
    })

    it("returns false for non-object", () => {
      expect(isValidEncryptedTrace("string")).toBe(false)
      expect(isValidEncryptedTrace(123)).toBe(false)
    })

    it("returns false for missing nonce", () => {
      const invalid = {
        ciphertext: "abc",
        keyVersion: 1,
        algorithm: "xchacha20poly1305",
      }
      expect(isValidEncryptedTrace(invalid)).toBe(false)
    })

    it("returns false for missing ciphertext", () => {
      const invalid = {
        nonce: "abc",
        keyVersion: 1,
        algorithm: "xchacha20poly1305",
      }
      expect(isValidEncryptedTrace(invalid)).toBe(false)
    })

    it("returns false for missing keyVersion", () => {
      const invalid = {
        nonce: "abc",
        ciphertext: "def",
        algorithm: "xchacha20poly1305",
      }
      expect(isValidEncryptedTrace(invalid)).toBe(false)
    })

    it("returns false for wrong algorithm", () => {
      const invalid = {
        nonce: "abc",
        ciphertext: "def",
        keyVersion: 1,
        algorithm: "aes-256-gcm",
      }
      expect(isValidEncryptedTrace(invalid)).toBe(false)
    })

    it("returns false for non-string nonce", () => {
      const invalid = {
        nonce: 123,
        ciphertext: "def",
        keyVersion: 1,
        algorithm: "xchacha20poly1305",
      }
      expect(isValidEncryptedTrace(invalid)).toBe(false)
    })

    it("returns false for non-number keyVersion", () => {
      const invalid = {
        nonce: "abc",
        ciphertext: "def",
        keyVersion: "1",
        algorithm: "xchacha20poly1305",
      }
      expect(isValidEncryptedTrace(invalid)).toBe(false)
    })
  })

  describe("encryptTraceBatch", () => {
    it("encrypts multiple payloads", () => {
      const payloads: TracePayload[] = [
        { request: { id: 1 }, response: { ok: true } },
        { request: { id: 2 }, error: "Failed" },
        { request: { id: 3 } },
      ]

      const encrypted = encryptTraceBatch(payloads, testKey, 2)

      expect(encrypted).toHaveLength(3)
      encrypted.forEach((e) => {
        expect(e.algorithm).toBe("xchacha20poly1305")
        expect(e.keyVersion).toBe(2)
      })
    })

    it("produces unique ciphertext for each payload", () => {
      const payloads: TracePayload[] = [
        { request: { data: "same" } },
        { request: { data: "same" } },
      ]

      const encrypted = encryptTraceBatch(payloads, testKey)

      expect(encrypted[0].ciphertext).not.toBe(encrypted[1].ciphertext)
    })

    it("handles empty array", () => {
      const encrypted = encryptTraceBatch([], testKey)
      expect(encrypted).toHaveLength(0)
    })
  })

  describe("decryptTraceBatch", () => {
    it("decrypts multiple encrypted traces", () => {
      const payloads: TracePayload[] = [
        { request: { id: 1 }, response: { ok: true } },
        { request: { id: 2 }, error: "Failed" },
      ]

      const encrypted = encryptTraceBatch(payloads, testKey)
      const decrypted = decryptTraceBatch(encrypted, testKey)

      expect(decrypted).toHaveLength(2)
      expect(decrypted[0].request).toEqual(payloads[0].request)
      expect(decrypted[1].error).toBe(payloads[1].error)
    })

    it("handles empty array", () => {
      const decrypted = decryptTraceBatch([], testKey)
      expect(decrypted).toHaveLength(0)
    })

    it("throws on first invalid trace", () => {
      const payloads: TracePayload[] = [{ request: { id: 1 } }]
      const encrypted = encryptTraceBatch(payloads, testKey)

      // Tamper with one
      const tamperedCiphertext = Buffer.from(encrypted[0].ciphertext, "base64")
      tamperedCiphertext[5] ^= 0xff
      encrypted[0].ciphertext = tamperedCiphertext.toString("base64")

      expect(() => decryptTraceBatch(encrypted, testKey)).toThrow(
        "Decryption failed"
      )
    })
  })

  describe("End-to-end encryption scenarios", () => {
    it("encrypts sensitive API request/response data", async () => {
      // Simulate a real trace with sensitive data
      const sensitivePayload: TracePayload = {
        request: {
          url: "https://api.stripe.com/v1/charges",
          headers: {
            Authorization: "Bearer sk_live_secret_key",
            "Content-Type": "application/json",
          },
          body: {
            amount: 5000,
            currency: "usd",
            source: "tok_visa",
          },
        },
        response: {
          id: "ch_1234567890",
          status: "succeeded",
          amount: 5000,
        },
      }

      // Derive key from user password
      const derived = await deriveTraceKey("user-encryption-password")

      // Encrypt the trace
      const encrypted = encryptTrace(
        sensitivePayload,
        derived.key,
        derived.version
      )

      // Verify encrypted data doesn't contain sensitive info
      expect(encrypted.ciphertext).not.toContain("sk_live")
      expect(encrypted.ciphertext).not.toContain("Bearer")

      // Re-derive key and decrypt
      const reDerived = await deriveTraceKey(
        "user-encryption-password",
        derived.salt
      )
      const decrypted = decryptTrace(encrypted, reDerived.key)

      // Verify all sensitive data is recovered
      expect((decrypted.request as any).headers.Authorization).toBe(
        "Bearer sk_live_secret_key"
      )
      expect((decrypted.response as any).id).toBe("ch_1234567890")
    })

    it("handles key rotation scenario", async () => {
      const payload: TracePayload = { request: { data: "sensitive" } }

      // Encrypt with old key (version 1)
      const oldDerived = await deriveTraceKey("password", undefined, undefined, 1)
      const encryptedV1 = encryptTrace(payload, oldDerived.key, oldDerived.version)

      // Encrypt with new key (version 2)
      const newDerived = await deriveTraceKey("new-password", undefined, undefined, 2)
      const encryptedV2 = encryptTrace(payload, newDerived.key, newDerived.version)

      // Both can be decrypted with their respective keys
      expect(decryptTrace(encryptedV1, oldDerived.key)).toEqual(payload)
      expect(decryptTrace(encryptedV2, newDerived.key)).toEqual(payload)

      // Key versions are different
      expect(encryptedV1.keyVersion).toBe(1)
      expect(encryptedV2.keyVersion).toBe(2)
    })
  })
})
