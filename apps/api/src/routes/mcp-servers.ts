import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq, and, or, like, sql } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { getDb } from "../lib/db"
import { mcpServer, mcpTool } from "@athreei/db"
import {
  encryptEnv,
  decryptEnv,
  getCurrentKeyVersion,
  isEncryptionConfigured,
} from "../lib/encryption"

// Schemas
import {
  createServerSchema,
  updateServerSchema,
  listQuerySchema,
  verifyMcpServerSchema,
  batchHealthCheckSchema,
  updateToolSchema,
} from "../schemas/mcp-servers"

// MCP SDK
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"

// Rate limiting
import { checkRateLimit } from "../middleware/rate-limit"

// Services
import {
  verifyOrganizationMembership,
  generateUUID,
  checkEnvRateLimit,
  setEnvRateLimitHeaders,
  logEnvAccess,
  logRateLimitViolation,
} from "../services"

const mcpServers = new Hono()

mcpServers.use("*", authMiddleware)

function now(): Date {
  return new Date()
}

mcpServers.get("/", zValidator("query", listQuerySchema), async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const { status, transport, search, limit, offset, organizationId } =
    c.req.valid("query")

  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  const conditions = [eq(mcpServer.organizationId, organizationId)]

  if (status) {
    conditions.push(eq(mcpServer.status, status))
  }

  if (transport) {
    conditions.push(eq(mcpServer.transport, transport))
  }

  if (search) {
    const searchPattern = "%" + search + "%"
    conditions.push(
      or(
        like(mcpServer.name, searchPattern),
        like(mcpServer.description, searchPattern)
      )!
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const servers = await (db as any)
    .select()
    .from(mcpServer)
    .where(and(...conditions))
    .limit(limit)
    .offset(offset)
    .orderBy(mcpServer.createdAt)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countResult = await (db as any)
    .select({ count: sql<number>`count(*)` })
    .from(mcpServer)
    .where(and(...conditions))

  const total = Number(countResult[0]?.count ?? 0)

  return c.json({
    data: servers,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + servers.length < total,
    },
  })
})

mcpServers.get("/:id", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const serverId = c.req.param("id")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server = await (db as any).query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!server) {
    throw ApiError.notFound("MCP server not found")
  }

  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    server.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this server")
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools = await (db as any).query.mcpTool.findMany({
    where: eq(mcpTool.serverId, serverId),
  })

  let envKeys: string[] = []
  if (server.encryptedEnv && isEncryptionConfigured()) {
    try {
      const decrypted = decryptEnv(server.encryptedEnv)
      envKeys = Object.keys(decrypted)
    } catch (error) {
      console.error(
        `Failed to decrypt env keys for server ${serverId}:`,
        error instanceof Error ? error.message : String(error)
      )
      envKeys = []
    }
  }

  // Remove sensitive fields from response
  const {
    encryptedEnv: _encryptedEnv,
    envKeyVersion: _envKeyVersion,
    ...serverData
  } = server

  return c.json({
    ...serverData,
    envKeys,
    tools,
  })
})

mcpServers.get("/:id/env", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const serverId = c.req.param("id")

  const rateLimitKey = `${auth.userId}:${serverId}`
  const rateLimitResult = checkEnvRateLimit(rateLimitKey)

  setEnvRateLimitHeaders(c, rateLimitResult)

  if (!rateLimitResult.allowed) {
    logRateLimitViolation({
      endpoint: "env_access",
      userId: auth.userId,
      serverId,
      rateLimitKey,
    })

    return c.json(
      {
        error: "Rate limit exceeded",
        message: `Too many credential access requests. Try again in ${Math.ceil(rateLimitResult.resetIn / 1000)} seconds.`,
        retryAfter: Math.ceil(rateLimitResult.resetIn / 1000),
      },
      429
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server = await (db as any).query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!server) {
    logEnvAccess({
      serverId,
      userId: auth.userId,
      organizationId: "unknown",
      success: false,
      reason: "server_not_found",
    })
    throw ApiError.notFound("MCP server not found")
  }

  // Verify user has access to the organization
  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    server.organizationId
  )
  if (!isMember) {
    logEnvAccess({
      serverId,
      userId: auth.userId,
      organizationId: server.organizationId,
      success: false,
      reason: "unauthorized",
    })
    throw ApiError.notFound("MCP server not found")
  }

  if (!server.encryptedEnv) {
    logEnvAccess({
      serverId,
      userId: auth.userId,
      organizationId: server.organizationId,
      success: true,
      reason: "no_env_vars",
    })
    return c.json({ env: {} })
  }

  if (!isEncryptionConfigured()) {
    logEnvAccess({
      serverId,
      userId: auth.userId,
      organizationId: server.organizationId,
      success: false,
      reason: "encryption_not_configured",
    })
    throw ApiError.badRequest("Encryption is not configured")
  }

  try {
    const env = decryptEnv(server.encryptedEnv)

    logEnvAccess({
      serverId,
      userId: auth.userId,
      organizationId: server.organizationId,
      success: true,
    })

    return c.json({ env })
  } catch {
    logEnvAccess({
      serverId,
      userId: auth.userId,
      organizationId: server.organizationId,
      success: false,
      reason: "decryption_failed",
    })
    throw ApiError.badRequest("Failed to decrypt environment variables")
  }
})

