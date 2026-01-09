import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq, and, gte, lte, sql, desc } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { getDb } from "../lib/db"
import { auditLog, user } from "@athreei/db"
import { listAuditQuerySchema, createAuditSchema } from "../schemas/audit"
import type { AuditAction, TargetType } from "../schemas/audit"
import { verifyOrganizationMembership, generateUUID } from "../services"

const audit = new Hono()

audit.use("*", authMiddleware)

function now(): Date {
  return new Date()
}

export async function logAuditEvent(params: {
  action: AuditAction
  targetType: TargetType
  targetId: string
  actorId: string
  organizationId: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const db = getDb()
  const id = generateUUID()
  const timestamp = now()

  const entry = {
    id,
    organizationId: params.organizationId,
    action: params.action,
    actorId: params.actorId,
    targetType: params.targetType,
    targetId: params.targetId,
    metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    createdAt: timestamp,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).insert(auditLog).values(entry)
}

audit.get("/", zValidator("query", listAuditQuerySchema), async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const { organizationId, action, actorId, startDate, endDate, limit, offset } =
    c.req.valid("query")

  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  const conditions = [eq(auditLog.organizationId, organizationId)]

  if (action) {
    conditions.push(eq(auditLog.action, action))
  }

  if (actorId) {
    conditions.push(eq(auditLog.actorId, actorId))
  }

  if (startDate) {
    conditions.push(gte(auditLog.createdAt, new Date(startDate)))
  }

  if (endDate) {
    conditions.push(lte(auditLog.createdAt, new Date(endDate)))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries = await (db as any)
    .select({
      id: auditLog.id,
      action: auditLog.action,
      actorId: auditLog.actorId,
      actorName: user.name,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .leftJoin(user, eq(auditLog.actorId, user.id))
    .where(and(...conditions))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit)
    .offset(offset)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countResult = await (db as any)
    .select({ count: sql<number>`count(*)` })
    .from(auditLog)
    .where(and(...conditions))

  const total = Number(countResult[0]?.count ?? 0)

  const parsedEntries = entries.map(
    (entry: {
      id: string
      action: string
      actorId: string
      actorName: string | null
      targetType: string
      targetId: string
      metadata: string | null
      createdAt: Date
    }) => ({
      ...entry,
      metadata: entry.metadata ? JSON.parse(entry.metadata) : null,
    })
  )

  return c.json({
    entries: parsedEntries,
    total,
    limit,
    offset,
  })
})

audit.post("/", zValidator("json", createAuditSchema), async (c) => {
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

  await logAuditEvent({
    action: body.action,
    targetType: body.targetType,
    targetId: body.targetId,
    actorId: auth.userId,
    organizationId,
    metadata: body.metadata,
  })

  return c.json({ message: "Audit event logged successfully" }, 201)
})

export default audit
