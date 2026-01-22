import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  resolveEndpoint,
  createEndpointKey,
  parseEndpointKey,
} from "../config/endpoint-resolver"

describe("endpoint-resolver", () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  describe("resolveEndpoint", () => {
    it("should return config on successful resolution", async () => {
      const mockConfig = {
        endpointId: "ep_123",
        endpointName: "test-endpoint",
        namespaceId: "ns_456",
        namespaceName: "Test Namespace",
        namespaceSlug: "test",
        organizationId: "org_789",
        userId: "user_123",
        servers: [],
        configVersion: "1",
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      })

      const result = await resolveEndpoint("test-endpoint", {
        platformUrl: "http://localhost:3000",
        apiKey: "test-key",
      })

      expect(result.success).toBe(true)
      expect(result.config).toEqual(mockConfig)
    })

    it("should return error when API key is missing", async () => {
      const result = await resolveEndpoint("test-endpoint", {
        platformUrl: "http://localhost:3000",
        apiKey: "",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Missing API key")
      expect(result.statusCode).toBe(401)
    })

    it("should return 404 when endpoint not found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      const result = await resolveEndpoint("unknown-endpoint", {
        platformUrl: "http://localhost:3000",
        apiKey: "test-key",
      })

      expect(result.success).toBe(false)
      expect(result.statusCode).toBe(404)
    })

    it("should return 401 on unauthorized access", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      })

      const result = await resolveEndpoint("test-endpoint", {
        platformUrl: "http://localhost:3000",
        apiKey: "invalid-key",
      })

      expect(result.success).toBe(false)
      expect(result.statusCode).toBe(401)
    })

    it("should handle fetch errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"))

      const result = await resolveEndpoint("test-endpoint", {
        platformUrl: "http://localhost:3000",
        apiKey: "test-key",
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Network error")
      expect(result.statusCode).toBe(500)
    })
  })

  describe("createEndpointKey", () => {
    it("should create a valid key", () => {
      const key = createEndpointKey("ep_123", "sess_456")
      expect(key).toBe("ep_123:sess_456")
    })
  })

  describe("parseEndpointKey", () => {
    it("should parse a valid key", () => {
      const result = parseEndpointKey("ep_123:sess_456")
      expect(result).toEqual({ endpointId: "ep_123", sessionId: "sess_456" })
    })

    it("should return null for invalid key", () => {
      expect(parseEndpointKey("invalid")).toBeNull()
      expect(parseEndpointKey("")).toBeNull()
    })
  })
})
