/**
 * Tests for the Organizations routes
 *
 * These tests verify the organization management operations including:
 * - Creating organizations
 * - Listing organizations
 * - Getting organization details
 * - Updating organizations
 * - Deleting organizations
 * - Inviting members
 * - Listing members
 * - Updating member roles
 * - Resending invitations
 * - Cancelling invitations
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

// Mock auth handler function
const mockAuthHandler = vi.fn()

// Mock modules before importing the routes
vi.mock("../../lib/auth", () => ({
  getAuth: vi.fn(() => ({
    handler: mockAuthHandler,
  })),
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
    unauthorized: (msg: string, code?: string) => {
      const error = new Error(msg)
      ;(error as Error & { statusCode: number; code?: string }).statusCode = 401
      ;(error as Error & { statusCode: number; code?: string }).code = code
      return error
    },
    conflict: (msg: string, code?: string) => {
      const error = new Error(msg)
      ;(error as Error & { statusCode: number; code?: string }).statusCode = 409
      ;(error as Error & { statusCode: number; code?: string }).code = code
      return error
    },
  },
}))

// Type for test response data
interface OrganizationResponse {
  id: string
  name: string
  slug: string
  logo?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

interface MemberResponse {
  id: string
  userId: string
  organizationId: string
  role: string
  createdAt: string
}

interface InvitationResponse {
  id: string
  email: string
  role: string
  status: string
  expiresAt: string
}

interface MembersListResponse {
  members: MemberResponse[]
  invitations: InvitationResponse[]
}

interface MessageResponse {
  message: string
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
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
}

const mockOrganization: OrganizationResponse = {
  id: "org_123",
  name: "Test Organization",
  slug: "test-org",
  logo: "https://example.com/logo.png",
  metadata: { plan: "pro" },
  createdAt: new Date().toISOString(),
}

const mockOrganizations: OrganizationResponse[] = [
  mockOrganization,
  {
    id: "org_456",
    name: "Second Organization",
    slug: "second-org",
    createdAt: new Date().toISOString(),
  },
]

const mockMember: MemberResponse = {
  id: "member_123",
  userId: "user_123",
  organizationId: "org_123",
  role: "admin",
  createdAt: new Date().toISOString(),
}

const mockInvitation: InvitationResponse = {
  id: "inv_123",
  email: "invited@example.com",
  role: "member",
  status: "pending",
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
}

const mockFullOrganization = {
  ...mockOrganization,
  members: [mockMember],
  invitations: [mockInvitation],
}

/**
 * Create a mock Response object for Better Auth handler
 */
