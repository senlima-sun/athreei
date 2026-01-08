/**
 * Audit routes
 *
 * API endpoints for audit log operations.
 * Provides endpoints to query audit events and log new audit entries.
 */

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

// Apply auth middleware to all audit routes
audit.use("*", authMiddleware)

// =============================================================================
// Helper Functions
// =============================================================================

function now(): Date {
  return new Date()
}

/**
 * Log an audit event to the database.
 *
 * This helper function is exported for use by other route handlers
 * when they need to record audit events for their operations.
 *
 * @param params - Audit event parameters
 * @param params.action - The action type (e.g., "mcp_server.created")
 * @param params.targetType - The type of resource affected
 * @param params.targetId - The ID of the affected resource
 * @param params.actorId - The user who performed the action
 * @param params.organizationId - The organization context
 * @param params.metadata - Optional additional details as JSON
 *
 * @example
 * ```typescript
 * await logAuditEvent({
 *   action: "mcp_server.created",
 *   targetType: "mcp_server",
 *   targetId: serverId,
 *   actorId: auth.userId,
 *   organizationId: orgId,
 *   metadata: { name: serverName },
 * })
 * ```
 */
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

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/audit
 * List audit events for an organization
 *
 * Query params:
 * - organizationId: Required - filter by organization
 * - action: Filter by action type
 * - actorId: Filter by actor user ID
 * - startDate: Filter events after this date (ISO 8601)
 * - endDate: Filter events before this date (ISO 8601)
 * - limit: Max results (default 20, max 100)
 * - offset: Pagination offset (default 0)
 *
 * Returns:
 * - entries: Array of audit log entries with actor information
 * - total: Total count for pagination
 * - limit: Applied limit
 * - offset: Applied offset
 */
audit.get("/", zValidator("query", listAuditQuerySchema), async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const { organizationId, action, actorId, startDate, endDate, limit, offset } =
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

  // Build query conditions
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

  // Execute query with joins to get actor info
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

  // Get total count for pagination
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countResult = await (db as any)
    .select({ count: sql<number>`count(*)` })
    .from(auditLog)
    .where(and(...conditions))

  const total = Number(countResult[0]?.count ?? 0)

  // Parse metadata JSON for each entry
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

/**
 * POST /api/audit
 * Create an audit log entry
 *
 * This endpoint is intended for internal use by other services.
 * The actor is automatically set to the authenticated user.
 *
 * Body:
 * - action: The action type (e.g., "mcp_server.created")
 * - targetType: The type of resource affected
 * - targetId: The ID of the affected resource
 * - metadata: Optional additional details
 *
 * Query params:
 * - organizationId: Required - the organization context
 */
audit.post("/", zValidator("json", createAuditSchema), async (c) => {
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

  // Create the audit log entry
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
