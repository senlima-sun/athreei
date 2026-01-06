/**
 * Tests for Device Authorization Grant (RFC 8628)
 *
 * Tests the device authorization flow including device code request,
 * token polling, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Hoist mock implementations
const { mockDiscoverOAuthMetadata, mockFetch } = vi.hoisted(() => ({
  mockDiscoverOAuthMetadata: vi.fn(),
  mockFetch: vi.fn(),
}))

// Mock MCP SDK auth functions
vi.mock("@modelcontextprotocol/sdk/client/auth.js", () => ({
  discoverOAuthMetadata: mockDiscoverOAuthMetadata,
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

// Mock global fetch
vi.stubGlobal("fetch", mockFetch)

import {
  supportsDeviceAuth,
  requestDeviceCode,
  DeviceAuthError,
} from "../device-auth.js"

describe("Device Authorization Grant", () => {
  const mockOAuthMetadata = {
    issuer: "https://auth.example.com",
    authorization_endpoint: "https://auth.example.com/authorize",
    token_endpoint: "https://auth.example.com/token",
    device_authorization_endpoint: "https://auth.example.com/device",
    response_types_supported: ["code"],
    grant_types_supported: [
      "authorization_code",
      "refresh_token",
      "urn:ietf:params:oauth:grant-type:device_code",
    ],
  }

  const mockDeviceResponse = {
    device_code: "device_code_123",
    user_code: "ABCD-1234",
    verification_uri: "https://auth.example.com/device",
    verification_uri_complete:
      "https://auth.example.com/device?user_code=ABCD-1234",
    expires_in: 300,
    interval: 5,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockDiscoverOAuthMetadata.mockResolvedValue(mockOAuthMetadata)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("supportsDeviceAuth", () => {
    it("returns true when device_authorization_endpoint is present", async () => {
      const result = await supportsDeviceAuth("https://api.example.com")
      expect(result).toBe(true)
    })

    it("returns false when device_authorization_endpoint is missing", async () => {
      mockDiscoverOAuthMetadata.mockResolvedValue({
        ...mockOAuthMetadata,
        device_authorization_endpoint: undefined,
      })

      const result = await supportsDeviceAuth("https://api.example.com")
      expect(result).toBe(false)
    })

    it("returns false when metadata discovery fails", async () => {
      mockDiscoverOAuthMetadata.mockRejectedValue(new Error("Network error"))

      const result = await supportsDeviceAuth("https://api.example.com")
      expect(result).toBe(false)
    })

    it("returns false when no metadata is returned", async () => {
      mockDiscoverOAuthMetadata.mockResolvedValue(undefined)

      const result = await supportsDeviceAuth("https://api.example.com")
      expect(result).toBe(false)
    })
  })

  describe("requestDeviceCode", () => {
    it("requests device code from authorization endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDeviceResponse),
      })

      const result = await requestDeviceCode(
        "https://api.example.com",
        "test-client-id",
        "read write"
      )

      expect(mockFetch).toHaveBeenCalledWith(
        "https://auth.example.com/device",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        })
      )

      // Verify body contains client_id and scope
      const fetchCall = mockFetch.mock.calls[0]
      expect(fetchCall[1].body).toContain("client_id=test-client-id")
      expect(fetchCall[1].body).toContain("scope=read+write")

      expect(result.device_code).toBe("device_code_123")
      expect(result.user_code).toBe("ABCD-1234")
      expect(result.verification_uri).toBe("https://auth.example.com/device")
      expect(result.verification_uri_complete).toBe(
        "https://auth.example.com/device?user_code=ABCD-1234"
      )
      expect(result.interval).toBe(5)
    })

    it("requests device code without scope when not provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDeviceResponse),
      })

      await requestDeviceCode("https://api.example.com", "test-client-id")

      const fetchCall = mockFetch.mock.calls[0]
      expect(fetchCall[1].body).not.toContain("scope=")
    })

    it("throws when server does not support device authorization", async () => {
      mockDiscoverOAuthMetadata.mockResolvedValue({
        ...mockOAuthMetadata,
        device_authorization_endpoint: undefined,
      })

      await expect(
        requestDeviceCode("https://api.example.com", "test-client-id")
      ).rejects.toThrow(DeviceAuthError)

      await expect(
        requestDeviceCode("https://api.example.com", "test-client-id")
      ).rejects.toThrow("Server does not support device authorization")
    })

    it("throws on HTTP error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({
            error: "invalid_request",
            error_description: "Invalid client_id",
          }),
      })

      await expect(
        requestDeviceCode("https://api.example.com", "test-client-id")
      ).rejects.toThrow("Invalid client_id")
    })

    it("throws generic error when HTTP fails without description", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      })

      await expect(
        requestDeviceCode("https://api.example.com", "test-client-id")
      ).rejects.toThrow("HTTP 500")
    })

    it("throws when response is missing required fields", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            device_code: "device_code_123",
            // Missing user_code and verification_uri
          }),
      })

      await expect(
        requestDeviceCode("https://api.example.com", "test-client-id")
      ).rejects.toThrow("Missing required fields")
    })

    it("uses default values for optional response fields", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            device_code: "device_code_123",
            user_code: "ABCD-1234",
            verification_uri: "https://auth.example.com/device",
            // No expires_in, interval, or verification_uri_complete
          }),
      })

      const result = await requestDeviceCode(
        "https://api.example.com",
        "test-client-id"
      )

      expect(result.expires_in).toBe(300) // Default timeout
      expect(result.interval).toBe(5) // Default interval
      expect(result.verification_uri_complete).toBeUndefined()
    })

    it("preserves verification_uri_complete when provided", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            device_code: "device_code_123",
            user_code: "ABCD-1234",
            verification_uri: "https://auth.example.com/device",
            verification_uri_complete:
              "https://auth.example.com/device?code=ABCD-1234",
          }),
      })

      const result = await requestDeviceCode(
        "https://api.example.com",
        "test-client-id"
      )

      expect(result.verification_uri_complete).toBe(
        "https://auth.example.com/device?code=ABCD-1234"
      )
    })
  })

  describe("DeviceAuthError", () => {
    it("creates error with code and message", () => {
      const error = new DeviceAuthError("access_denied", "User denied access")

      expect(error.code).toBe("access_denied")
      expect(error.message).toBe("User denied access")
      expect(error.name).toBe("DeviceAuthError")
    })

    it("uses code as message when no message provided", () => {
      const error = new DeviceAuthError("timeout")

      expect(error.code).toBe("timeout")
      expect(error.message).toBe("timeout")
    })

    it("is instanceof Error", () => {
      const error = new DeviceAuthError("test")
      expect(error).toBeInstanceOf(Error)
    })

    it("has correct error type codes", () => {
      const pendingError = new DeviceAuthError("authorization_pending")
      expect(pendingError.code).toBe("authorization_pending")

      const slowDownError = new DeviceAuthError("slow_down")
      expect(slowDownError.code).toBe("slow_down")

      const expiredError = new DeviceAuthError("expired_token")
      expect(expiredError.code).toBe("expired_token")

      const deniedError = new DeviceAuthError("access_denied")
      expect(deniedError.code).toBe("access_denied")
    })
  })
})
