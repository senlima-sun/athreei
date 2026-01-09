import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq, and } from "drizzle-orm"
import { getDb } from "../lib/db"
import {
  namespace,
  namespaceResource,
  mcpServer,
  mcpTool,
  trace,
} from "@athreei/db"
import { checkRateLimit } from "../middleware/rate-limit"
import { getConfigQuerySchema, postTracesSchema } from "../schemas/gateway"
import {
  parseAuthHeader,
  validateApiKey,
  generateConfigVersion,
  generateTraceId,
  generateSpanId,
} from "../services"

const gateway = new Hono()

const RATE_LIMIT_WINDOW_MS = 60_000
const DEFAULT_RATE_LIMIT = 60

function applyRateLimit(
  c: import("hono").Context,
  apiKeyHash: string,
  endpointRateLimit: number | null
): { limited: true } | { limited: false } {
  const limit = endpointRateLimit ?? DEFAULT_RATE_LIMIT
  const info = checkRateLimit(apiKeyHash, limit, RATE_LIMIT_WINDOW_MS)

  const now = Date.now()
  c.header("X-RateLimit-Limit", String(limit))
  c.header("X-RateLimit-Remaining", String(Math.max(0, limit - info.current)))
  c.header("X-RateLimit-Reset", String(Math.ceil((now + info.resetIn) / 1000)))

  if (info.limited) {
    c.header("Retry-After", String(Math.ceil(info.resetIn / 1000)))
    return { limited: true }
  }

  return { limited: false }
}

gateway.get("/config", zValidator("query", getConfigQuerySchema), async (c) => {
  const db = getDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query
  const { endpoint: endpointSlug } = c.req.valid("query")

  const authHeader = c.req.header("Authorization")
  const apiKeyValue = parseAuthHeader(authHeader)

  if (!apiKeyValue) {
    return c.json({ error: "Authorization header required" }, 401)
  }

  const validation = await validateApiKey(db, apiKeyValue)
  if (!validation.valid) {
    return c.json({ error: validation.error }, 401)
  }

  const { apiKeyRecord, endpointRecord, keyHash } = validation

  // Apply rate limiting
  const rateLimitResult = applyRateLimit(c, keyHash, endpointRecord.rateLimit)
  if (rateLimitResult.limited) {
    return c.json(
      {
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please try again later.",
      },
      429
    )
  }

  const urlParts = endpointRecord.url.split("/")
  const mcpIndex = urlParts.indexOf("mcp")
  const endpointSlugFromUrl = mcpIndex !== -1 ? urlParts[mcpIndex + 1] : null

  if (endpointSlugFromUrl !== endpointSlug) {
    return c.json(
      { error: `API key does not have access to endpoint "${endpointSlug}"` },
      403
    )
  }

  const resourceMapping = (await dbQuery.namespaceResource.findFirst({
    where: and(
      eq(namespaceResource.resourceType, "endpoint"),
      eq(namespaceResource.resourceId, endpointRecord.id)
    ),
  })) as typeof namespaceResource.$inferSelect | undefined

  if (!resourceMapping) {
    return c.json({ error: "Endpoint is not assigned to a namespace" }, 404)
  }

  const namespaceRecord = (await dbQuery.namespace.findFirst({
    where: eq(namespace.id, resourceMapping.namespaceId),
  })) as typeof namespace.$inferSelect | undefined

  if (!namespaceRecord) {
    return c.json({ error: "Namespace not found" }, 404)
  }

  const serverMappings = (await dbQuery.namespaceResource.findMany({
    where: and(
      eq(namespaceResource.namespaceId, namespaceRecord.id),
      eq(namespaceResource.resourceType, "mcp_server")
    ),
  })) as Array<typeof namespaceResource.$inferSelect>

  const servers: Array<typeof mcpServer.$inferSelect> = []

  for (const mapping of serverMappings) {
    const server = (await dbQuery.mcpServer.findFirst({
      where: eq(mcpServer.id, mapping.resourceId),
    })) as typeof mcpServer.$inferSelect | undefined

    if (server) {
      servers.push(server)
    }
  }

  const serverTools = new Map<string, Array<typeof mcpTool.$inferSelect>>()
  for (const server of servers) {
    const tools = (await dbQuery.mcpTool.findMany({
      where: eq(mcpTool.serverId, server.id),
    })) as Array<typeof mcpTool.$inferSelect>
    serverTools.set(server.id, tools)
  }

  const configVersion = generateConfigVersion(
    namespaceRecord.updatedAt,
    servers
  )

  return c.json({
    namespaceId: namespaceRecord.id,
    namespaceName: namespaceRecord.name,
    namespaceSlug: namespaceRecord.slug,
    endpointId: endpointRecord.id,
    endpointName: endpointRecord.name,
    organizationId: endpointRecord.organizationId,
    userId: apiKeyRecord.createdById,
    configVersion,
    servers: servers.map((s) => {
      const tools = serverTools.get(s.id) ?? []
      return {
        id: s.id,
        name: s.name,
        description: s.description,
        transport: s.transport,
        command: s.command,
        args: s.args,
        url: s.url,
        version: s.version,
        capabilities: s.capabilities,
        status: s.status,
        tools: tools
          .filter((t) => t.isEnabled === "true")
          .map((t) => ({
            name: t.name,
            description: t.customDescription ?? t.description,
            inputSchema: (() => {
              if (!t.inputSchema) return null
              try {
                return JSON.parse(t.inputSchema)
              } catch {
                console.error(`Invalid inputSchema JSON for tool ${t.name}`)
                return null
              }
            })(),
            customPrompt: t.customPrompt,
          })),
      }
    }),
  })
})

