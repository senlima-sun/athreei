import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono } from "hono"

const mockVerifyMembership = vi.fn()

vi.mock("../../services", () => ({
  verifyOrganizationMembership: (...args: unknown[]) =>
    mockVerifyMembership(...args),
}))

vi.mock("../../middleware/auth", () => ({
  getAuthContext: () => ({ userId: "user_123", session: {} }),
}))

describe("Organization Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("withOrgFromQuery", () => {
    it("should set org context when organizationId is provided and user is member", async () => {
      mockVerifyMembership.mockResolvedValue(true)

      const { withOrgFromQuery, getOrgContext } =
        await import("../../middleware/organization")

      const app = new Hono()
      app.get("/test", withOrgFromQuery, (c) => {
        const org = getOrgContext(c)
        return c.json({ organizationId: org.organizationId })
      })

      const res = await app.request("/test?organizationId=org_123")
      expect(res.status).toBe(200)

      const data = (await res.json()) as { organizationId: string }
      expect(data.organizationId).toBe("org_123")
      expect(mockVerifyMembership).toHaveBeenCalledWith("user_123", "org_123")
    })

    it("should return 400 when organizationId is missing", async () => {
      const { withOrgFromQuery } = await import("../../middleware/organization")

      const app = new Hono()
      app.onError((err, c) => {
        const statusCode = (err as { statusCode?: number }).statusCode || 500
        return c.json({ error: err.message }, statusCode as 400)
      })
      app.get("/test", withOrgFromQuery, (c) => c.json({ ok: true }))

      const res = await app.request("/test")
      expect(res.status).toBe(400)

      const data = (await res.json()) as { error: string }
      expect(data.error).toContain("organizationId")
    })

    it("should return 403 when user is not a member", async () => {
      mockVerifyMembership.mockResolvedValue(false)

      const { withOrgFromQuery } = await import("../../middleware/organization")

      const app = new Hono()
      app.onError((err, c) => {
        const statusCode = (err as { statusCode?: number }).statusCode || 500
        return c.json({ error: err.message }, statusCode as 403)
      })
      app.get("/test", withOrgFromQuery, (c) => c.json({ ok: true }))

      const res = await app.request("/test?organizationId=org_456")
      expect(res.status).toBe(403)

      const data = (await res.json()) as { error: string }
      expect(data.error).toContain("access")
    })
  })

  describe("withOptionalOrgFromQuery", () => {
    it("should set org context when organizationId is provided", async () => {
      mockVerifyMembership.mockResolvedValue(true)

      const { withOptionalOrgFromQuery, getOrgContext } =
        await import("../../middleware/organization")

      const app = new Hono()
      app.get("/test", withOptionalOrgFromQuery, (c) => {
        try {
          const org = getOrgContext(c)
          return c.json({ organizationId: org.organizationId })
        } catch {
          return c.json({ organizationId: null })
        }
      })

      const res = await app.request("/test?organizationId=org_123")
      expect(res.status).toBe(200)

      const data = (await res.json()) as { organizationId: string }
      expect(data.organizationId).toBe("org_123")
    })

    it("should continue without org context when organizationId is not provided", async () => {
      const { withOptionalOrgFromQuery, getOrgContext } =
        await import("../../middleware/organization")

      const app = new Hono()
      app.get("/test", withOptionalOrgFromQuery, (c) => {
        try {
          const org = getOrgContext(c)
          return c.json({ organizationId: org.organizationId })
        } catch {
          return c.json({ organizationId: null })
        }
      })

      const res = await app.request("/test")
      expect(res.status).toBe(200)

      const data = (await res.json()) as { organizationId: string | null }
      expect(data.organizationId).toBeNull()
    })
  })

  describe("getOrgContext", () => {
    it("should throw error when org context is not set", async () => {
      const { getOrgContext } = await import("../../middleware/organization")

      const app = new Hono()
      app.onError((err, c) => {
        return c.json({ error: err.message }, 500)
      })
      app.get("/test", (c) => {
        const org = getOrgContext(c)
        return c.json({ organizationId: org.organizationId })
      })

      const res = await app.request("/test")
      expect(res.status).toBe(500)

      const data = (await res.json()) as { error: string }
      expect(data.error).toContain("Organization context not found")
    })
  })
})
