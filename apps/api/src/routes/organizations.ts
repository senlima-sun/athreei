/**
 * Organization routes
 *
 * Proxy endpoints for Better Auth organization operations.
 * These routes provide a cleaner API interface while delegating
 * to Better Auth's organization plugin for actual operations.
 *
 * Better Auth organization plugin handles:
 * - /api/auth/organization/* endpoints
 *
 * We expose cleaner REST-style endpoints here and proxy to Better Auth.
 */

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { authMiddleware, ApiError } from "../middleware"
import { getAuth } from "../lib/auth"

const organizations = new Hono()

// Apply auth middleware to all organization routes
organizations.use("*", authMiddleware)

// =============================================================================
// Validation Schemas
// =============================================================================

const createOrganizationSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(50, "Slug too long")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  logo: z.string().url().optional(),
  metadata: z.record(z.unknown()).optional(),
})

const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  logo: z.string().url().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
})

const inviteMemberSchema = z.object({
  email: z.string().email("Valid email required"),
  role: z.enum(["admin", "member"]).default("member"),
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a new request to proxy to Better Auth
 */
function createProxyRequest(
  c: { req: { raw: Request } },
  path: string,
  options: {
    method?: string
    body?: unknown
  } = {}
): Request {
  const authBaseUrl = process.env.AUTH_BASE_URL || "http://localhost:3001"
  const url = new URL(path, authBaseUrl)

  const headers = new Headers(c.req.raw.headers)
  headers.set("Content-Type", "application/json")

  return new Request(url.toString(), {
    method: options.method || "POST",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
}

/**
 * Handle Better Auth response and convert errors
 */
async function handleAuthResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as
    | T
    | { error?: string; message?: string }

  if (!response.ok) {
    const errorData = data as { error?: string; message?: string }
    const message = errorData.error || errorData.message || "Request failed"

    if (response.status === 404) {
      throw ApiError.notFound(message)
    }
    if (response.status === 403) {
      throw ApiError.forbidden(message)
    }
    if (response.status === 409) {
      throw ApiError.conflict(message)
    }
    if (response.status === 401) {
      throw ApiError.unauthorized(message)
    }
    throw ApiError.badRequest(message)
  }

  return data as T
}

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /api/organizations
 * Create a new organization
 *
 * Proxies to Better Auth: POST /api/auth/organization/create
 */
organizations.post(
  "/",
  zValidator("json", createOrganizationSchema),
  async (c) => {
    const auth = getAuth()
    const body = c.req.valid("json")

    const request = createProxyRequest(c, "/api/auth/organization/create", {
      method: "POST",
      body: {
        name: body.name,
        slug: body.slug,
        logo: body.logo,
        metadata: body.metadata ? JSON.stringify(body.metadata) : undefined,
      },
    })

    const response = await auth.handler(request)
    const data = await handleAuthResponse(response)

    return c.json(data, 201)
  }
)

/**
 * GET /api/organizations
 * List all organizations the user belongs to
 *
 * Proxies to Better Auth: GET /api/auth/organization/list
 */
organizations.get("/", async (c) => {
  const auth = getAuth()

  const request = createProxyRequest(c, "/api/auth/organization/list", {
    method: "GET",
  })

  const response = await auth.handler(request)
  const data = await handleAuthResponse(response)

  return c.json(data)
})

/**
 * GET /api/organizations/:id
 * Get organization details
 *
 * Proxies to Better Auth: GET /api/auth/organization/get-full-organization
 */
organizations.get("/:id", async (c) => {
  const auth = getAuth()
  const organizationId = c.req.param("id")

  // Better Auth uses query params for this endpoint
  const authBaseUrl = process.env.AUTH_BASE_URL || "http://localhost:3001"
  const url = new URL(
    "/api/auth/organization/get-full-organization",
    authBaseUrl
  )
  url.searchParams.set("organizationId", organizationId)

  const headers = new Headers(c.req.raw.headers)

  const request = new Request(url.toString(), {
    method: "GET",
    headers,
  })

  const response = await auth.handler(request)
  const data = await handleAuthResponse(response)

  return c.json(data)
})

/**
 * PATCH /api/organizations/:id
 * Update organization details
 *
 * Proxies to Better Auth: POST /api/auth/organization/update
 */
organizations.patch(
  "/:id",
  zValidator("json", updateOrganizationSchema),
  async (c) => {
    const auth = getAuth()
    const organizationId = c.req.param("id")
    const updates = c.req.valid("json")

    const request = createProxyRequest(c, "/api/auth/organization/update", {
      method: "POST",
      body: {
        organizationId,
        data: {
          name: updates.name,
          slug: updates.slug,
          logo: updates.logo,
          metadata: updates.metadata
            ? JSON.stringify(updates.metadata)
            : undefined,
        },
      },
    })

    const response = await auth.handler(request)
    const data = await handleAuthResponse(response)

    return c.json(data)
  }
)

/**
 * DELETE /api/organizations/:id
 * Delete an organization
 *
 * Proxies to Better Auth: POST /api/auth/organization/delete
 */
organizations.delete("/:id", async (c) => {
  const auth = getAuth()
  const organizationId = c.req.param("id")

  const request = createProxyRequest(c, "/api/auth/organization/delete", {
    method: "POST",
    body: {
      organizationId,
    },
  })

  const response = await auth.handler(request)
  await handleAuthResponse(response)

  return c.json({ message: "Organization deleted successfully" })
})

/**
 * POST /api/organizations/:id/invite
 * Invite a member to the organization
 *
 * Proxies to Better Auth: POST /api/auth/organization/invite-member
 */
organizations.post(
  "/:id/invite",
  zValidator("json", inviteMemberSchema),
  async (c) => {
    const auth = getAuth()
    const organizationId = c.req.param("id")
    const { email, role } = c.req.valid("json")

    const request = createProxyRequest(
      c,
      "/api/auth/organization/invite-member",
      {
        method: "POST",
        body: {
          organizationId,
          email,
          role,
        },
      }
    )

    const response = await auth.handler(request)
    const data = await handleAuthResponse(response)

    return c.json(data, 201)
  }
)

/**
 * GET /api/organizations/:id/members
 * List all members of an organization
 *
 * Proxies to Better Auth: GET /api/auth/organization/get-full-organization
 * Then extracts just the members
 */
organizations.get("/:id/members", async (c) => {
  const auth = getAuth()
  const organizationId = c.req.param("id")

  const authBaseUrl = process.env.AUTH_BASE_URL || "http://localhost:3001"
  const url = new URL(
    "/api/auth/organization/get-full-organization",
    authBaseUrl
  )
  url.searchParams.set("organizationId", organizationId)

  const headers = new Headers(c.req.raw.headers)

  const request = new Request(url.toString(), {
    method: "GET",
    headers,
  })

  const response = await auth.handler(request)
  const data = await handleAuthResponse<{
    members?: unknown[]
    invitations?: unknown[]
  }>(response)

  // Return just the members and invitations
  return c.json({
    members: data.members || [],
    invitations: data.invitations || [],
  })
})

export default organizations