gateway.post("/traces", zValidator("json", postTracesSchema), async (c) => {
  const authHeader = c.req.header("Authorization")
  const apiKeyValue = parseAuthHeader(authHeader)

  if (!apiKeyValue) {
    return c.json({ error: "Authorization header required" }, 401)
  }

  const db = getDb()

  const validation = await validateApiKey(db, apiKeyValue)
  if (!validation.valid) {
    return c.json({ error: validation.error }, 401)
  }

  const { apiKeyRecord, endpointRecord, keyHash } = validation

  // Apply rate limiting
  const rateLimitResult = applyRateLimit(c, keyHash, endpointRecord.rateLimit)
  if (rateLimitResult.limited) {
    return c.json(
      {
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please try again later.",
      },
      429
    )
  }

  const { traces } = c.req.valid("json")

  const now = new Date()
  const insertedIds: string[] = []

  for (const traceData of traces) {
    const id = generateTraceId()
    const spanId = generateSpanId()

    const status = traceData.error ? "error" : "success"
    const statusMessage = traceData.error || undefined

    const attributesObj = {
      aggregatedToolName: traceData.aggregatedToolName,
      serverName: traceData.serverName,
      toolName: traceData.toolName,
      arguments: traceData.arguments,
      result: traceData.result,
      endpointId: endpointRecord.id,
      apiKeyId: apiKeyRecord.id,
    }
    const attributes = JSON.stringify(attributesObj)

    const MAX_ATTRIBUTES_SIZE = 1_000_000
    if (attributes.length > MAX_ATTRIBUTES_SIZE) {
      console.warn(
        `Trace ${traceData.traceId} attributes exceed size limit, skipping`
      )
      continue
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).insert(trace).values({
        id,
        organizationId: endpointRecord.organizationId,
        userId: null, // Gateway traces don't have a user context
        mcpServerId: null, // Could be enhanced to look up server by name
        traceId: traceData.traceId,
        parentSpanId: null,
        spanId,
        name: traceData.aggregatedToolName || traceData.toolName,
        kind: "server", // Gateway is acting as server
        status,
        statusMessage,
        startTime: new Date(traceData.startedAt),
        endTime: traceData.endedAt ? new Date(traceData.endedAt) : null,
        durationMs: traceData.durationMs || null,
        attributes,
        events: null,
        createdAt: now,
      })

      insertedIds.push(id)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      console.error(`Failed to insert trace ${traceData.traceId}: ${errorMsg}`)
    }
  }

  console.log(
    `Stored ${insertedIds.length}/${traces.length} traces from gateway`
  )

  return c.json({
    received: traces.length,
    stored: insertedIds.length,
    message: "Traces processed successfully",
    traceIds: insertedIds,
  })
})

export default gateway
