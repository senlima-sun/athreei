/**
 * MCP Server routes
 *
 * CRUD API for MCP Server registry management.
 * Supports listing public registry servers and organization's private servers.
 */

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

// Apply auth middleware to all MCP server routes
mcpServers.use("*", authMiddleware)

// =============================================================================
// Helper Functions
// =============================================================================

function now(): Date {
  return new Date()
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/mcp-servers
 * List available MCP servers (org's private servers)
 *
 * Query params:
 * - organizationId: Required - filter by organization
 * - status: Filter by status (active, inactive, pending)
 * - transport: Filter by transport type (stdio, sse, streamable-http)
 * - search: Search by name or description
 * - limit: Max results (default 20, max 100)
 * - offset: Pagination offset (default 0)
 */
mcpServers.get("/", zValidator("query", listQuerySchema), async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const { status, transport, search, limit, offset, organizationId } =
    c.req.valid("query")

  // Verify user is a member of the organization
  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  // Build the query conditions
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

  // Execute query with filters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const servers = await (db as any)
    .select()
    .from(mcpServer)
    .where(and(...conditions))
    .limit(limit)
    .offset(offset)
    .orderBy(mcpServer.createdAt)

  // Get total count for pagination
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

/**
 * GET /api/mcp-servers/:id
 * Get MCP server details including its tools
 */
mcpServers.get("/:id", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const serverId = c.req.param("id")

  // Fetch server
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server = await (db as any).query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!server) {
    throw ApiError.notFound("MCP server not found")
  }

  // Verify user has access to the organization
  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    server.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this server")
  }

  // Fetch associated tools
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools = await (db as any).query.mcpTool.findMany({
    where: eq(mcpTool.serverId, serverId),
  })

  // Extract env var keys (not values) if encrypted env exists
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

/**
 * GET /api/mcp-servers/:id/env
 * Get decrypted environment variables for an MCP server
 * Used by gateway-cloud to fetch credentials for server connections
 *
 * Security features:
 * - Rate limited: 10 requests per minute per user+server
 * - Audit logged: All access attempts are logged to stderr
 */
mcpServers.get("/:id/env", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const serverId = c.req.param("id")

  // Rate limiting - check BEFORE credential access
  const rateLimitKey = `${auth.userId}:${serverId}`
  const rateLimitResult = checkEnvRateLimit(rateLimitKey)

  // Set rate limit headers
  setEnvRateLimitHeaders(c, rateLimitResult)

  if (!rateLimitResult.allowed) {
    // Log rate limit violation
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

  // Fetch server
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server = await (db as any).query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!server) {
    // Log failed access attempt (server not found)
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
    // Log failed access attempt (unauthorized)
    logEnvAccess({
      serverId,
      userId: auth.userId,
      organizationId: server.organizationId,
      success: false,
      reason: "unauthorized",
    })
    throw ApiError.notFound("MCP server not found")
  }

  // Check if server has encrypted env vars
  if (!server.encryptedEnv) {
    // Log successful access (no env vars to return)
    logEnvAccess({
      serverId,
      userId: auth.userId,
      organizationId: server.organizationId,
      success: true,
      reason: "no_env_vars",
    })
    return c.json({ env: {} })
  }

  // Verify encryption is configured
  if (!isEncryptionConfigured()) {
    // Log failed access attempt (encryption not configured)
    logEnvAccess({
      serverId,
      userId: auth.userId,
      organizationId: server.organizationId,
      success: false,
      reason: "encryption_not_configured",
    })
    throw ApiError.badRequest("Encryption is not configured")
  }

  // Decrypt and return env vars
  try {
    const env = decryptEnv(server.encryptedEnv)

    // Log successful access - DO NOT log actual env values!
    logEnvAccess({
      serverId,
      userId: auth.userId,
      organizationId: server.organizationId,
      success: true,
    })

    return c.json({ env })
  } catch {
    // Log failed access attempt (decryption error)
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

/**
 * POST /api/mcp-servers
 * Create a new custom MCP server (private to organization)
 */
mcpServers.post("/", zValidator("json", createServerSchema), async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const body = c.req.valid("json")

  // Get organizationId from query parameter
  const organizationId = c.req.query("organizationId")

  if (!organizationId) {
    throw ApiError.badRequest("organizationId query parameter is required")
  }

  // Verify user is a member of the organization
  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  // Validate transport-specific fields
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

  // Handle environment variable encryption
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

  // Verify user has access to the organization
  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    existing.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this server")
  }

  // Validate transport-specific fields if transport is being updated
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

  // Build update object, excluding undefined values
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

  // Handle environment variable updates
  if (updates.env !== undefined) {
    if (updates.env === null) {
      // Clear env vars
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

  // Fetch updated server
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await (db as any).query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  // Extract env var keys (not values) for response
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

  // Remove sensitive fields from response
  const {
    encryptedEnv: _encryptedEnv,
    envKeyVersion: _envKeyVersion,
    ...serverData
  } = updated

  return c.json({ ...serverData, envKeys })
})

/**
 * DELETE /api/mcp-servers/:id
 * Delete an MCP server
 */
mcpServers.delete("/:id", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const serverId = c.req.param("id")

  // Verify server exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (db as any).query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!existing) {
    throw ApiError.notFound("MCP server not found")
  }

  // Verify user has access to the organization
  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    existing.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this server")
  }

  // Delete server (tools will be cascade deleted via foreign key)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).delete(mcpServer).where(eq(mcpServer.id, serverId))

  return c.json({ message: "MCP server deleted successfully" })
})

/**
 * GET /api/mcp-servers/:id/tools
 * List all tools for an MCP server
 */
mcpServers.get("/:id/tools", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const serverId = c.req.param("id")

  // Verify server exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server = await (db as any).query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!server) {
    throw ApiError.notFound("MCP server not found")
  }

  // Verify user has access to the organization
  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    server.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this server")
  }

  // Fetch tools
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools = await (db as any).query.mcpTool.findMany({
    where: eq(mcpTool.serverId, serverId),
  })

  return c.json({
    data: tools,
    total: tools.length,
  })
})

