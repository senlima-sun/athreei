import type { Context } from "hono"
import { eq, and, or, like, sql } from "drizzle-orm"
import { getAuthContext, ApiError } from "../../middleware"
import { db } from "../../lib/db-operations"
import { mcpServer, mcpTool } from "@athreei/db"
import {
  encryptEnv,
  decryptEnv,
  getCurrentKeyVersion,
  isEncryptionConfigured,
} from "../../lib/encryption"
import {
  verifyOrganizationMembership,
  generateUUID,
  checkEnvRateLimit,
  setEnvRateLimitHeaders,
  logEnvAccess,
  logRateLimitViolation,
} from "../../services"
import type {
  ListServersQuery,
  CreateServerInput,
  UpdateServerInput,
} from "../../schemas/mcp-servers"

function now(): Date {
  return new Date()
}

export async function listServers(c: Context): Promise<Response> {
  const auth = getAuthContext(c)
  const { status, transport, search, limit, offset, organizationId } = (
    c.req as unknown as { valid: (target: "query") => ListServersQuery }
  ).valid("query")

  const isMember = await verifyOrganizationMembership(
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

  const servers = await db()
    .select()
    .from(mcpServer)
    .where(and(...conditions))
    .limit(limit)
    .offset(offset)
    .orderBy(mcpServer.createdAt)

  const countResult = await db()
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
}

export async function getServer(c: Context): Promise<Response> {
  const auth = getAuthContext(c)
  const serverId = c.req.param("id")

  const server = await db().query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!server) {
    throw ApiError.notFound("MCP server not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    server.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this server")
  }

  const tools = await db().query.mcpTool.findMany({
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
}

export async function createServer(c: Context): Promise<Response> {
  const auth = getAuthContext(c)
  const body = (
    c.req as unknown as { valid: (target: "json") => CreateServerInput }
  ).valid("json")

  const organizationId = c.req.query("organizationId")

  if (!organizationId) {
    throw ApiError.badRequest("organizationId query parameter is required")
  }

  const isMember = await verifyOrganizationMembership(
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

  await db().insert(mcpServer).values(newServer)

  const {
    encryptedEnv: _enc,
    envKeyVersion: _ver,
    ...responseServer
  } = newServer
  const envKeys = body.env ? Object.keys(body.env) : []

  return c.json({ ...responseServer, envKeys }, 201)
}

export async function updateServer(c: Context): Promise<Response> {
  const auth = getAuthContext(c)
  const serverId = c.req.param("id")
  const updates = (
    c.req as unknown as { valid: (target: "json") => UpdateServerInput }
  ).valid("json")

  const existing = await db().query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!existing) {
    throw ApiError.notFound("MCP server not found")
  }

  const isMember = await verifyOrganizationMembership(
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

  await db().update(mcpServer).set(updateData).where(eq(mcpServer.id, serverId))

  const updated = await db().query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!updated) {
    throw ApiError.notFound("MCP server not found after update")
  }

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
}

export async function deleteServer(c: Context): Promise<Response> {
  const auth = getAuthContext(c)
  const serverId = c.req.param("id")

  const existing = await db().query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!existing) {
    throw ApiError.notFound("MCP server not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    existing.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this server")
  }

  await db().delete(mcpServer).where(eq(mcpServer.id, serverId))

  return c.json({ message: "MCP server deleted successfully" })
}

export async function getServerEnv(c: Context): Promise<Response> {
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

  const server = await db().query.mcpServer.findFirst({
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

  const isMember = await verifyOrganizationMembership(
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
}
