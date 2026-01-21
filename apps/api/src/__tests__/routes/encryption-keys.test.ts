/**
 * Tests for the Encryption Keys routes
 *
 * These tests verify the encryption key management operations including:
 * - Creating encryption keys with secure generation
 * - Listing encryption keys with masked values
 * - Rotating encryption keys
 * - Revoking encryption keys
 * - Authorization checks (organization membership verification)
 * - Proper response formats
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono, type Context, type ErrorHandler } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"

const testErrorHandler: ErrorHandler = (err: Error, c: Context) => {
  const statusCode =
    (err as Error & { statusCode?: ContentfulStatusCode }).statusCode || 500
  return c.json({ error: err.message }, statusCode)
}

vi.mock("../../lib/db-operations", () => ({
  db: vi.fn(() => mockDb),
}))

vi.mock("../../middleware", () => ({
  authMiddleware: vi.fn((c, next) => {
    c.set("auth", mockAuthContext)
    return next()
  }),
  getAuthContext: vi.fn((c) => c.get("auth")),
  ApiError: {
    badRequest: (msg: string) => {
      const error = new Error(`BadRequest: ${msg}`)
      ;(error as Error & { statusCode: number }).statusCode = 400
      return error
    },
    notFound: (msg: string) => {
      const error = new Error(`NotFound: ${msg}`)
      ;(error as Error & { statusCode: number }).statusCode = 404
      return error
    },
    forbidden: (msg: string) => {
      const error = new Error(`Forbidden: ${msg}`)
      ;(error as Error & { statusCode: number }).statusCode = 403
      return error
    },
  },
}))

vi.mock("../../services", () => ({
  verifyOrganizationMembership: vi.fn(),
}))

interface EncryptionKeyResponse {
  id: string
  name: string
  keyPrefix: string
  version: number
  status: string
  createdAt: string
  updatedAt: string
  rotatedAt: string | null
  revokedAt: string | null
}

interface CreateKeyResponse {
  encryptionKey: EncryptionKeyResponse
  rawKey: string
}

interface RotateKeyResponse {
  encryptionKey: EncryptionKeyResponse
  rawKey: string
  rotatedFrom: string
}

interface ListKeysResponse {
  encryptionKeys: EncryptionKeyResponse[]
}

interface MessageResponse {
  message: string
}

interface ErrorResponse {
  error: string
}

const mockAuthContext = {
  userId: "user_123",
  email: "test@example.com",
  name: "Test User",
  session: {
    id: "session_123",
    expiresAt: new Date(),
  },
}

const mockMember = {
  id: "member_123",
  userId: "user_123",
  organizationId: "org_123",
  role: "admin",
  createdAt: new Date(),
}

const mockEncryptionKey = {
  id: "ek_abc123def456789",
  organizationId: "org_123",
  createdById: "user_123",
  name: "Production Gateway Key",
  keyHash: "sha256hash123",
  keyPrefix: "ABCDEFGH",
  version: 1,
  status: "active",
  rotatedAt: null,
  revokedAt: null,
  revokedById: null,
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
  updatedAt: new Date("2025-01-01T00:00:00.000Z"),
}

const mockDb = {
  query: {
    encryptionKey: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
    },
  },
  insert: vi.fn(() => ({
    values: vi.fn(() => Promise.resolve()),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  })),
}

describe("Encryption Keys Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe("Organization Membership Verification", () => {
    describe("GET /encryption-keys", () => {
      it("should return 403 when user is NOT a member of the organization", async () => {
        const { verifyOrganizationMembership } = await import(
          "../../services"
        )
        ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(false)

        const { default: encryptionKeys } = await import(
          "../../routes/encryption-keys"
        )
        const app = new Hono()
        app.onError(testErrorHandler)
        app.route("/api/encryption-keys", encryptionKeys)

        const response = await app.request(
          "/api/encryption-keys?organizationId=org_123"
        )
        const data = (await response.json()) as ErrorResponse

        expect(response.status).toBe(403)
        expect(data.error.toLowerCase()).toContain("access")
      })

      it("should allow access when user IS a member of the organization", async () => {
        const { verifyOrganizationMembership } = await import(
          "../../services"
        )
        ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(true)
        mockDb.query.encryptionKey.findMany.mockResolvedValue([mockEncryptionKey])

        const { default: encryptionKeys } = await import(
          "../../routes/encryption-keys"
        )
        const app = new Hono()
        app.onError(testErrorHandler)
        app.route("/api/encryption-keys", encryptionKeys)

        const response = await app.request(
          "/api/encryption-keys?organizationId=org_123"
        )
        const data = (await response.json()) as ListKeysResponse

        expect(response.status).toBe(200)
        expect(data.encryptionKeys).toHaveLength(1)
      })
    })

    describe("POST /encryption-keys", () => {
      it("should return 403 when user is NOT a member", async () => {
        const { verifyOrganizationMembership } = await import(
          "../../services"
        )
        ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(false)

        const { default: encryptionKeys } = await import(
          "../../routes/encryption-keys"
        )
        const app = new Hono()
        app.onError(testErrorHandler)
        app.route("/api/encryption-keys", encryptionKeys)

        const response = await app.request("/api/encryption-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: "org_123",
            name: "Test Key",
          }),
        })
        const data = (await response.json()) as ErrorResponse

        expect(response.status).toBe(403)
        expect(data.error.toLowerCase()).toContain("access")
      })

      it("should allow creating key when user IS a member", async () => {
        const { verifyOrganizationMembership } = await import(
          "../../services"
        )
        ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(true)
        mockDb.query.encryptionKey.findFirst.mockResolvedValue(mockEncryptionKey)

        const { default: encryptionKeys } = await import(
          "../../routes/encryption-keys"
        )
        const app = new Hono()
        app.onError(testErrorHandler)
        app.route("/api/encryption-keys", encryptionKeys)

        const response = await app.request("/api/encryption-keys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: "org_123",
            name: "Production Key",
          }),
        })

        const data = (await response.json()) as CreateKeyResponse

        expect(response.status).toBe(201)
        expect(data.encryptionKey).toBeDefined()
        expect(data.rawKey).toBeDefined()
      })
    })
  })

  describe("GET /encryption-keys", () => {
    it("should return 400 when organizationId is missing", async () => {
      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request("/api/encryption-keys")

      expect(response.status).toBe(400)
    })

    it("should return empty list when no keys exist", async () => {
      const { verifyOrganizationMembership } = await import(
        "../../services"
      )
      ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(true)
      mockDb.query.encryptionKey.findMany.mockResolvedValue([])

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request(
        "/api/encryption-keys?organizationId=org_123"
      )
      const data = (await response.json()) as ListKeysResponse

      expect(response.status).toBe(200)
      expect(data.encryptionKeys).toEqual([])
    })

    it("should return encryption keys with masked values", async () => {
      const { verifyOrganizationMembership } = await import(
        "../../services"
      )
      ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(true)
      mockDb.query.encryptionKey.findMany.mockResolvedValue([mockEncryptionKey])

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request(
        "/api/encryption-keys?organizationId=org_123"
      )
      const data = (await response.json()) as ListKeysResponse

      expect(response.status).toBe(200)
      expect(data.encryptionKeys).toHaveLength(1)
      expect(data.encryptionKeys[0]!.id).toBe(mockEncryptionKey.id)
      expect(data.encryptionKeys[0]!.name).toBe(mockEncryptionKey.name)
      expect(data.encryptionKeys[0]!.keyPrefix).toBe(mockEncryptionKey.keyPrefix)
    })

    it("should filter by status when provided", async () => {
      const { verifyOrganizationMembership } = await import(
        "../../services"
      )
      ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(true)
      mockDb.query.encryptionKey.findMany.mockResolvedValue([mockEncryptionKey])

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request(
        "/api/encryption-keys?organizationId=org_123&status=active"
      )

      expect(response.status).toBe(200)
    })
  })

  describe("POST /encryption-keys", () => {
    it("should validate request body requires name", async () => {
      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request("/api/encryption-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: "org_123" }),
      })

      expect(response.status).toBe(400)
    })

    it("should validate request body requires organizationId", async () => {
      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request("/api/encryption-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Key" }),
      })

      expect(response.status).toBe(400)
    })

    it("should validate name max length", async () => {
      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request("/api/encryption-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: "org_123",
          name: "a".repeat(101),
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should create encryption key and return raw key only once", async () => {
      const { verifyOrganizationMembership } = await import(
        "../../services"
      )
      ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(true)
      mockDb.query.encryptionKey.findFirst.mockResolvedValue(mockEncryptionKey)

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request("/api/encryption-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: "org_123",
          name: "Production Key",
        }),
      })

      const data = (await response.json()) as CreateKeyResponse

      expect(response.status).toBe(201)
      expect(data.encryptionKey).toBeDefined()
      expect(data.rawKey).toBeDefined()
      expect(typeof data.rawKey).toBe("string")
      expect(data.rawKey.length).toBeGreaterThan(0)
    })

    it("should call database insert with correct values", async () => {
      const { verifyOrganizationMembership } = await import(
        "../../services"
      )
      ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(true)
      mockDb.query.encryptionKey.findFirst.mockResolvedValue(mockEncryptionKey)

      const mockInsertValues = vi.fn(() => Promise.resolve())
      mockDb.insert.mockReturnValue({ values: mockInsertValues })

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.route("/api/encryption-keys", encryptionKeys)

      await app.request("/api/encryption-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: "org_123",
          name: "Test Key",
        }),
      })

      expect(mockDb.insert).toHaveBeenCalled()
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org_123",
          createdById: "user_123",
          name: "Test Key",
          version: 1,
          status: "active",
        })
      )
    })
  })

  describe("GET /encryption-keys/:id", () => {
    it("should return 404 when key does not exist", async () => {
      const { verifyOrganizationMembership } = await import(
        "../../services"
      )
      ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(true)
      mockDb.query.encryptionKey.findFirst.mockResolvedValue(null)

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request("/api/encryption-keys/ek_nonexistent")
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(404)
      expect(data.error.toLowerCase()).toContain("not found")
    })

    it("should return key details when found", async () => {
      const { verifyOrganizationMembership } = await import(
        "../../services"
      )
      ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(true)
      mockDb.query.encryptionKey.findFirst.mockResolvedValue(mockEncryptionKey)

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request(
        `/api/encryption-keys/${mockEncryptionKey.id}`
      )

      expect(response.status).toBe(200)
    })
  })

  describe("POST /encryption-keys/:id/rotate", () => {
    it("should return 404 when key does not exist", async () => {
      mockDb.query.encryptionKey.findFirst.mockResolvedValue(null)

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request(
        "/api/encryption-keys/ek_nonexistent/rotate",
        { method: "POST" }
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(404)
      expect(data.error.toLowerCase()).toContain("not found")
    })

    it("should return 400 when trying to rotate non-active key", async () => {
      const revokedKey = { ...mockEncryptionKey, status: "revoked" }
      mockDb.query.encryptionKey.findFirst.mockResolvedValue(revokedKey)

      const { verifyOrganizationMembership } = await import(
        "../../services"
      )
      ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(true)

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request(
        `/api/encryption-keys/${mockEncryptionKey.id}/rotate`,
        { method: "POST" }
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(400)
      expect(data.error.toLowerCase()).toContain("active")
    })

    it("should rotate key successfully and return new key", async () => {
      const { verifyOrganizationMembership } = await import(
        "../../services"
      )
      ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(true)

      mockDb.query.encryptionKey.findFirst
        .mockResolvedValueOnce(mockEncryptionKey)
        .mockResolvedValueOnce({ ...mockEncryptionKey, id: "ek_new123", version: 2 })

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request(
        `/api/encryption-keys/${mockEncryptionKey.id}/rotate`,
        { method: "POST" }
      )

      const data = (await response.json()) as RotateKeyResponse

      expect(response.status).toBe(201)
      expect(data.encryptionKey).toBeDefined()
      expect(data.rawKey).toBeDefined()
      expect(data.rotatedFrom).toBe(mockEncryptionKey.id)
    })

    it("should mark old key as rotated and create new key with incremented version", async () => {
      const { verifyOrganizationMembership } = await import(
        "../../services"
      )
      ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(true)

      mockDb.query.encryptionKey.findFirst
        .mockResolvedValueOnce(mockEncryptionKey)
        .mockResolvedValueOnce({ ...mockEncryptionKey, id: "ek_new123", version: 2 })

      const mockSet = vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) }))
      mockDb.update.mockReturnValue({ set: mockSet })

      const mockInsertValues = vi.fn(() => Promise.resolve())
      mockDb.insert.mockReturnValue({ values: mockInsertValues })

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.route("/api/encryption-keys", encryptionKeys)

      await app.request(
        `/api/encryption-keys/${mockEncryptionKey.id}/rotate`,
        { method: "POST" }
      )

      expect(mockDb.update).toHaveBeenCalled()
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "rotated",
        })
      )

      expect(mockDb.insert).toHaveBeenCalled()
      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 2,
          status: "active",
        })
      )
    })
  })

  describe("DELETE /encryption-keys/:id", () => {
    it("should return 404 when key does not exist", async () => {
      mockDb.query.encryptionKey.findFirst.mockResolvedValue(null)

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request(
        "/api/encryption-keys/ek_nonexistent",
        { method: "DELETE" }
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(404)
      expect(data.error.toLowerCase()).toContain("not found")
    })

    it("should return 400 when trying to revoke already revoked key", async () => {
      const revokedKey = { ...mockEncryptionKey, status: "revoked" }
      mockDb.query.encryptionKey.findFirst.mockResolvedValue(revokedKey)

      const { verifyOrganizationMembership } = await import(
        "../../services"
      )
      ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(true)

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request(
        `/api/encryption-keys/${mockEncryptionKey.id}`,
        { method: "DELETE" }
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(400)
      expect(data.error.toLowerCase()).toContain("already revoked")
    })

    it("should revoke key successfully", async () => {
      const { verifyOrganizationMembership } = await import(
        "../../services"
      )
      ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(true)
      mockDb.query.encryptionKey.findFirst.mockResolvedValue(mockEncryptionKey)

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request(
        `/api/encryption-keys/${mockEncryptionKey.id}`,
        { method: "DELETE" }
      )

      const data = (await response.json()) as MessageResponse

      expect(response.status).toBe(200)
      expect(data.message).toBe("Encryption key revoked successfully")
    })

    it("should call database update with revocation data", async () => {
      const { verifyOrganizationMembership } = await import(
        "../../services"
      )
      ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(true)
      mockDb.query.encryptionKey.findFirst.mockResolvedValue(mockEncryptionKey)

      const mockWhere = vi.fn(() => Promise.resolve())
      const mockSet = vi.fn(() => ({ where: mockWhere }))
      mockDb.update.mockReturnValue({ set: mockSet })

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.route("/api/encryption-keys", encryptionKeys)

      await app.request(`/api/encryption-keys/${mockEncryptionKey.id}`, {
        method: "DELETE",
      })

      expect(mockDb.update).toHaveBeenCalled()
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "revoked",
          revokedById: "user_123",
        })
      )
    })
  })

  describe("PATCH /encryption-keys/:id", () => {
    it("should return 404 when key does not exist", async () => {
      mockDb.query.encryptionKey.findFirst.mockResolvedValue(null)

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request(
        "/api/encryption-keys/ek_nonexistent",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Updated Name" }),
        }
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(404)
      expect(data.error.toLowerCase()).toContain("not found")
    })

    it("should return 400 when trying to update revoked key", async () => {
      const revokedKey = { ...mockEncryptionKey, status: "revoked" }
      mockDb.query.encryptionKey.findFirst.mockResolvedValue(revokedKey)

      const { verifyOrganizationMembership } = await import(
        "../../services"
      )
      ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(true)

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request(
        `/api/encryption-keys/${mockEncryptionKey.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Updated Name" }),
        }
      )
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(400)
      expect(data.error.toLowerCase()).toContain("revoked")
    })

    it("should update key name successfully", async () => {
      const { verifyOrganizationMembership } = await import(
        "../../services"
      )
      ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(true)

      const updatedKey = { ...mockEncryptionKey, name: "Updated Name" }
      mockDb.query.encryptionKey.findFirst
        .mockResolvedValueOnce(mockEncryptionKey)
        .mockResolvedValueOnce(updatedKey)

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request(
        `/api/encryption-keys/${mockEncryptionKey.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Updated Name" }),
        }
      )

      expect(response.status).toBe(200)
    })
  })

  describe("Key Generation", () => {
    it("should generate base64-encoded 256-bit key", async () => {
      const { verifyOrganizationMembership } = await import(
        "../../services"
      )
      ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(true)
      mockDb.query.encryptionKey.findFirst.mockResolvedValue(mockEncryptionKey)

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.route("/api/encryption-keys", encryptionKeys)

      const response = await app.request("/api/encryption-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: "org_123",
          name: "Test Key",
        }),
      })

      const data = (await response.json()) as CreateKeyResponse

      expect(data.rawKey).toBeDefined()
      const decoded = Buffer.from(data.rawKey, "base64")
      expect(decoded.length).toBe(32)
    })

    it("should generate unique keys for each request", async () => {
      const { verifyOrganizationMembership } = await import(
        "../../services"
      )
      ;(verifyOrganizationMembership as ReturnType<typeof vi.fn>).mockResolvedValue(true)
      mockDb.query.encryptionKey.findFirst.mockResolvedValue(mockEncryptionKey)

      const { default: encryptionKeys } = await import(
        "../../routes/encryption-keys"
      )
      const app = new Hono()
      app.route("/api/encryption-keys", encryptionKeys)

      const response1 = await app.request("/api/encryption-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: "org_123",
          name: "Test Key 1",
        }),
      })

      const response2 = await app.request("/api/encryption-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: "org_123",
          name: "Test Key 2",
        }),
      })

      const data1 = (await response1.json()) as CreateKeyResponse
      const data2 = (await response2.json()) as CreateKeyResponse

      expect(data1.rawKey).not.toBe(data2.rawKey)
    })
  })
})
