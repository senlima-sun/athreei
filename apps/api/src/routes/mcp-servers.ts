/**
 * MCP Server routes
 *
 * CRUD API for MCP Server registry management.
 * Supports listing public registry servers and organization's private servers.
 */

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { eq, and, or, like, sql } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { getDb, type DatabaseClient } from "../lib/db"
import { mcpServer, mcpTool, member } from "@athreei/db"
import {
  encryptEnv,
  decryptEnv,
  getCurrentKeyVersion,
  isEncryptionConfigured,
} from "../lib/encryption"

// =============================================================================
// Rate Limiting for Env Endpoint
// =============================================================================

/**
 * In-memory rate limiter for env variable access.
 * Stricter than general API rate limiting since this endpoint returns credentials.
 */
const envAccessLimiter = new Map<
  string,
  { count: number; resetAt: number; violations: number }
>()
const ENV_RATE_LIMIT = {
  maxRequests: 10, // 10 requests per minute
  windowMs: 60_000,
  cleanupIntervalMs: 300_000, // 5 minutes
}

let lastEnvLimiterCleanup = Date.now()

/**
 * Clean up expired rate limit entries
 */
function cleanupEnvRateLimiter(): void {
  const now = Date.now()
  for (const [key, entry] of envAccessLimiter.entries()) {
    if (now > entry.resetAt) {
      envAccessLimiter.delete(key)
    }
  }
  lastEnvLimiterCleanup = now
}

/**
 * Check rate limit for env access
 * Returns true if request is allowed, false if rate limited
 */
function checkEnvRateLimit(key: string): {
  allowed: boolean
  remaining: number
  resetIn: number
} {
  const now = Date.now()

  // Periodic cleanup
  if (now - lastEnvLimiterCleanup > ENV_RATE_LIMIT.cleanupIntervalMs) {
    cleanupEnvRateLimiter()
  }

  const entry = envAccessLimiter.get(key)

  // No entry or expired window - create new entry
  if (!entry || now > entry.resetAt) {
    envAccessLimiter.set(key, {
      count: 1,
      resetAt: now + ENV_RATE_LIMIT.windowMs,
      violations: entry?.violations ?? 0,
    })
    return {
      allowed: true,
      remaining: ENV_RATE_LIMIT.maxRequests - 1,
      resetIn: ENV_RATE_LIMIT.windowMs,
    }
  }

  // Check if limit exceeded
  if (entry.count >= ENV_RATE_LIMIT.maxRequests) {
    entry.violations++
    return {
      allowed: false,
      remaining: 0,
      resetIn: entry.resetAt - now,
    }
  }

  // Increment count
  entry.count++
  return {
    allowed: true,
    remaining: ENV_RATE_LIMIT.maxRequests - entry.count,
    resetIn: entry.resetAt - now,
  }
}

// =============================================================================
// Audit Logging
// =============================================================================

interface EnvAccessAuditEvent {
  event: "env_access"
  serverId: string
  userId: string
  organizationId: string
  timestamp: string
  success: boolean
  reason?: string
}

interface RateLimitViolationEvent {
  event: "rate_limit_violation"
  endpoint: "env_access"
  userId: string
  serverId: string
  timestamp: string
  rateLimitKey: string
}

/**
 * Log audit event to stderr as structured JSON
 * DO NOT log actual env values!
 */
function logAuditEvent(
  event: EnvAccessAuditEvent | RateLimitViolationEvent
): void {
  console.error(JSON.stringify(event))
}

const mcpServers = new Hono()

// Apply auth middleware to all MCP server routes
mcpServers.use("*", authMiddleware)

// =============================================================================
// Validation Schemas
// =============================================================================

const transportTypes = ["stdio", "sse", "streamable-http"] as const
const statusTypes = ["active", "inactive", "pending"] as const

const createServerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
  transport: z.enum(transportTypes, {
    errorMap: () => ({ message: "Invalid transport type" }),
  }),
  command: z.string().max(500).optional(),
  args: z.string().max(1000).optional(),
  url: z.string().url("Invalid URL").optional(),
  version: z.string().max(50).optional(),
  capabilities: z.string().max(5000).optional(),
  env: z.record(z.string()).optional(),
})

const updateServerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  transport: z
    .enum(transportTypes, {
      errorMap: () => ({ message: "Invalid transport type" }),
    })
    .optional(),
  command: z.string().max(500).nullable().optional(),
  args: z.string().max(1000).nullable().optional(),
  url: z.string().url("Invalid URL").nullable().optional(),
  status: z
    .enum(statusTypes, {
      errorMap: () => ({ message: "Invalid status" }),
    })
    .optional(),
  version: z.string().max(50).nullable().optional(),
  capabilities: z.string().max(5000).nullable().optional(),
  env: z.record(z.string()).nullable().optional(),
})

const listQuerySchema = z.object({
  status: z.enum(statusTypes).optional(),
  transport: z.enum(transportTypes).optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  organizationId: z.string().min(1, "Organization ID is required"),
})

// =============================================================================
// Helper Functions
// =============================================================================

function generateId(): string {
  return crypto.randomUUID()
}

function now(): Date {
  return new Date()
}

/**
 * Check if user is a member of the organization
 */
async function verifyOrganizationMembership(
  db: DatabaseClient,
  userId: string,
  organizationId: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membership = await (db as any).query.member.findFirst({
    where: and(
      eq(member.userId, userId),
      eq(member.organizationId, organizationId)
    ),
  })
  return !!membership
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
  const timestamp = new Date().toISOString()

  // Rate limiting - check BEFORE credential access
  const rateLimitKey = `${auth.userId}:${serverId}`
  const rateLimitResult = checkEnvRateLimit(rateLimitKey)

  // Set rate limit headers
  c.header("X-RateLimit-Limit", String(ENV_RATE_LIMIT.maxRequests))
  c.header("X-RateLimit-Remaining", String(rateLimitResult.remaining))
  c.header(
    "X-RateLimit-Reset",
    String(Math.ceil((Date.now() + rateLimitResult.resetIn) / 1000))
  )

  if (!rateLimitResult.allowed) {
    // Log rate limit violation
    logAuditEvent({
      event: "rate_limit_violation",
      endpoint: "env_access",
      userId: auth.userId,
      serverId,
      timestamp,
      rateLimitKey,
    })

    c.header("Retry-After", String(Math.ceil(rateLimitResult.resetIn / 1000)))
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
    logAuditEvent({
      event: "env_access",
      serverId,
      userId: auth.userId,
      organizationId: "unknown",
      timestamp,
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
    logAuditEvent({
      event: "env_access",
      serverId,
      userId: auth.userId,
      organizationId: server.organizationId,
      timestamp,
      success: false,
      reason: "unauthorized",
    })
    throw ApiError.notFound("MCP server not found")
  }

  // Check if server has encrypted env vars
  if (!server.encryptedEnv) {
    // Log successful access (no env vars to return)
    logAuditEvent({
      event: "env_access",
      serverId,
      userId: auth.userId,
      organizationId: server.organizationId,
      timestamp,
      success: true,
      reason: "no_env_vars",
    })
    return c.json({ env: {} })
  }

  // Verify encryption is configured
  if (!isEncryptionConfigured()) {
    // Log failed access attempt (encryption not configured)
    logAuditEvent({
      event: "env_access",
      serverId,
      userId: auth.userId,
      organizationId: server.organizationId,
      timestamp,
      success: false,
      reason: "encryption_not_configured",
    })
    throw ApiError.badRequest("Encryption is not configured")
  }

  // Decrypt and return env vars
  try {
    const env = decryptEnv(server.encryptedEnv)

    // Log successful access - DO NOT log actual env values!
    logAuditEvent({
      event: "env_access",
      serverId,
      userId: auth.userId,
      organizationId: server.organizationId,
      timestamp,
      success: true,
    })

    return c.json({ env })
  } catch {
    // Log failed access attempt (decryption error)
    logAuditEvent({
      event: "env_access",
      serverId,
      userId: auth.userId,
      organizationId: server.organizationId,
      timestamp,
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
  const id = generateId()

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

export default mcpServers
