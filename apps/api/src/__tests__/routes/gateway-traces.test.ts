/**
 * Unit tests for the Gateway traces POST endpoint
 *
 * These tests verify the /api/gateway/traces endpoint which:
 * - Receives traces from the gateway for monitoring/analytics
 * - Validates API key authentication
 * - Stores traces in the database
 * - Returns proper response shape with trace IDs
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono } from "hono"

// Mock crypto for deterministic testing - must be done before any imports
let uuidCounter = 0
const mockRandomUUID = vi.fn(() => {
  uuidCounter++
  return `00000000-0000-0000-0000-00000000000${uuidCounter}`
})

const mockCrypto = {
  randomUUID: mockRandomUUID,
  subtle: {
    digest: vi.fn(async () => {
      // Return a mock hash buffer for API key hashing
      return new Uint8Array(32).fill(0xab).buffer
    }),
  },
}

// Override global crypto for testing
vi.stubGlobal("crypto", mockCrypto)

// Mock modules before importing the routes
vi.mock("../../lib/db-operations", () => ({
  db: vi.fn(() => mockDb),
}))

interface TracesResponse {
  received: number
  stored: number
  message: string
  traceIds: string[]
}

interface ErrorResponse {
  error: string
}

const mockApiKeyRecord = {
  id: "key_123",
  organizationId: "org_123",
  endpointId: "ep_123",
  createdById: "user_123",
  name: "Test API Key",
  keyHash: "abababababababababababababababababababababababababababababababab",
  keyPrefix: "ak_test1234",
  scopes: null,
  expiresAt: null,
  lastUsedAt: null,
  usageCount: 0,
  revokedAt: null,
  revokedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockEndpointRecord = {
  id: "ep_123",
  organizationId: "org_123",
  name: "Test Endpoint",
  description: "Test API endpoint",
  url: "https://athreei.com/mcp/test-endpoint/sse",
  method: "POST",
  authType: "api_key",
  rateLimit: null,
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockExpiredApiKeyRecord = {
  ...mockApiKeyRecord,
  id: "key_expired",
  expiresAt: new Date("2020-01-01"), // Expired in the past
}

// Note: mockRevokedApiKeyRecord is not needed because the query uses
// isNull(apiKey.revokedAt) in the where clause, so revoked keys are
// filtered out at the query level and return null from findFirst

const mockApiKeyWithoutEndpoint = {
  ...mockApiKeyRecord,
  id: "key_no_endpoint",
  endpointId: null,
}

const mockInsertValues = vi.fn()
const mockUpdateSetWhere = vi.fn()

const mockDb = {
  query: {
    apiKey: {
      findFirst: vi.fn(),
    },
    endpoint: {
      findFirst: vi.fn(),
    },
  },
  insert: vi.fn(() => ({
    values: mockInsertValues,
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: mockUpdateSetWhere,
    })),
  })),
}

describe("Gateway Traces POST Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    uuidCounter = 0
    mockInsertValues.mockResolvedValue(undefined)
    mockUpdateSetWhere.mockResolvedValue(undefined)
  })

  describe("Authentication", () => {
    it("returns 401 without Authorization header", async () => {
      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const response = await app.request("/api/gateway/traces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          traces: [],
        }),
      })

      expect(response.status).toBe(401)
      const data = (await response.json()) as ErrorResponse
      expect(data.error).toBe("Authorization header required")
    })

    it("returns 401 with malformed Authorization header", async () => {
      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const response = await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "NotBearer ak_testkey",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          traces: [],
        }),
      })

      expect(response.status).toBe(401)
      const data = (await response.json()) as ErrorResponse
      expect(data.error).toBe("Authorization header required")
    })

    it("returns 401 with invalid API key (not found)", async () => {
      mockDb.query.apiKey.findFirst.mockResolvedValue(null)

      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const response = await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_invalidkey",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          traces: [],
        }),
      })

      expect(response.status).toBe(401)
      const data = (await response.json()) as ErrorResponse
      expect(data.error).toBe("Invalid or revoked API key")
    })

    it("returns 401 with expired API key", async () => {
      mockDb.query.apiKey.findFirst.mockResolvedValue(mockExpiredApiKeyRecord)

      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const response = await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_expiredkey",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          traces: [],
        }),
      })

      expect(response.status).toBe(401)
      const data = (await response.json()) as ErrorResponse
      expect(data.error).toBe("API key has expired")
    })

    it("returns 401 when API key is not associated with an endpoint", async () => {
      mockDb.query.apiKey.findFirst.mockResolvedValue(mockApiKeyWithoutEndpoint)

      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const response = await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_noendpoint",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          traces: [],
        }),
      })

      expect(response.status).toBe(401)
      const data = (await response.json()) as ErrorResponse
      expect(data.error).toBe("API key is not associated with an endpoint")
    })

    it("returns 401 when associated endpoint is not found", async () => {
      mockDb.query.apiKey.findFirst.mockResolvedValue(mockApiKeyRecord)
      mockDb.query.endpoint.findFirst.mockResolvedValue(null)

      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const response = await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_validkey",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          traces: [],
        }),
      })

      expect(response.status).toBe(401)
      const data = (await response.json()) as ErrorResponse
      expect(data.error).toBe("Associated endpoint not found")
    })
  })

  describe("Successful trace storage", () => {
    beforeEach(() => {
      mockDb.query.apiKey.findFirst.mockResolvedValue(mockApiKeyRecord)
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpointRecord)
    })

    it("successfully stores traces and returns count", async () => {
      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const traces = [
        {
          traceId: "trace-001",
          aggregatedToolName: "browser__screenshot",
          serverName: "browser",
          toolName: "screenshot",
          arguments: { url: "https://example.com" },
          result: { data: "base64..." },
          startedAt: "2025-01-01T10:00:00.000Z",
          endedAt: "2025-01-01T10:00:01.000Z",
          durationMs: 1000,
        },
        {
          traceId: "trace-002",
          aggregatedToolName: "browser__click",
          serverName: "browser",
          toolName: "click",
          arguments: { selector: "#button" },
          startedAt: "2025-01-01T10:00:02.000Z",
        },
      ]

      const response = await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_validkey",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ traces }),
      })

      expect(response.status).toBe(200)
      const data = (await response.json()) as TracesResponse
      expect(data.received).toBe(2)
      expect(data.stored).toBe(2)
      expect(data.message).toBe("Traces processed successfully")
      expect(data.traceIds).toHaveLength(2)
      expect(data.traceIds[0]).toMatch(/^tr_/)
      expect(data.traceIds[1]).toMatch(/^tr_/)
    })

    it("returns correct response shape with empty traces array", async () => {
      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const response = await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_validkey",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ traces: [] }),
      })

      expect(response.status).toBe(200)
      const data = (await response.json()) as TracesResponse
      expect(data).toEqual({
        received: 0,
        stored: 0,
        message: "Traces processed successfully",
        traceIds: [],
      })
    })

    it("updates API key last used timestamp and usage count", async () => {
      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_validkey",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ traces: [] }),
      })

      expect(mockDb.update).toHaveBeenCalled()
    })
  })

  describe("Trace field mapping", () => {
    beforeEach(() => {
      mockDb.query.apiKey.findFirst.mockResolvedValue(mockApiKeyRecord)
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpointRecord)
    })

    it("correctly maps status from error field (success)", async () => {
      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const traces = [
        {
          traceId: "trace-success",
          aggregatedToolName: "browser__screenshot",
          serverName: "browser",
          toolName: "screenshot",
          startedAt: "2025-01-01T10:00:00.000Z",
          // No error field = success
        },
      ]

      await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_validkey",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ traces }),
      })

      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "success",
          statusMessage: undefined,
        })
      )
    })

    it("correctly maps status from error field (error)", async () => {
      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const traces = [
        {
          traceId: "trace-error",
          aggregatedToolName: "browser__screenshot",
          serverName: "browser",
          toolName: "screenshot",
          startedAt: "2025-01-01T10:00:00.000Z",
          error: "Screenshot failed: timeout",
        },
      ]

      await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_validkey",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ traces }),
      })

      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "error",
          statusMessage: "Screenshot failed: timeout",
        })
      )
    })

    it("correctly serializes attributes JSON", async () => {
      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const traces = [
        {
          traceId: "trace-attrs",
          aggregatedToolName: "browser__screenshot",
          serverName: "browser",
          toolName: "screenshot",
          arguments: { url: "https://example.com", quality: 80 },
          result: { width: 1920, height: 1080 },
          startedAt: "2025-01-01T10:00:00.000Z",
        },
      ]

      await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_validkey",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ traces }),
      })

      const insertCall = mockInsertValues.mock.calls[0][0]
      const attributes = JSON.parse(insertCall.attributes)

      expect(attributes.aggregatedToolName).toBe("browser__screenshot")
      expect(attributes.serverName).toBe("browser")
      expect(attributes.toolName).toBe("screenshot")
      expect(attributes.arguments).toEqual({
        url: "https://example.com",
        quality: 80,
      })
      expect(attributes.result).toEqual({ width: 1920, height: 1080 })
      expect(attributes.endpointId).toBe(mockEndpointRecord.id)
      expect(attributes.apiKeyId).toBe(mockApiKeyRecord.id)
    })

    it("sets correct trace name from aggregatedToolName or toolName", async () => {
      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      // With aggregatedToolName
      await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_validkey",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          traces: [
            {
              traceId: "trace-1",
              aggregatedToolName: "browser__screenshot",
              serverName: "browser",
              toolName: "screenshot",
              startedAt: "2025-01-01T10:00:00.000Z",
            },
          ],
        }),
      })

      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "browser__screenshot",
        })
      )
    })

    it("sets correct timing fields", async () => {
      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const traces = [
        {
          traceId: "trace-timing",
          aggregatedToolName: "browser__screenshot",
          serverName: "browser",
          toolName: "screenshot",
          startedAt: "2025-01-01T10:00:00.000Z",
          endedAt: "2025-01-01T10:00:01.500Z",
          durationMs: 1500,
        },
      ]

      await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_validkey",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ traces }),
      })

      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          startTime: new Date("2025-01-01T10:00:00.000Z"),
          endTime: new Date("2025-01-01T10:00:01.500Z"),
          durationMs: 1500,
        })
      )
    })

    it("handles null optional fields", async () => {
      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const traces = [
        {
          traceId: "trace-minimal",
          aggregatedToolName: "browser__screenshot",
          serverName: "browser",
          toolName: "screenshot",
          startedAt: "2025-01-01T10:00:00.000Z",
          // No endedAt, durationMs, arguments, result, error
        },
      ]

      await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_validkey",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ traces }),
      })

      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          endTime: null,
          durationMs: null,
          status: "success",
          statusMessage: undefined,
        })
      )
    })
  })

  describe("Database insert error handling", () => {
    beforeEach(() => {
      mockDb.query.apiKey.findFirst.mockResolvedValue(mockApiKeyRecord)
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpointRecord)
    })

    it("handles database insert errors gracefully (continues with other traces)", async () => {
      // First insert fails, second succeeds
      mockInsertValues
        .mockRejectedValueOnce(new Error("Database connection error"))
        .mockResolvedValueOnce(undefined)

      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const traces = [
        {
          traceId: "trace-fail",
          aggregatedToolName: "browser__screenshot",
          serverName: "browser",
          toolName: "screenshot",
          startedAt: "2025-01-01T10:00:00.000Z",
        },
        {
          traceId: "trace-success",
          aggregatedToolName: "browser__click",
          serverName: "browser",
          toolName: "click",
          startedAt: "2025-01-01T10:00:01.000Z",
        },
      ]

      const response = await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_validkey",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ traces }),
      })

      expect(response.status).toBe(200)
      const data = (await response.json()) as TracesResponse
      expect(data.received).toBe(2)
      expect(data.stored).toBe(1) // Only one succeeded
      expect(data.traceIds).toHaveLength(1)
    })

    it("handles all inserts failing", async () => {
      mockInsertValues.mockRejectedValue(new Error("Database unavailable"))

      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const traces = [
        {
          traceId: "trace-1",
          aggregatedToolName: "browser__screenshot",
          serverName: "browser",
          toolName: "screenshot",
          startedAt: "2025-01-01T10:00:00.000Z",
        },
        {
          traceId: "trace-2",
          aggregatedToolName: "browser__click",
          serverName: "browser",
          toolName: "click",
          startedAt: "2025-01-01T10:00:01.000Z",
        },
      ]

      const response = await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_validkey",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ traces }),
      })

      expect(response.status).toBe(200)
      const data = (await response.json()) as TracesResponse
      expect(data.received).toBe(2)
      expect(data.stored).toBe(0)
      expect(data.traceIds).toHaveLength(0)
      expect(data.message).toBe("Traces processed successfully")
    })
  })

  describe("Request validation", () => {
    beforeEach(() => {
      mockDb.query.apiKey.findFirst.mockResolvedValue(mockApiKeyRecord)
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpointRecord)
    })

    it("returns 400 for invalid request body (missing traces)", async () => {
      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const response = await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_validkey",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
    })

    it("returns 400 for invalid trace format (missing required fields)", async () => {
      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const response = await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_validkey",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          traces: [
            {
              // Missing traceId, aggregatedToolName, serverName, toolName, startedAt
            },
          ],
        }),
      })

      expect(response.status).toBe(400)
    })

    it("returns 400 for invalid datetime format", async () => {
      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const response = await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_validkey",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          traces: [
            {
              traceId: "trace-1",
              aggregatedToolName: "browser__screenshot",
              serverName: "browser",
              toolName: "screenshot",
              startedAt: "not-a-valid-date",
            },
          ],
        }),
      })

      expect(response.status).toBe(400)
    })
  })

  describe("API key stripping prefix", () => {
    beforeEach(() => {
      mockDb.query.apiKey.findFirst.mockResolvedValue(mockApiKeyRecord)
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpointRecord)
    })

    it("accepts API key with ak_ prefix", async () => {
      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const response = await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_testkey123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ traces: [] }),
      })

      expect(response.status).toBe(200)
    })

    it("accepts API key without ak_ prefix", async () => {
      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      const response = await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer testkey123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ traces: [] }),
      })

      expect(response.status).toBe(200)
    })
  })

  describe("Security limits", () => {
    beforeEach(() => {
      mockDb.query.apiKey.findFirst.mockResolvedValue(mockApiKeyRecord)
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpointRecord)
    })

    it("skips traces with oversized attributes (DoS protection)", async () => {
      const { default: gateway } = await import("../../routes/gateway")
      const app = new Hono()
      app.route("/api/gateway", gateway)

      // Create a trace with arguments exceeding 1MB
      const largePayload = "x".repeat(1_100_000)
      const traces = [
        {
          traceId: "trace-oversized",
          aggregatedToolName: "browser__screenshot",
          serverName: "browser",
          toolName: "screenshot",
          arguments: { data: largePayload },
          startedAt: "2025-01-01T10:00:00.000Z",
        },
        {
          traceId: "trace-normal",
          aggregatedToolName: "browser__click",
          serverName: "browser",
          toolName: "click",
          startedAt: "2025-01-01T10:00:01.000Z",
        },
      ]

      const response = await app.request("/api/gateway/traces", {
        method: "POST",
        headers: {
          Authorization: "Bearer ak_validkey",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ traces }),
      })

      expect(response.status).toBe(200)
      const data = (await response.json()) as TracesResponse
      // Oversized trace is skipped, normal trace is stored
      expect(data.received).toBe(2)
      expect(data.stored).toBe(1)
      expect(data.traceIds).toHaveLength(1)
    })
  })
})