mcpServers.post("/", zValidator("json", createServerSchema), async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const body = c.req.valid("json")

  const organizationId = c.req.query("organizationId")

  if (!organizationId) {
    throw ApiError.badRequest("organizationId query parameter is required")
  }

  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  if (body.transport === "stdio" && !body.command) {
    throw ApiError.badRequest("Command is required for stdio transport")
  }

  if (
    (body.transport === "sse" || body.transport === "streamable-http") &&
    !body.url
  ) {
    throw ApiError.badRequest("URL is required for SSE/HTTP transport")
  }

  const timestamp = now()
  const id = generateUUID()

  let encryptedEnv: string | null = null
  let envKeyVersion: number | null = null

  if (body.env && Object.keys(body.env).length > 0) {
    if (!isEncryptionConfigured()) {
      throw ApiError.badRequest(
        "Environment variables cannot be stored: encryption is not configured"
      )
    }
    encryptedEnv = encryptEnv(body.env)
    envKeyVersion = getCurrentKeyVersion()
  }

  const newServer = {
    id,
    organizationId,
    name: body.name,
    description: body.description ?? null,
    transport: body.transport,
    command: body.command ?? null,
    args: body.args ?? null,
    url: body.url ?? null,
    status: "active" as const,
    version: body.version ?? null,
    capabilities: body.capabilities ?? null,
    encryptedEnv,
    envKeyVersion,
    lastSeenAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).insert(mcpServer).values(newServer)

  // Return response without sensitive encrypted data
  const {
    encryptedEnv: _enc,
    envKeyVersion: _ver,
    ...responseServer
  } = newServer
  const envKeys = body.env ? Object.keys(body.env) : []

  return c.json({ ...responseServer, envKeys }, 201)
})

/**
 * PATCH /api/mcp-servers/:id
 * Update an MCP server
 */
