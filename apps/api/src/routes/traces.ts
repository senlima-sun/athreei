/**
 * Traces API routes
 *
 * Routes for viewing trace data (tool calls and their results).
 * Traces are stored via POST /api/gateway/traces from the gateway.
 *
 * Routes:
 * - GET /api/traces - List traces for an organization with filtering
 * - GET /api/traces/:id - Get a single trace with full details
 */

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq, and, desc, gte, lte, like, sql } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { getDb } from "../lib/db"
import { trace } from "@athreei/db"
import { listTracesQuerySchema, traceIdParamSchema } from "../schemas/traces"
import { verifyOrganizationMembership } from "../services"

const traces = new Hono()

// Apply auth middleware to all trace routes
traces.use("*", authMiddleware)

/**
 * Safely parse JSON or return null
 */
function safeJsonParse(value: string | null): unknown {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/traces
 * List traces for an organization with filtering and pagination
 */
traces.get("/", zValidator("query", listTracesQuerySchema), async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const { organizationId, limit, offset, status, startDate, endDate, search } =
    c.req.valid("query")

  // Verify user is member of organization
  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    organizationId
  )

  if (!isMember) {
    throw ApiError.forbidden("Access denied")
  }

  // Build query conditions
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

  // Apply search filter at database level (case-insensitive)
  if (search) {
    conditions.push(like(trace.name, `%${search}%`))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query

  // Fetch traces with pagination
  const tracesResult = await dbQuery.trace.findMany({
    where: and(...conditions),
    orderBy: [desc(trace.startTime)],
    limit,
    offset,
  })

  // Get total count for pagination
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countResult = await (db as any)
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
      attributes: safeJsonParse(t.attributes),
    })),
    total,
    limit,
    offset,
  })
})

/**
 * GET /api/traces/:id
 * Get a single trace with full details
 */
traces.get("/:id", zValidator("param", traceIdParamSchema), async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const { id } = c.req.valid("param")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query

  const traceRecord = await dbQuery.trace.findFirst({
    where: eq(trace.id, id),
  })

  if (!traceRecord) {
    throw ApiError.notFound("Trace not found")
  }

  // Verify user has access to this organization
  const isMember = await verifyOrganizationMembership(
    db,
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
