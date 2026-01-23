import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono, type Context, type ErrorHandler } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"

const testErrorHandler: ErrorHandler = (err: Error, c: Context) => {
  const statusCode =
    (err as Error & { statusCode?: ContentfulStatusCode }).statusCode || 500
  return c.json(
    { error: err.message, code: (err as Error & { code?: string }).code },
    statusCode
  )
}

const now = new Date()

let mockAuthContext: {
  userId: string
  email: string
  name: string
  session: { id: string; expiresAt: Date }
} | null = {
  userId: "user_123",
  email: "test@example.com",
  name: "Test User",
  session: {
    id: "session_123",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
}

function setMockAuthContext(
  value: typeof mockAuthContext
): typeof mockAuthContext {
  mockAuthContext = value
  return mockAuthContext
}

const mockNamespace = {
  id: "ns_123",
  organizationId: "org_123",
  name: "Production",
  slug: "production",
  description: "Production namespace",
  isDefault: true,
  createdAt: now,
  updatedAt: now,
}

const _mockMember = {
  id: "member_123",
  userId: "user_123",
  organizationId: "org_123",
  role: "admin",
  createdAt: now,
}

const mockSkill = {
  id: "skill_123",
  organizationId: "org_123",
  name: "Test Skill",
  description: "A test skill",
  createdAt: now,
  updatedAt: now,
}

const mockNamespaceHook = {
  id: "nshook_123",
  namespaceId: "ns_123",
  event: "PreToolUse",
  toolNamePattern: "github__*",
  handler: JSON.stringify({ type: "rule", action: "ask", message: "Allow?" }),
  priority: 100,
  isEnabled: true,
  sourcePluginId: null,
  createdAt: now,
  updatedAt: now,
}

const mockDb = {
  query: {
    namespace: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    namespaceHook: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
    },
    skill: {
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
  delete: vi.fn(() => ({
    where: vi.fn(() => Promise.resolve()),
  })),
}

const mockGetNamespaceWithAccess = vi.fn()
const mockGenerateNamespaceHookId = vi.fn(() => "nshook_new_123")

vi.mock("../../lib/db-operations", () => ({
  db: vi.fn(() => mockDb),
}))

vi.mock("@athreei/db", () => ({
  detectDatabaseType: vi.fn(() => "sqlite"),
  namespaceHook: {
    id: "id",
    namespaceId: "namespace_id",
    event: "event",
    toolNamePattern: "tool_name_pattern",
    handler: "handler",
    priority: "priority",
    isEnabled: "is_enabled",
    sourcePluginId: "source_plugin_id",
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  skill: {
    id: "id",
    organizationId: "organization_id",
    name: "name",
    description: "description",
  },
}))

vi.mock("../../services", () => ({
  getNamespaceWithAccess: mockGetNamespaceWithAccess,
  generateNamespaceHookId: mockGenerateNamespaceHookId,
}))

vi.mock("../../middleware", () => ({
  authMiddleware: vi.fn((c, next) => {
    if (!mockAuthContext) {
      const error = new Error("Unauthorized: No auth context")
      ;(error as Error & { statusCode: number }).statusCode = 401
      throw error
    }
    c.set("auth", mockAuthContext)
    return next()
  }),
  getAuthContext: vi.fn((c) => {
    const auth = c.get("auth")
    if (!auth) {
      const error = new Error("Unauthorized: No auth context")
      ;(error as Error & { statusCode: number }).statusCode = 401
      throw error
    }
    return auth
  }),
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
  },
}))

interface HookResponse {
  id: string
  namespaceId: string
  event: string
  toolNamePattern: string | null
  handler: unknown
  priority: number
  isEnabled: boolean
  sourcePluginId: string | null
  createdAt: string
  updatedAt: string
}

interface SingleHookResponse {
  hook: HookResponse
}

interface ListHooksResponse {
  hooks: HookResponse[]
}

interface _ToggleHookResponse {
  hook: { id: string; isEnabled: boolean }
  message: string
}

interface _DeleteHookResponse {
  message: string
}

describe.skip("Namespace Hooks Routes", () => {
  beforeEach(() => {
    mockDb.query.namespace.findFirst.mockReset()
    mockDb.query.namespace.findMany.mockReset()
    mockDb.query.namespaceHook.findFirst.mockReset()
    mockDb.query.namespaceHook.findMany.mockReset()
    mockDb.query.member.findFirst.mockReset()
    mockDb.query.skill.findFirst.mockReset()
    mockDb.insert.mockClear()
    mockDb.update.mockClear()
    mockDb.delete.mockClear()
    mockGetNamespaceWithAccess.mockReset()
    mockGenerateNamespaceHookId.mockReset()
    mockGenerateNamespaceHookId.mockReturnValue("nshook_new_123")
    setMockAuthContext({
      userId: "user_123",
      email: "test@example.com",
      name: "Test User",
      session: {
        id: "session_123",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })
    mockGetNamespaceWithAccess.mockResolvedValue(mockNamespace)
  })

  describe("GET /api/namespaces/:id/hooks - List hooks", () => {
    it("should return list of hooks for authenticated user", async () => {
      mockDb.query.namespaceHook.findMany.mockResolvedValue([mockNamespaceHook])

      const { default: namespaces } = await import("../../routes/namespaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/namespaces", namespaces)

      const response = await app.request("/api/namespaces/ns_123/hooks")
      const data = (await response.json()) as ListHooksResponse

      expect(response.status).toBe(200)
      expect(data).toHaveProperty("hooks")
      expect(Array.isArray(data.hooks)).toBe(true)
      expect(data.hooks).toHaveLength(1)
      expect(data.hooks[0]!.id).toBe("nshook_123")
      expect(data.hooks[0]!.event).toBe("PreToolUse")
    })

    it("should return empty array when no hooks exist", async () => {
      mockDb.query.namespaceHook.findMany.mockResolvedValue([])

      const { default: namespaces } = await import("../../routes/namespaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/namespaces", namespaces)

      const response = await app.request("/api/namespaces/ns_123/hooks")
      const data = (await response.json()) as ListHooksResponse

      expect(response.status).toBe(200)
      expect(data.hooks).toHaveLength(0)
    })

    it("should parse handler JSON correctly", async () => {
      mockDb.query.namespaceHook.findMany.mockResolvedValue([mockNamespaceHook])

      const { default: namespaces } = await import("../../routes/namespaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/namespaces", namespaces)

      const response = await app.request("/api/namespaces/ns_123/hooks")
      const data = (await response.json()) as ListHooksResponse

      expect(response.status).toBe(200)
      expect(data.hooks[0]!.handler).toEqual({
        type: "rule",
        action: "ask",
        message: "Allow?",
      })
    })
  })

  describe("POST /api/namespaces/:id/hooks - Create hook", () => {
    it("should create a hook with rule handler", async () => {
      const { default: namespaces } = await import("../../routes/namespaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/namespaces", namespaces)

      const response = await app.request("/api/namespaces/ns_123/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "PreToolUse",
          toolNamePattern: "github__*",
          handler: { type: "rule", action: "block", message: "Blocked" },
          priority: 200,
          isEnabled: true,
        }),
      })
      const data = (await response.json()) as SingleHookResponse

      expect(response.status).toBe(201)
      expect(data).toHaveProperty("hook")
      expect(data.hook.id).toBe("nshook_new_123")
      expect(data.hook.event).toBe("PreToolUse")
      expect(data.hook.toolNamePattern).toBe("github__*")
      expect(data.hook.priority).toBe(200)
    })

    it("should create a hook with script handler", async () => {
      const { default: namespaces } = await import("../../routes/namespaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/namespaces", namespaces)

      const response = await app.request("/api/namespaces/ns_123/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "PostToolUse",
          handler: { type: "script", command: "node", args: ["--version"] },
        }),
      })
      const data = (await response.json()) as SingleHookResponse

      expect(response.status).toBe(201)
      expect(data.hook.event).toBe("PostToolUse")
      expect(data.hook.handler).toEqual({
        type: "script",
        command: "node",
        args: ["--version"],
      })
    })

    it("should create a hook with skill handler when skill exists", async () => {
      mockDb.query.skill.findFirst.mockResolvedValue(mockSkill)

      const { default: namespaces } = await import("../../routes/namespaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/namespaces", namespaces)

      const response = await app.request("/api/namespaces/ns_123/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "SessionStart",
          handler: { type: "skill", skillRef: "skill_123" },
        }),
      })
      const data = (await response.json()) as SingleHookResponse

      expect(response.status).toBe(201)
      expect(data.hook.handler).toEqual({
        type: "skill",
        skillRef: "skill_123",
      })
    })

    it("should return 404 when skill does not exist", async () => {
      mockDb.query.skill.findFirst.mockResolvedValue(null)

      const { default: namespaces } = await import("../../routes/namespaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/namespaces", namespaces)

      const response = await app.request("/api/namespaces/ns_123/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "SessionStart",
          handler: { type: "skill", skillRef: "skill_nonexistent" },
        }),
      })

      expect(response.status).toBe(404)
    })

    it("should return 403 when skill belongs to different organization", async () => {
      mockDb.query.skill.findFirst.mockResolvedValue({
        ...mockSkill,
        organizationId: "org_other",
      })

      const { default: namespaces } = await import("../../routes/namespaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/namespaces", namespaces)

      const response = await app.request("/api/namespaces/ns_123/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "SessionStart",
          handler: { type: "skill", skillRef: "skill_123" },
        }),
      })

      expect(response.status).toBe(403)
    })

    it("should use default priority when not provided", async () => {
      const { default: namespaces } = await import("../../routes/namespaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/namespaces", namespaces)

      const response = await app.request("/api/namespaces/ns_123/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "Stop",
          handler: { type: "rule", action: "allow" },
        }),
      })
      const data = (await response.json()) as SingleHookResponse

      expect(response.status).toBe(201)
      expect(data.hook.priority).toBe(100)
    })

    it("should return 400 for invalid event type", async () => {
      const { default: namespaces } = await import("../../routes/namespaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/namespaces", namespaces)

      const response = await app.request("/api/namespaces/ns_123/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "InvalidEvent",
          handler: { type: "rule", action: "block" },
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should return 400 when handler is missing", async () => {
      const { default: namespaces } = await import("../../routes/namespaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/namespaces", namespaces)

      const response = await app.request("/api/namespaces/ns_123/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "PreToolUse",
        }),
      })

      expect(response.status).toBe(400)
    })

    it("should return 400 for invalid handler type", async () => {
      const { default: namespaces } = await import("../../routes/namespaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/namespaces", namespaces)

      const response = await app.request("/api/namespaces/ns_123/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "PreToolUse",
          handler: { type: "invalid_type" },
        }),
      })

      expect(response.status).toBe(400)
    })
  })

  describe("Authorization - Unauthenticated requests", () => {
    beforeEach(() => {
      setMockAuthContext(null)
    })

    it("should return 401 for GET /hooks without authentication", async () => {
      const { default: namespaces } = await import("../../routes/namespaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/namespaces", namespaces)

      const response = await app.request("/api/namespaces/ns_123/hooks")

      expect(response.status).toBe(401)
    })

    it("should return 401 for POST /hooks without authentication", async () => {
      const { default: namespaces } = await import("../../routes/namespaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/namespaces", namespaces)

      const response = await app.request("/api/namespaces/ns_123/hooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "PreToolUse",
          handler: { type: "rule", action: "block" },
        }),
      })

      expect(response.status).toBe(401)
    })
  })

  describe("Authorization - Organization membership", () => {
    it("should return 404 when namespace does not exist", async () => {
      mockGetNamespaceWithAccess.mockImplementation(() => {
        const error = new Error("Namespace not found")
        ;(error as Error & { statusCode: number }).statusCode = 404
        throw error
      })

      const { default: namespaces } = await import("../../routes/namespaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/namespaces", namespaces)

      const response = await app.request("/api/namespaces/ns_nonexistent/hooks")

      expect(response.status).toBe(404)
    })

    it("should return 403 when user is not a member of the organization", async () => {
      mockGetNamespaceWithAccess.mockImplementation(() => {
        const error = new Error("You do not have access to this namespace")
        ;(error as Error & { statusCode: number }).statusCode = 403
        throw error
      })

      const { default: namespaces } = await import("../../routes/namespaces")
      const app = new Hono()
      app.onError(testErrorHandler)
      app.route("/api/namespaces", namespaces)

      const response = await app.request("/api/namespaces/ns_123/hooks")

      expect(response.status).toBe(403)
    })
  })
})