mcpServers.patch("/:id", zValidator("json", updateServerSchema), async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const serverId = c.req.param("id")
  const updates = c.req.valid("json")

  // Verify server exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (db as any).query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!existing) {
    throw ApiError.notFound("MCP server not found")
  }

  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    existing.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this server")
  }

  const transport = updates.transport ?? existing.transport
  const command =
    updates.command !== undefined ? updates.command : existing.command
  const url = updates.url !== undefined ? updates.url : existing.url

  if (transport === "stdio" && !command) {
    throw ApiError.badRequest("Command is required for stdio transport")
  }

  if ((transport === "sse" || transport === "streamable-http") && !url) {
    throw ApiError.badRequest("URL is required for SSE/HTTP transport")
  }

  const updateData: Record<string, unknown> = {
    updatedAt: now(),
  }

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.description !== undefined)
    updateData.description = updates.description
  if (updates.transport !== undefined) updateData.transport = updates.transport
  if (updates.command !== undefined) updateData.command = updates.command
  if (updates.args !== undefined) updateData.args = updates.args
  if (updates.url !== undefined) updateData.url = updates.url
  if (updates.status !== undefined) updateData.status = updates.status
  if (updates.version !== undefined) updateData.version = updates.version
  if (updates.capabilities !== undefined)
    updateData.capabilities = updates.capabilities

  if (updates.env !== undefined) {
    if (updates.env === null) {
      updateData.encryptedEnv = null
      updateData.envKeyVersion = null
    } else if (Object.keys(updates.env).length > 0) {
      if (!isEncryptionConfigured()) {
        throw ApiError.badRequest(
          "Environment variables cannot be stored: encryption is not configured"
        )
      }
      updateData.encryptedEnv = encryptEnv(updates.env)
      updateData.envKeyVersion = getCurrentKeyVersion()
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .update(mcpServer)
    .set(updateData)
    .where(eq(mcpServer.id, serverId))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await (db as any).query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  let envKeys: string[] = []
  if (updated.encryptedEnv && isEncryptionConfigured()) {
    try {
      const decrypted = decryptEnv(updated.encryptedEnv)
      envKeys = Object.keys(decrypted)
    } catch (error) {
      console.error(
        `Failed to decrypt env keys for server ${serverId}:`,
        error instanceof Error ? error.message : String(error)
      )
      envKeys = []
    }
  }

  const {
    encryptedEnv: _encryptedEnv,
    envKeyVersion: _envKeyVersion,
    ...serverData
  } = updated

  return c.json({ ...serverData, envKeys })
})

mcpServers.delete("/:id", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const serverId = c.req.param("id")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (db as any).query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!existing) {
    throw ApiError.notFound("MCP server not found")
  }

  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    existing.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this server")
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).delete(mcpServer).where(eq(mcpServer.id, serverId))

  return c.json({ message: "MCP server deleted successfully" })
})

mcpServers.get("/:id/tools", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const serverId = c.req.param("id")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server = await (db as any).query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!server) {
    throw ApiError.notFound("MCP server not found")
  }

  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    server.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this server")
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools = await (db as any).query.mcpTool.findMany({
    where: eq(mcpTool.serverId, serverId),
  })

  return c.json({
    data: tools,
    total: tools.length,
  })
})

const HEALTH_CHECK_TIMEOUT_MS = 5_000
const BATCH_HEALTH_RATE_LIMIT = 1
const BATCH_HEALTH_RATE_WINDOW_MS = 60_000

type HealthStatus = {
  status: "healthy" | "unhealthy"
  latency?: number
  lastSeen?: string
  error?: string
}

async function performHealthCheck(
  server: {
    id: string
    url: string | null
    transport: string
    encryptedEnv?: string | null
  },
  db: ReturnType<typeof getDb>
): Promise<HealthStatus> {
  if (server.transport !== "sse" || !server.url) {
    return {
      status: "unhealthy",
      error: `Health check not supported for ${server.transport} transport`,
    }
  }

  const startTime = Date.now()
  const client = new Client(
    {
      name: "athreei-health-check",
      version: "0.1.0",
    },
    {
      capabilities: {},
    }
  )

  let transport: SSEClientTransport | null = null

  try {
    // Get auth token if server has encrypted env
    let authHeaders: Record<string, string> = {}
    if (server.encryptedEnv && isEncryptionConfigured()) {
      try {
        const env = decryptEnv(server.encryptedEnv)
        if (env.AUTH_TOKEN || env.AUTHORIZATION) {
          authHeaders = {
            Authorization: `Bearer ${env.AUTH_TOKEN || env.AUTHORIZATION}`,
          }
        }
      } catch {
        // Continue without auth if decryption fails
      }
    }

    // Create SSE transport
    transport = new SSEClientTransport(new URL(server.url), {
      requestInit: {
        headers: authHeaders,
      },
    })

    // Connect with timeout
    const connectPromise = client.connect(transport)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Connection timeout")),
        HEALTH_CHECK_TIMEOUT_MS
      )
    })

    await Promise.race([connectPromise, timeoutPromise])

    const listToolsPromise = client.listTools()
    const listToolsTimeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("List tools timeout")),
        HEALTH_CHECK_TIMEOUT_MS
      )
    })

    await Promise.race([listToolsPromise, listToolsTimeout])

    const latency = Date.now() - startTime

    const timestamp = new Date()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .update(mcpServer)
      .set({ lastSeenAt: timestamp, updatedAt: timestamp })
      .where(eq(mcpServer.id, server.id))

    await client.close()

    return {
      status: "healthy",
      latency,
      lastSeen: timestamp.toISOString(),
    }
  } catch (error) {
    try {
      await client.close()
    } catch {}

    const errorMessage = error instanceof Error ? error.message : String(error)

    let friendlyError = errorMessage
    if (errorMessage.includes("timeout")) {
      friendlyError = "Connection timeout"
    } else if (
      errorMessage.includes("401") ||
      errorMessage.includes("Unauthorized")
    ) {
      friendlyError = "Authentication failed"
    } else if (
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ENOTFOUND")
    ) {
      friendlyError = "Server unreachable"
    }

    return {
      status: "unhealthy",
      error: friendlyError,
    }
  }
}

