/**
 * Sessions API Routes
 *
 * Provides endpoints for querying browser sessions.
 */

import { Hono } from "hono"
import {
  listSessions,
  countSessions,
} from "../../db/repositories/sessions.js"

export const sessionsRoutes = new Hono()

/**
 * GET /api/sessions - List sessions with filters
 */
sessionsRoutes.get("/", async (c) => {
  const query = c.req.query()

  // Parse query parameters
  const limit = Math.min(parseInt(query.limit || "50", 10), 100)
  const activeOnly = query.active === "true"

  const filters: {
    origin?: string
    activeOnly?: boolean
    limit: number
  } = { limit }

  if (query.origin) filters.origin = query.origin
  if (activeOnly) filters.activeOnly = true

  const data = listSessions(filters)
  const count = data.length
  const total = countSessions({
    origin: filters.origin,
    activeOnly: filters.activeOnly,
  })

  return c.json({
    data,
    count,
    total,
  })
})