// =============================================================================
// Verification Constants
// =============================================================================

/** Rate limit for verify endpoint: 20 requests per minute */
const VERIFY_RATE_LIMIT = 20
const VERIFY_RATE_WINDOW_MS = 60_000

/** Connection timeout for MCP server verification */
const VERIFY_TIMEOUT_MS = 10_000

/**
 * POST /api/mcp-servers/verify
 * Test MCP server connection with provided auth token
 *
 * Security features:
 * - Rate limited: 20 requests per minute per user
 * - Authentication required
 * - 10 second timeout
 */
mcpServers.post(
  "/verify",
  zValidator("json", verifyMcpServerSchema),
  async (c) => {
    const auth = getAuthContext(c)
    const { serverUrl, authToken } = c.req.valid("json")

    // Rate limiting - check before making external connection
    const rateLimitKey = `verify:${auth.userId}`
    const rateLimitInfo = checkRateLimit(
      rateLimitKey,
      VERIFY_RATE_LIMIT,
      VERIFY_RATE_WINDOW_MS
    )

    // Set rate limit headers
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

    // Create MCP client and attempt connection
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
      // Create SSE transport with auth token
      transport = new SSEClientTransport(new URL(serverUrl), {
        requestInit: {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      })

      // Connect with timeout
      const connectPromise = client.connect(transport)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Connection timeout after 10 seconds")),
          VERIFY_TIMEOUT_MS
        )
      })

      await Promise.race([connectPromise, timeoutPromise])

      // List tools with timeout
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

      // Extract tool names
      const toolNames = tools.map((tool: { name: string }) => tool.name)

      // Close the connection
      await client.close()

      return c.json({
        success: true,
        tools: toolNames,
        toolCount: toolNames.length,
      })
    } catch (error) {
      // Ensure cleanup on error
      try {
        await client.close()
      } catch {
        // Ignore cleanup errors
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error)

      // Provide user-friendly error messages
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