mcpServers.get("/:id/health", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const serverId = c.req.param("id")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server = await (db as any).query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!server) {
    throw ApiError.notFound("MCP server not found")
  }

  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    server.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this server")
  }

  const health = await performHealthCheck(server, db)

  return c.json(health)
})

mcpServers.post(
  "/health-check",
  zValidator("json", batchHealthCheckSchema),
  async (c) => {
    const db = getDb()
    const auth = getAuthContext(c)
    const { serverIds } = c.req.valid("json")

    const rateLimitKey = `batch-health:${auth.userId}`
    const rateLimitInfo = checkRateLimit(
      rateLimitKey,
      BATCH_HEALTH_RATE_LIMIT,
      BATCH_HEALTH_RATE_WINDOW_MS
    )

    c.header("X-RateLimit-Limit", String(BATCH_HEALTH_RATE_LIMIT))
    c.header(
      "X-RateLimit-Remaining",
      String(Math.max(0, BATCH_HEALTH_RATE_LIMIT - rateLimitInfo.current))
    )
    c.header(
      "X-RateLimit-Reset",
      String(Math.ceil((Date.now() + rateLimitInfo.resetIn) / 1000))
    )

    if (rateLimitInfo.limited) {
      c.header("Retry-After", String(Math.ceil(rateLimitInfo.resetIn / 1000)))
      return c.json(
        {
          error: "Rate limit exceeded",
          message: `Batch health check limited to ${BATCH_HEALTH_RATE_LIMIT} request per minute. Try again in ${Math.ceil(rateLimitInfo.resetIn / 1000)} seconds.`,
          retryAfter: Math.ceil(rateLimitInfo.resetIn / 1000),
        },
        429
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const servers = await (db as any).query.mcpServer.findMany({
      where: sql`${mcpServer.id} IN (${sql.join(
        serverIds.map((id) => sql`${id}`),
        sql`, `
      )})`,
    })

    const accessibleServers: typeof servers = []
    for (const server of servers) {
      const isMember = await verifyOrganizationMembership(
        db,
        auth.userId,
        server.organizationId
      )
      if (isMember) {
        accessibleServers.push(server)
      }
    }

    const healthChecks = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accessibleServers.map(async (server: any) => {
        const health = await performHealthCheck(server, db)
        return { serverId: server.id, health }
      })
    )

    const results: Record<string, HealthStatus> = {}
    for (const { serverId, health } of healthChecks) {
      results[serverId] = health
    }

    for (const requestedId of serverIds) {
      if (!results[requestedId]) {
        results[requestedId] = {
          status: "unhealthy",
          error: "Server not found or access denied",
        }
      }
    }

    return c.json({ results })
  }
)

mcpServers.post("/:id/tools/refresh", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const serverId = c.req.param("id")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server = await (db as any).query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!server) {
    throw ApiError.notFound("MCP server not found")
  }

  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    server.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this server")
  }

  if (server.transport !== "sse" || !server.url) {
    throw ApiError.badRequest(
      `Tool refresh not supported for ${server.transport} transport`
    )
  }

  const client = new Client(
    {
      name: "athreei-tool-refresh",
      version: "0.1.0",
    },
    {
      capabilities: {},
    }
  )

  let transport: SSEClientTransport | null = null

  try {
    // Get auth token if server has encrypted env
    let authHeaders: Record<string, string> = {}
    if (server.encryptedEnv && isEncryptionConfigured()) {
      try {
        const env = decryptEnv(server.encryptedEnv)
        if (env.AUTH_TOKEN || env.AUTHORIZATION) {
          authHeaders = {
            Authorization: `Bearer ${env.AUTH_TOKEN || env.AUTHORIZATION}`,
          }
        }
      } catch {
        // Continue without auth if decryption fails
      }
    }

    // Create SSE transport
    transport = new SSEClientTransport(new URL(server.url), {
      requestInit: {
        headers: authHeaders,
      },
    })

    const connectPromise = client.connect(transport)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Connection timeout after 10 seconds")),
        10_000
      )
    })

    await Promise.race([connectPromise, timeoutPromise])

    const listToolsPromise = client.listTools()
    const listToolsTimeout = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("List tools timeout after 10 seconds")),
        10_000
      )
    })

    const toolsResponse = await Promise.race([
      listToolsPromise,
      listToolsTimeout,
    ])
    const fetchedTools = toolsResponse.tools || []

    await client.close()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingTools = await (db as any).query.mcpTool.findMany({
      where: eq(mcpTool.serverId, serverId),
    })

    const existingOverrides = new Map<
      string,
      {
        customDescription: string | null
        customPrompt: string | null
        isEnabled: string
      }
    >()
    for (const tool of existingTools) {
      existingOverrides.set(tool.name, {
        customDescription: tool.customDescription,
        customPrompt: tool.customPrompt,
        isEnabled: tool.isEnabled,
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).delete(mcpTool).where(eq(mcpTool.serverId, serverId))

    const timestamp = now()
    const newTools = fetchedTools.map(
      (tool: { name: string; description?: string; inputSchema?: unknown }) => {
        const override = existingOverrides.get(tool.name)
        return {
          id: generateUUID(),
          serverId,
          name: tool.name,
          description: tool.description ?? null,
          inputSchema: tool.inputSchema
            ? JSON.stringify(tool.inputSchema)
            : null,
          customDescription: override?.customDescription ?? null,
          customPrompt: override?.customPrompt ?? null,
          isEnabled: override?.isEnabled ?? "true",
          createdAt: timestamp,
          updatedAt: timestamp,
        }
      }
    )

    if (newTools.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).insert(mcpTool).values(newTools)
    }

    // Update server lastSeenAt
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .update(mcpServer)
      .set({ lastSeenAt: timestamp, updatedAt: timestamp })
      .where(eq(mcpServer.id, serverId))

    return c.json({
      message: "Tools refreshed successfully",
      tools: newTools.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        customDescription: t.customDescription,
        isEnabled: t.isEnabled === "true",
      })),
      total: newTools.length,
    })
  } catch (error) {
    try {
      await client.close()
    } catch {}

    const errorMessage = error instanceof Error ? error.message : String(error)

    let friendlyError = errorMessage
    if (errorMessage.includes("timeout")) {
      friendlyError =
        "Connection timeout. The server may be unreachable or slow to respond."
    } else if (
      errorMessage.includes("401") ||
      errorMessage.includes("Unauthorized")
    ) {
      friendlyError = "Authentication failed. Please check your auth token."
    } else if (
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("ENOTFOUND")
    ) {
      friendlyError =
        "Could not connect to server. Please verify the URL and server status."
    }

    throw ApiError.badRequest(`Failed to refresh tools: ${friendlyError}`)
  }
})

