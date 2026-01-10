import type { Context } from "hono"
import { eq, sql } from "drizzle-orm"
import { getAuthContext, ApiError } from "../../middleware"
import { checkRateLimit } from "../../middleware/rate-limit"
import { db } from "../../lib/db-operations"
import { mcpServer } from "@athreei/db"
import { decryptEnv, isEncryptionConfigured } from "../../lib/encryption"
import { verifyOrganizationMembership } from "../../services"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js"
import type { BatchHealthCheckInput } from "../../schemas/mcp-servers"

const HEALTH_CHECK_TIMEOUT_MS = 5_000
const BATCH_HEALTH_RATE_LIMIT = 1
const BATCH_HEALTH_RATE_WINDOW_MS = 60_000

export type HealthStatus = {
  status: "healthy" | "unhealthy"
  latency?: number
  lastSeen?: string
  error?: string
}

export async function performHealthCheck(server: {
  id: string
  url: string | null
  transport: string
  encryptedEnv?: string | null
}): Promise<HealthStatus> {
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

    transport = new SSEClientTransport(new URL(server.url), {
      requestInit: {
        headers: authHeaders,
      },
    })

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
    await db()
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
    } catch {
      // Ignore close errors
    }

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

export async function checkHealth(c: Context): Promise<Response> {
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

  const health = await performHealthCheck(server)

  return c.json(health)
}

export async function batchHealthCheck(c: Context): Promise<Response> {
  const auth = getAuthContext(c)
  const { serverIds } = (
    c.req as unknown as { valid: (target: "json") => BatchHealthCheckInput }
  ).valid("json")

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

  const servers = await db().query.mcpServer.findMany({
    where: sql`${mcpServer.id} IN (${sql.join(
      serverIds.map((id: string) => sql`${id}`),
      sql`, `
    )})`,
  })

  const accessibleServers: typeof servers = []
  for (const server of servers) {
    const isMember = await verifyOrganizationMembership(
      auth.userId,
      server.organizationId
    )
    if (isMember) {
      accessibleServers.push(server)
    }
  }

  const healthChecks = await Promise.all(
    accessibleServers.map(async (server) => {
      const health = await performHealthCheck(server)
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
