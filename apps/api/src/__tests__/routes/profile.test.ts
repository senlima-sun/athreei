/**
 * Tests for the Profile routes
 *
 * These tests verify the profile management operations including:
 * - Updating user profile (name, avatarUrl)
 * - Changing password with current password verification
 * - Input validation for profile updates
 * - Error handling for various scenarios
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono, type Context, type ErrorHandler } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"

// Error handler to properly handle thrown errors
const testErrorHandler: ErrorHandler = (err: Error, c: Context) => {
  const statusCode =
    (err as Error & { statusCode?: ContentfulStatusCode }).statusCode || 500
  return c.json(
    { error: err.message, code: (err as Error & { code?: string }).code },
    statusCode
  )
}

// Mock modules before importing the routes
vi.mock("../../lib/db", () => ({
  getDb: vi.fn(() => mockDb),
}))

vi.mock("../../lib/auth", () => ({
  getAuth: vi.fn(() => mockAuth),
}))

vi.mock("@athreei/db", () => ({
  detectDatabaseType: vi.fn(() => "sqlite"),
  getSchema: vi.fn(() => mockSchema),
}))

vi.mock("../../middleware", () => ({
  authMiddleware: vi.fn((c, next) => {
    c.set("auth", mockAuthContext)
    return next()
  }),
  getAuthContext: vi.fn((c) => c.get("auth")),
  ApiError: {
    badRequest: (msg: string, code?: string) => {
      const error = new Error(msg)
      ;(error as Error & { statusCode: number; code?: string }).statusCode = 400
      ;(error as Error & { statusCode: number; code?: string }).code = code
      return error
    },
    notFound: (msg: string, code?: string) => {
      const error = new Error(msg)
      ;(error as Error & { statusCode: number; code?: string }).statusCode = 404
      ;(error as Error & { statusCode: number; code?: string }).code = code
      return error
    },
    forbidden: (msg: string, code?: string) => {
      const error = new Error(msg)
      ;(error as Error & { statusCode: number; code?: string }).statusCode = 403
      ;(error as Error & { statusCode: number; code?: string }).code = code
      return error
    },
    internal: (msg: string, code?: string) => {
      const error = new Error(msg)
      ;(error as Error & { statusCode: number; code?: string }).statusCode = 500
      ;(error as Error & { statusCode: number; code?: string }).code = code
      return error
    },
  },
}))

// Type for test response data
interface ProfileResponse {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
  emailVerified?: boolean
  createdAt: string
  updatedAt: string
}

interface PasswordChangeResponse {
  message: string
  revokedSessions: boolean
}

interface ErrorResponse {
  error: string
  details?: string
  code?: string
}

// Mock data
const mockAuthContext = {
  userId: "user_123",
  email: "test@example.com",
  name: "Test User",
  session: {
    id: "session_123",
    expiresAt: new Date(),
  },
}

const mockUser = {
  id: "user_123",
  name: "Test User",
  email: "test@example.com",
  image: "https://example.com/avatar.png",
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// Mock schema
const mockSchema = {
  user: {
    id: "id",
    name: "name",
    email: "email",
    image: "image",
    emailVerified: "emailVerified",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  },
}

// Mock database
const mockDb = {
  query: {
    user: {
      findFirst: vi.fn(),
    },
  },
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  })),
}

// Mock auth instance
const mockAuth = {
  api: {
    changePassword: vi.fn(),
  },
}

describe("Profile Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // =========================================================================
  // PATCH /api/profile Tests
  // =========================================================================
  describe("PATCH /api/profile", () => {
    it("should update user name successfully", async () => {
      mockDb.query.user.findFirst.mockResolvedValue({
        ...mockUser,
        name: "Updated Name",
        updatedAt: new Date(),
      })

      const { default: profile } = await import("../../routes/profile")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/profile", profile)

      const response = await app.request("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      })

      const data = (await response.json()) as ProfileResponse

      expect(response.status).toBe(200)
      expect(data.name).toBe("Updated Name")
      expect(mockDb.update).toHaveBeenCalled()
    })

    it("should update avatarUrl successfully", async () => {
      const newAvatarUrl = "https://example.com/new-avatar.png"
      mockDb.query.user.findFirst.mockResolvedValue({
        ...mockUser,
        image: newAvatarUrl,
        updatedAt: new Date(),
      })

      const { default: profile } = await import("../../routes/profile")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/profile", profile)

      const response = await app.request("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: newAvatarUrl }),
      })

      const data = (await response.json()) as ProfileResponse

      expect(response.status).toBe(200)
      expect(data.avatarUrl).toBe(newAvatarUrl)
    })

    it("should return 400 when no fields provided", async () => {
      const { default: profile } = await import("../../routes/profile")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/profile", profile)

      const response = await app.request("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(400)
      expect(data.error).toContain("At least one field")
    })

    it("should return 400 for empty name", async () => {
      const { default: profile } = await import("../../routes/profile")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/profile", profile)

      const response = await app.request("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }),
      })

      expect(response.status).toBe(400)
    })

    it("should return 400 for invalid avatarUrl", async () => {
      const { default: profile } = await import("../../routes/profile")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/profile", profile)

      const response = await app.request("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: "not-a-valid-url" }),
      })

      expect(response.status).toBe(400)
    })

    it("should accept null avatarUrl to clear avatar", async () => {
      mockDb.query.user.findFirst.mockResolvedValue({
        ...mockUser,
        image: null,
        updatedAt: new Date(),
      })

      const { default: profile } = await import("../../routes/profile")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/profile", profile)

      const response = await app.request("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: null }),
      })

      const data = (await response.json()) as ProfileResponse

      expect(response.status).toBe(200)
      expect(data.avatarUrl).toBeNull()
    })
  })

  // =========================================================================
  // POST /api/profile/password Tests
  // =========================================================================
  describe("POST /api/profile/password", () => {
    it("should change password successfully", async () => {
      mockAuth.api.changePassword.mockResolvedValue({ success: true })

      const { default: profile } = await import("../../routes/profile")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/profile", profile)

      const response = await app.request("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: "oldPassword123",
          newPassword: "newPassword456",
        }),
      })

      const data = (await response.json()) as PasswordChangeResponse

      expect(response.status).toBe(200)
      expect(data.message).toBe("Password changed successfully")
      expect(data.revokedSessions).toBe(false)
    })

    it("should return 400 when current password is incorrect", async () => {
      mockAuth.api.changePassword.mockRejectedValue(
        new Error("Invalid current password")
      )

      const { default: profile } = await import("../../routes/profile")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/profile", profile)

      const response = await app.request("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: "wrongPassword",
          newPassword: "newPassword456",
        }),
      })

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(400)
      expect(data.error).toContain("Current password is incorrect")
      expect(data.code).toBe("INVALID_CURRENT_PASSWORD")
    })

    it("should return 400 when new password is same as current", async () => {
      const { default: profile } = await import("../../routes/profile")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/profile", profile)

      const response = await app.request("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: "samePassword123",
          newPassword: "samePassword123",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should return 400 when new password is too short", async () => {
      const { default: profile } = await import("../../routes/profile")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/profile", profile)

      const response = await app.request("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: "currentPassword123",
          newPassword: "short",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should revoke other sessions when requested", async () => {
      mockAuth.api.changePassword.mockResolvedValue({ success: true })

      const { default: profile } = await import("../../routes/profile")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/profile", profile)

      const response = await app.request("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: "oldPassword123",
          newPassword: "newPassword456",
          revokeOtherSessions: true,
        }),
      })

      const data = (await response.json()) as PasswordChangeResponse

      expect(response.status).toBe(200)
      expect(data.revokedSessions).toBe(true)
      expect(mockAuth.api.changePassword).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({
            revokeOtherSessions: true,
          }),
        })
      )
    })
  })

  // =========================================================================
  // Edge Cases
  // =========================================================================
  describe("Edge Cases", () => {
    it("should return 404 when user not found after update", async () => {
      mockDb.query.user.findFirst.mockResolvedValue(null)

      const { default: profile } = await import("../../routes/profile")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/profile", profile)

      const response = await app.request("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Name" }),
      })

      expect(response.status).toBe(404)
    })

    it("should handle account without password (OAuth-only)", async () => {
      mockAuth.api.changePassword.mockRejectedValue(
        new Error("No password set for this account")
      )

      const { default: profile } = await import("../../routes/profile")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/profile", profile)

      const response = await app.request("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: "anyPassword",
          newPassword: "newPassword456",
        }),
      })

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(400)
      expect(data.code).toBe("NO_PASSWORD_SET")
    })

    it("should handle name at max length (100 chars)", async () => {
      const maxLengthName = "a".repeat(100)
      mockDb.query.user.findFirst.mockResolvedValue({
        ...mockUser,
        name: maxLengthName,
        updatedAt: new Date(),
      })

      const { default: profile } = await import("../../routes/profile")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/profile", profile)

      const response = await app.request("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: maxLengthName }),
      })

      expect(response.status).toBe(200)
    })

    it("should reject name exceeding max length", async () => {
      const tooLongName = "a".repeat(101)

      const { default: profile } = await import("../../routes/profile")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/profile", profile)

      const response = await app.request("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: tooLongName }),
      })

      expect(response.status).toBe(400)
    })
  })
})