mcpServers.patch(
  "/:id/tools/:toolName",
  zValidator("json", updateToolSchema),
  async (c) => {
    const db = getDb()
    const auth = getAuthContext(c)
    const serverId = c.req.param("id")
    const toolName = c.req.param("toolName")
    const updates = c.req.valid("json")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const server = await (db as any).query.mcpServer.findFirst({
      where: eq(mcpServer.id, serverId),
    })

    if (!server) {
      throw ApiError.notFound("MCP server not found")
    }

    const isMember = await verifyOrganizationMembership(
      db,
      auth.userId,
      server.organizationId
    )
    if (!isMember) {
      throw ApiError.forbidden("You do not have access to this server")
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tool = await (db as any).query.mcpTool.findFirst({
      where: and(eq(mcpTool.serverId, serverId), eq(mcpTool.name, toolName)),
    })

    if (!tool) {
      throw ApiError.notFound(`Tool '${toolName}' not found on this server`)
    }

    const updateData: Record<string, unknown> = {
      updatedAt: now(),
    }

    if (updates.description !== undefined) {
      updateData.customDescription = updates.description
    }

    if (updates.enabled !== undefined) {
      updateData.isEnabled = updates.enabled ? "true" : "false"
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .update(mcpTool)
      .set(updateData)
      .where(eq(mcpTool.id, tool.id))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await (db as any).query.mcpTool.findFirst({
      where: eq(mcpTool.id, tool.id),
    })

    return c.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      customDescription: updated.customDescription,
      inputSchema: updated.inputSchema ? JSON.parse(updated.inputSchema) : null,
      isEnabled: updated.isEnabled === "true",
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    })
  }
)

