import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { authMiddleware, ApiError } from "../middleware"
import { getAuth } from "../lib/auth"
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from "../schemas/organizations"

const organizations = new Hono()

organizations.use("*", authMiddleware)

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

organizations.get("/", async (c) => {
  const auth = getAuth()

  const request = createProxyRequest(c, "/api/auth/organization/list", {
    method: "GET",
  })

  const response = await auth.handler(request)
  const data = await handleAuthResponse(response)

  return c.json(data)
})

organizations.get("/:id", async (c) => {
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
  const data = await handleAuthResponse(response)

  return c.json(data)
})

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

  return c.json({
    members: data.members || [],
    invitations: data.invitations || [],
  })
})

organizations.patch(
  "/:id/members/:memberId",
  zValidator("json", updateMemberRoleSchema),
  async (c) => {
    const auth = getAuth()
    const organizationId = c.req.param("id")
    const memberId = c.req.param("memberId")
    const { role } = c.req.valid("json")

    const request = createProxyRequest(
      c,
      "/api/auth/organization/update-member-role",
      {
        method: "POST",
        body: {
          organizationId,
          memberId,
          role,
        },
      }
    )

    const response = await auth.handler(request)
    const data = await handleAuthResponse(response)

    return c.json(data)
  }
)

organizations.post("/:id/invitations/:invitationId/resend", async (c) => {
  const auth = getAuth()
  const organizationId = c.req.param("id")
  const invitationId = c.req.param("invitationId")

  const authBaseUrl = process.env.AUTH_BASE_URL || "http://localhost:3001"
  const getOrgUrl = new URL(
    "/api/auth/organization/get-full-organization",
    authBaseUrl
  )
  getOrgUrl.searchParams.set("organizationId", organizationId)

  const headers = new Headers(c.req.raw.headers)
  const getOrgRequest = new Request(getOrgUrl.toString(), {
    method: "GET",
    headers,
  })

  const getOrgResponse = await auth.handler(getOrgRequest)
  const orgData = await handleAuthResponse<{
    invitations?: Array<{
      id: string
      email: string
      role: string
      status: string
      expiresAt: string
    }>
  }>(getOrgResponse)

  const invitation = orgData.invitations?.find((inv) => inv.id === invitationId)
  if (!invitation) {
    throw ApiError.notFound("Invitation not found")
  }

  if (invitation.status !== "pending") {
    throw ApiError.badRequest(
      `Cannot resend invitation with status: ${invitation.status}`
    )
  }

  const resendRequest = createProxyRequest(
    c,
    "/api/auth/organization/invite-member",
    {
      method: "POST",
      body: {
        organizationId,
        email: invitation.email,
        role: invitation.role,
        resend: true,
      },
    }
  )

  const resendResponse = await auth.handler(resendRequest)
  const data = await handleAuthResponse(resendResponse)

  return c.json(data)
})

organizations.delete("/:id/invitations/:invitationId", async (c) => {
  const auth = getAuth()
  const invitationId = c.req.param("invitationId")

  const request = createProxyRequest(
    c,
    "/api/auth/organization/cancel-invitation",
    {
      method: "POST",
      body: {
        invitationId,
      },
    }
  )

  const response = await auth.handler(request)
  await handleAuthResponse(response)

  return c.json({ message: "Invitation cancelled successfully" })
})

export default organizations
