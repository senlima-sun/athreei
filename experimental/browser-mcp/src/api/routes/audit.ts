/**
 * Audit Log API Routes
 *
 * Provides endpoints for querying audit logs.
 */

import { Hono } from "hono"
import type { AuditStatus } from "@athreei/shared"
import {
  listAuditLogEntries,
  countAuditLogEntries,
} from "../../db/repositories/audit-log"

export const auditRoutes = new Hono()

/**
 * GET /api/audit - List audit log entries with pagination
 */
auditRoutes.get("/", async (c) => {
  const query = c.req.query()

  // Parse query parameters
  const page = parseInt(query.page || "1", 10)
  const limit = Math.min(parseInt(query.limit || "50", 10), 100)
  const offset = (page - 1) * limit

  const filters: {
    origin?: string
    tool?: string
    status?: AuditStatus
    aiApp?: string
    from?: number
    to?: number
    limit: number
    offset: number
  } = { limit, offset }

  if (query.origin) filters.origin = query.origin
  if (query.tool) filters.tool = query.tool
  if (query.status) filters.status = query.status as AuditStatus
  if (query.aiApp) filters.aiApp = query.aiApp
  if (query.dateFrom) filters.from = parseInt(query.dateFrom, 10)
  if (query.dateTo) filters.to = parseInt(query.dateTo, 10)

  const data = listAuditLogEntries(filters)
  const total = countAuditLogEntries({
    origin: filters.origin,
    tool: filters.tool,
    status: filters.status,
    aiApp: filters.aiApp,
    from: filters.from,
    to: filters.to,
  })

  return c.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})