const VERIFY_RATE_LIMIT = 20
const VERIFY_RATE_WINDOW_MS = 60_000
const VERIFY_TIMEOUT_MS = 10_000

mcpServers.post(
  "/verify",
  zValidator("json", verifyMcpServerSchema),
  async (c) => {
    const auth = getAuthContext(c)
    const { serverUrl, authToken } = c.req.valid("json")

    const rateLimitKey = `verify:${auth.userId}`
    const rateLimitInfo = checkRateLimit(
      rateLimitKey,
      VERIFY_RATE_LIMIT,
      VERIFY_RATE_WINDOW_MS
    )

    c.header("X-RateLimit-Limit", String(VERIFY_RATE_LIMIT))
    c.header(
      "X-RateLimit-Remaining",
      String(Math.max(0, VERIFY_RATE_LIMIT - rateLimitInfo.current))
    )
    c.header(
      "X-RateLimit-Reset",
      String(Math.ceil((Date.now() + rateLimitInfo.resetIn) / 1000))
    )

    if (rateLimitInfo.limited) {
      c.header("Retry-After", String(Math.ceil(rateLimitInfo.resetIn / 1000)))
      return c.json(
        {
          success: false,
          error: `Rate limit exceeded. Try again in ${Math.ceil(rateLimitInfo.resetIn / 1000)} seconds.`,
        },
        429
      )
    }

    const client = new Client(
      {
        name: "athreei-verify",
        version: "0.1.0",
      },
      {
        capabilities: {},
      }
    )

    let transport: SSEClientTransport | null = null

    try {
      transport = new SSEClientTransport(new URL(serverUrl), {
        requestInit: {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      })

      const connectPromise = client.connect(transport)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Connection timeout after 10 seconds")),
          VERIFY_TIMEOUT_MS
        )
      })

      await Promise.race([connectPromise, timeoutPromise])

      const listToolsPromise = client.listTools()
      const listToolsTimeout = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Listing tools timeout after 10 seconds")),
          VERIFY_TIMEOUT_MS
        )
      })

      const toolsResponse = await Promise.race([
        listToolsPromise,
        listToolsTimeout,
      ])
      const tools = toolsResponse.tools || []

      const toolNames = tools.map((tool: { name: string }) => tool.name)

      await client.close()

      return c.json({
        success: true,
        tools: toolNames,
        toolCount: toolNames.length,
      })
    } catch (error) {
      try {
        await client.close()
      } catch {}

      const errorMessage =
        error instanceof Error ? error.message : String(error)

      let friendlyError = errorMessage
      if (errorMessage.includes("timeout")) {
        friendlyError =
          "Connection timeout. The server may be unreachable or slow to respond."
      } else if (
        errorMessage.includes("401") ||
        errorMessage.includes("Unauthorized")
      ) {
        friendlyError =
          "Authentication failed. Please check your auth token is correct."
      } else if (
        errorMessage.includes("403") ||
        errorMessage.includes("Forbidden")
      ) {
        friendlyError =
          "Access denied. Your auth token may not have the required permissions."
      } else if (
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("ENOTFOUND")
      ) {
        friendlyError =
          "Could not connect to server. Please verify the URL is correct and the server is running."
      } else if (errorMessage.includes("Invalid URL")) {
        friendlyError = "Invalid server URL format."
      }

      return c.json({
        success: false,
        error: friendlyError,
      })
    }
  }
)

export default mcpServers