function createMockResponse(data: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("Organizations Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("POST /api/organizations", () => {
    it("should create organization successfully", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse(mockOrganization, 200)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Organization",
          slug: "test-org",
          logo: "https://example.com/logo.png",
          metadata: { plan: "pro" },
        }),
      })

      const data = (await response.json()) as OrganizationResponse

      expect(response.status).toBe(201)
      expect(data.id).toBe("org_123")
      expect(data.name).toBe("Test Organization")
      expect(data.slug).toBe("test-org")
      expect(mockAuthHandler).toHaveBeenCalled()
    })

    it("should create organization without optional fields", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse(
          { ...mockOrganization, logo: undefined, metadata: undefined },
          200
        )
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Minimal Org",
          slug: "minimal-org",
        }),
      })

      expect(response.status).toBe(201)
    })

    it("should return 400 for missing name", async () => {
      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: "test-org",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should return 400 for missing slug", async () => {
      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Organization",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should return 400 for invalid slug format", async () => {
      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Organization",
          slug: "Invalid Slug With Spaces",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should return 400 for invalid logo URL", async () => {
      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Organization",
          slug: "test-org",
          logo: "not-a-valid-url",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should return 409 when slug already exists", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ error: "Slug already exists" }, 409)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Organization",
          slug: "existing-slug",
        }),
      })

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(409)
      expect(data.error).toContain("Slug already exists")
    })
  })

  describe("GET /api/organizations", () => {
    it("should list all user organizations", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse(mockOrganizations, 200)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations")
      const data = (await response.json()) as OrganizationResponse[]

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBe(2)
      expect(data[0]!.id).toBe("org_123")
      expect(data[1]!.id).toBe("org_456")
    })

    it("should return empty array when user has no organizations", async () => {
      mockAuthHandler.mockResolvedValue(createMockResponse([], 200))

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations")
      const data = (await response.json()) as OrganizationResponse[]

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it("should return 401 when unauthorized", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ error: "Unauthorized" }, 401)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations")
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(401)
      expect(data.error).toContain("Unauthorized")
    })
  })

  describe("GET /api/organizations/:id", () => {
    it("should get organization details", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse(mockFullOrganization, 200)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123")
      const data = (await response.json()) as typeof mockFullOrganization

      expect(response.status).toBe(200)
      expect(data.id).toBe("org_123")
      expect(data.name).toBe("Test Organization")
      expect(data.members).toBeDefined()
      expect(data.invitations).toBeDefined()
    })

    it("should return 404 when organization not found", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ error: "Organization not found" }, 404)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_nonexistent")
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(404)
      expect(data.error).toContain("Organization not found")
    })

    it("should return 403 when user is not a member", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ error: "Access denied" }, 403)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_other")
      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error).toContain("Access denied")
    })
  })

  describe("PATCH /api/organizations/:id", () => {
    it("should update organization name", async () => {
      const updatedOrg = { ...mockOrganization, name: "Updated Name" }
      mockAuthHandler.mockResolvedValue(createMockResponse(updatedOrg, 200))

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Name" }),
      })

      const data = (await response.json()) as OrganizationResponse

      expect(response.status).toBe(200)
      expect(data.name).toBe("Updated Name")
    })

    it("should update organization slug", async () => {
      const updatedOrg = { ...mockOrganization, slug: "new-slug" }
      mockAuthHandler.mockResolvedValue(createMockResponse(updatedOrg, 200))

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "new-slug" }),
      })

      const data = (await response.json()) as OrganizationResponse

      expect(response.status).toBe(200)
      expect(data.slug).toBe("new-slug")
    })

    it("should update organization logo", async () => {
      const updatedOrg = {
        ...mockOrganization,
        logo: "https://example.com/new-logo.png",
      }
      mockAuthHandler.mockResolvedValue(createMockResponse(updatedOrg, 200))

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo: "https://example.com/new-logo.png" }),
      })

      const data = (await response.json()) as OrganizationResponse

      expect(response.status).toBe(200)
      expect(data.logo).toBe("https://example.com/new-logo.png")
    })

    it("should allow setting logo to null", async () => {
      const updatedOrg = { ...mockOrganization, logo: null }
      mockAuthHandler.mockResolvedValue(createMockResponse(updatedOrg, 200))

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo: null }),
      })

      expect(response.status).toBe(200)
    })

    it("should return 400 for invalid slug format in update", async () => {
      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "Invalid Slug" }),
      })

      expect(response.status).toBe(400)
    })

    it("should return 404 when updating non-existent organization", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ error: "Organization not found" }, 404)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_nonexistent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Name" }),
      })

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(404)
      expect(data.error).toContain("Organization not found")
    })

    it("should return 403 when user lacks permission to update", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ error: "Insufficient permissions" }, 403)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Name" }),
      })

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error).toContain("Insufficient permissions")
    })

    it("should return 409 when slug is already taken", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ error: "Slug already exists" }, 409)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "taken-slug" }),
      })

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(409)
      expect(data.error).toContain("Slug already exists")
    })
  })

  describe("DELETE /api/organizations/:id", () => {
    it("should delete organization successfully", async () => {
      mockAuthHandler.mockResolvedValue(createMockResponse({}, 200))

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123", {
        method: "DELETE",
      })

      const data = (await response.json()) as MessageResponse

      expect(response.status).toBe(200)
      expect(data.message).toBe("Organization deleted successfully")
    })

    it("should return 404 when deleting non-existent organization", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ error: "Organization not found" }, 404)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_nonexistent", {
        method: "DELETE",
      })

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(404)
      expect(data.error).toContain("Organization not found")
    })

    it("should return 403 when user lacks permission to delete", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse(
          { error: "Only owners can delete organizations" },
          403
        )
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123", {
        method: "DELETE",
      })

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error).toContain("Only owners can delete")
    })
  })

  describe("POST /api/organizations/:id/invite", () => {
    it("should invite member successfully", async () => {
      mockAuthHandler.mockResolvedValue(createMockResponse(mockInvitation, 200))

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "newuser@example.com",
          role: "member",
        }),
      })

      const data = (await response.json()) as InvitationResponse

      expect(response.status).toBe(201)
      expect(data.email).toBe("invited@example.com")
      expect(data.role).toBe("member")
    })

    it("should invite member as admin", async () => {
      const adminInvitation = { ...mockInvitation, role: "admin" }
      mockAuthHandler.mockResolvedValue(
        createMockResponse(adminInvitation, 200)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "admin@example.com",
          role: "admin",
        }),
      })

      const data = (await response.json()) as InvitationResponse

      expect(response.status).toBe(201)
      expect(data.role).toBe("admin")
    })

    it("should use default role when not specified", async () => {
      mockAuthHandler.mockResolvedValue(createMockResponse(mockInvitation, 200))

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "newuser@example.com",
        }),
      })

      expect(response.status).toBe(201)
    })

    it("should return 400 for invalid email", async () => {
      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "not-an-email",
          role: "member",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should return 400 for invalid role", async () => {
      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          role: "superadmin",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should return 409 when user already invited", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ error: "User already invited" }, 409)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "existing@example.com",
          role: "member",
        }),
      })

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(409)
      expect(data.error).toContain("already invited")
    })

    it("should return 403 when user lacks permission to invite", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ error: "Only admins can invite members" }, 403)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          role: "member",
        }),
      })

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error).toContain("Only admins")
    })

    it("should return 404 when organization not found", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ error: "Organization not found" }, 404)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request(
        "/api/organizations/org_nonexistent/invite",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: "user@example.com",
            role: "member",
          }),
        }
      )

      expect(response.status).toBe(404)
    })
  })

  describe("GET /api/organizations/:id/members", () => {
    it("should list organization members and invitations", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse(mockFullOrganization, 200)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123/members")
      const data = (await response.json()) as MembersListResponse

      expect(response.status).toBe(200)
      expect(data.members).toBeDefined()
      expect(data.invitations).toBeDefined()
      expect(data.members.length).toBe(1)
      expect(data.invitations.length).toBe(1)
    })

    it("should return empty arrays when no members or invitations", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ members: [], invitations: [] }, 200)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123/members")
      const data = (await response.json()) as MembersListResponse

      expect(response.status).toBe(200)
      expect(data.members).toEqual([])
      expect(data.invitations).toEqual([])
    })

    it("should return 404 when organization not found", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ error: "Organization not found" }, 404)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request(
        "/api/organizations/org_nonexistent/members"
      )

      expect(response.status).toBe(404)
    })

    it("should return 403 when user is not a member", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ error: "Access denied" }, 403)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_other/members")

      expect(response.status).toBe(403)
    })
  })

  describe("PATCH /api/organizations/:id/members/:memberId", () => {
    it("should update member role successfully", async () => {
      const updatedMember = { ...mockMember, role: "member" }
      mockAuthHandler.mockResolvedValue(createMockResponse(updatedMember, 200))

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request(
        "/api/organizations/org_123/members/member_123",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "member" }),
        }
      )

      const data = (await response.json()) as MemberResponse

      expect(response.status).toBe(200)
      expect(data.role).toBe("member")
    })

    it("should promote member to admin", async () => {
      const updatedMember = { ...mockMember, role: "admin" }
      mockAuthHandler.mockResolvedValue(createMockResponse(updatedMember, 200))

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request(
        "/api/organizations/org_123/members/member_456",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "admin" }),
        }
      )

      const data = (await response.json()) as MemberResponse

      expect(response.status).toBe(200)
      expect(data.role).toBe("admin")
    })

    it("should return 400 for invalid role", async () => {
      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request(
        "/api/organizations/org_123/members/member_123",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "superadmin" }),
        }
      )

      expect(response.status).toBe(400)
    })

    it("should return 400 for missing role", async () => {
      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request(
        "/api/organizations/org_123/members/member_123",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      )

      expect(response.status).toBe(400)
    })

    it("should return 404 when member not found", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ error: "Member not found" }, 404)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request(
        "/api/organizations/org_123/members/member_nonexistent",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "admin" }),
        }
      )

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(404)
      expect(data.error).toContain("Member not found")
    })

    it("should return 403 when user lacks permission to change roles", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ error: "Only admins can change roles" }, 403)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request(
        "/api/organizations/org_123/members/member_123",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "admin" }),
        }
      )

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error).toContain("Only admins")
    })
  })

  describe("POST /api/organizations/:id/invitations/:invitationId/resend", () => {
    it("should resend invitation successfully", async () => {
      // First call returns full organization with invitation
      // Second call returns success for resend
      mockAuthHandler
        .mockResolvedValueOnce(createMockResponse(mockFullOrganization, 200))
        .mockResolvedValueOnce(createMockResponse(mockInvitation, 200))

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request(
        "/api/organizations/org_123/invitations/inv_123/resend",
        {
          method: "POST",
        }
      )

      expect(response.status).toBe(200)
    })

    it("should return 404 when invitation not found", async () => {
      const orgWithoutInvitation = {
        ...mockFullOrganization,
        invitations: [],
      }
      mockAuthHandler.mockResolvedValueOnce(
        createMockResponse(orgWithoutInvitation, 200)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request(
        "/api/organizations/org_123/invitations/inv_nonexistent/resend",
        {
          method: "POST",
        }
      )

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(404)
      expect(data.error).toContain("Invitation not found")
    })

    it("should return 400 when invitation is not pending", async () => {
      const acceptedInvitation = { ...mockInvitation, status: "accepted" }
      const orgWithAcceptedInvitation = {
        ...mockFullOrganization,
        invitations: [acceptedInvitation],
      }
      mockAuthHandler.mockResolvedValueOnce(
        createMockResponse(orgWithAcceptedInvitation, 200)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request(
        "/api/organizations/org_123/invitations/inv_123/resend",
        {
          method: "POST",
        }
      )

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(400)
      expect(data.error).toContain("Cannot resend invitation")
    })

    it("should return 404 when organization not found", async () => {
      mockAuthHandler.mockResolvedValueOnce(
        createMockResponse({ error: "Organization not found" }, 404)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request(
        "/api/organizations/org_nonexistent/invitations/inv_123/resend",
        {
          method: "POST",
        }
      )

      expect(response.status).toBe(404)
    })

    it("should return 403 when user lacks permission", async () => {
      mockAuthHandler.mockResolvedValueOnce(
        createMockResponse({ error: "Access denied" }, 403)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request(
        "/api/organizations/org_123/invitations/inv_123/resend",
        {
          method: "POST",
        }
      )

      expect(response.status).toBe(403)
    })
  })

  describe("DELETE /api/organizations/:id/invitations/:invitationId", () => {
    it("should cancel invitation successfully", async () => {
      mockAuthHandler.mockResolvedValue(createMockResponse({}, 200))

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request(
        "/api/organizations/org_123/invitations/inv_123",
        {
          method: "DELETE",
        }
      )

      const data = (await response.json()) as MessageResponse

      expect(response.status).toBe(200)
      expect(data.message).toBe("Invitation cancelled successfully")
    })

    it("should return 404 when invitation not found", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ error: "Invitation not found" }, 404)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request(
        "/api/organizations/org_123/invitations/inv_nonexistent",
        {
          method: "DELETE",
        }
      )

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(404)
      expect(data.error).toContain("Invitation not found")
    })

    it("should return 403 when user lacks permission to cancel", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ error: "Only admins can cancel invitations" }, 403)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request(
        "/api/organizations/org_123/invitations/inv_123",
        {
          method: "DELETE",
        }
      )

      const data = (await response.json()) as ErrorResponse

      expect(response.status).toBe(403)
      expect(data.error).toContain("Only admins")
    })
  })

  describe("Edge Cases", () => {
    it("should handle organization with empty metadata", async () => {
      const orgWithEmptyMetadata = { ...mockOrganization, metadata: {} }
      mockAuthHandler.mockResolvedValue(
        createMockResponse(orgWithEmptyMetadata, 200)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123")
      const data = (await response.json()) as OrganizationResponse

      expect(response.status).toBe(200)
      expect(data.metadata).toEqual({})
    })

    it("should handle organization with complex metadata", async () => {
      const orgWithComplexMetadata = {
        ...mockOrganization,
        metadata: {
          plan: "enterprise",
          features: ["sso", "audit-logs"],
          settings: { theme: "dark" },
        },
      }
      mockAuthHandler.mockResolvedValue(
        createMockResponse(orgWithComplexMetadata, 200)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123")
      const data = (await response.json()) as OrganizationResponse

      expect(response.status).toBe(200)
      expect(data.metadata).toEqual({
        plan: "enterprise",
        features: ["sso", "audit-logs"],
        settings: { theme: "dark" },
      })
    })

    it("should handle slug with hyphens and numbers", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ ...mockOrganization, slug: "my-org-123" }, 200)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "My Org 123",
          slug: "my-org-123",
        }),
      })

      expect(response.status).toBe(201)
    })

    it("should handle maximum length name", async () => {
      const longName = "a".repeat(100)
      mockAuthHandler.mockResolvedValue(
        createMockResponse({ ...mockOrganization, name: longName }, 200)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: longName,
          slug: "long-name-org",
        }),
      })

      expect(response.status).toBe(201)
    })

    it("should reject name exceeding maximum length", async () => {
      const tooLongName = "a".repeat(101)

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tooLongName,
          slug: "long-name-org",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should reject slug exceeding maximum length", async () => {
      const tooLongSlug = "a".repeat(51)

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Org",
          slug: tooLongSlug,
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should handle empty body for update", async () => {
      mockAuthHandler.mockResolvedValue(
        createMockResponse(mockOrganization, 200)
      )

      const { default: organizations } =
        await import("../../routes/organizations")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/organizations", organizations)

      const response = await app.request("/api/organizations/org_123", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })

      // Empty update should be valid (all fields optional)
      expect(response.status).toBe(200)
    })
  })
})
