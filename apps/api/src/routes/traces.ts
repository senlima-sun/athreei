import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq, and, desc, gte, lte, like, sql, inArray } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { db } from "../lib/db-operations"
import { trace, mcpServer } from "@athreei/db"
import {
  listTracesQuerySchema,
  traceIdParamSchema,
  exportTracesQuerySchema,
} from "../schemas/traces"
import { verifyOrganizationMembership } from "../services"
import { generateTraceCsv } from "../utils/csv"

const traces = new Hono()

traces.use("*", authMiddleware)

function safeJsonParse(value: string | null): unknown {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

traces.get("/", zValidator("query", listTracesQuerySchema), async (c) => {
  const auth = getAuthContext(c)
  const {
    organizationId,
    limit,
    offset,
    status,
    startDate,
    endDate,
    search,
    minDuration,
    maxDuration,
    serverIds,
  } = c.req.valid("query")

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    organizationId
  )

  if (!isMember) {
    throw ApiError.forbidden("Access denied")
  }

  const conditions = [eq(trace.organizationId, organizationId)]

  if (status) {
    conditions.push(eq(trace.status, status))
  }

  if (startDate) {
    conditions.push(gte(trace.startTime, new Date(startDate)))
  }

  if (endDate) {
    conditions.push(lte(trace.startTime, new Date(endDate)))
  }

  if (search) {
    conditions.push(like(trace.name, `%${search}%`))
  }

  if (minDuration !== undefined) {
    conditions.push(gte(trace.durationMs, minDuration))
  }

  if (maxDuration !== undefined) {
    conditions.push(lte(trace.durationMs, maxDuration))
  }

  if (serverIds) {
    const serverIdList = serverIds.split(",").filter(Boolean)
    if (serverIdList.length > 0) {
      conditions.push(inArray(trace.mcpServerId, serverIdList))
    }
  }

  const dbQuery = db().query

  const tracesResult = await dbQuery.trace.findMany({
    where: and(...conditions),
    orderBy: [desc(trace.startTime)],
    limit,
    offset,
  })

  const countResult = await db()
    .select({ count: sql<number>`count(*)` })
    .from(trace)
    .where(and(...conditions))

  const total = Number(countResult[0]?.count ?? 0)

  return c.json({
    traces: tracesResult.map((t: typeof trace.$inferSelect) => ({
      id: t.id,
      traceId: t.traceId,
      name: t.name,
      status: t.status,
      statusMessage: t.statusMessage,
      durationMs: t.durationMs,
      startTime: t.startTime,
      endTime: t.endTime,
      mcpServerId: t.mcpServerId,
      attributes: safeJsonParse(t.attributes),
    })),
    total,
    limit,
    offset,
  })
})

traces.get("/servers", async (c) => {
  const auth = getAuthContext(c)
  const organizationId = c.req.query("organizationId")

  if (!organizationId) {
    throw ApiError.badRequest("organizationId is required")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("Access denied")
  }

  const servers = await db().query.mcpServer.findMany({
    where: eq(mcpServer.organizationId, organizationId),
    columns: {
      id: true,
      name: true,
    },
  })

  return c.json({ servers })
})

traces.get(
  "/export",
  zValidator("query", exportTracesQuerySchema),
  async (c) => {
    const auth = getAuthContext(c)
    const {
      organizationId,
      format,
      status,
      startDate,
      endDate,
      search,
      minDuration,
      maxDuration,
      serverIds,
    } = c.req.valid("query")

    const isMember = await verifyOrganizationMembership(
      auth.userId,
      organizationId
    )

    if (!isMember) {
      throw ApiError.forbidden("Access denied")
    }

    const conditions = [eq(trace.organizationId, organizationId)]

    if (status) {
      conditions.push(eq(trace.status, status))
    }

    if (startDate) {
      conditions.push(gte(trace.startTime, new Date(startDate)))
    }

    if (endDate) {
      conditions.push(lte(trace.startTime, new Date(endDate)))
    }

    if (search) {
      conditions.push(like(trace.name, `%${search}%`))
    }

    if (minDuration !== undefined) {
      conditions.push(gte(trace.durationMs, minDuration))
    }

    if (maxDuration !== undefined) {
      conditions.push(lte(trace.durationMs, maxDuration))
    }

    if (serverIds) {
      const serverIdList = serverIds.split(",").filter(Boolean)
      if (serverIdList.length > 0) {
        conditions.push(inArray(trace.mcpServerId, serverIdList))
      }
    }

    const dbQuery = db().query

    const tracesResult = await dbQuery.trace.findMany({
      where: and(...conditions),
      orderBy: [desc(trace.startTime)],
      limit: 10000,
    })

    if (format === "csv") {
      const csv = generateTraceCsv(tracesResult)
      const today = new Date().toISOString().split("T")[0]
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=traces-${today}.csv`,
        },
      })
    }

    return c.json({
      traces: tracesResult.map((t: typeof trace.$inferSelect) => ({
        id: t.id,
        traceId: t.traceId,
        name: t.name,
        status: t.status,
        statusMessage: t.statusMessage,
        durationMs: t.durationMs,
        startTime: t.startTime,
        endTime: t.endTime,
        mcpServerId: t.mcpServerId,
        attributes: safeJsonParse(t.attributes),
      })),
    })
  }
)

traces.get("/:id", zValidator("param", traceIdParamSchema), async (c) => {
  const auth = getAuthContext(c)
  const { id } = c.req.valid("param")

  const dbQuery = db().query

  const traceRecord = await dbQuery.trace.findFirst({
    where: eq(trace.id, id),
  })

  if (!traceRecord) {
    throw ApiError.notFound("Trace not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    traceRecord.organizationId
  )

  if (!isMember) {
    throw ApiError.forbidden("Access denied")
  }

  return c.json({
    trace: {
      id: traceRecord.id,
      traceId: traceRecord.traceId,
      parentSpanId: traceRecord.parentSpanId,
      spanId: traceRecord.spanId,
      name: traceRecord.name,
      kind: traceRecord.kind,
      status: traceRecord.status,
      statusMessage: traceRecord.statusMessage,
      startTime: traceRecord.startTime,
      endTime: traceRecord.endTime,
      durationMs: traceRecord.durationMs,
      attributes: safeJsonParse(traceRecord.attributes),
      events: safeJsonParse(traceRecord.events),
      createdAt: traceRecord.createdAt,
    },
  })
})

export default traces
