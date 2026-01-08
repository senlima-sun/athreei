/**
 * Dashboard routes
 *
 * Endpoints for dashboard statistics and activity feed.
 *
 * Routes:
 * - GET /api/dashboard/stats - Aggregated stats for organization
 * - GET /api/dashboard/activity - Recent activity feed
 */

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { eq, and, desc, gte, sql } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { getDb } from "../lib/db"
import { endpoint, mcpServer, trace, member } from "@athreei/db"
import { verifyOrganizationMembership } from "../services"

// =============================================================================
// Constants
// =============================================================================

const ACTIVITY_LIMIT = 20
const STATS_CACHE_MAX_AGE = 60 // 1 minute
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

// =============================================================================
// Schemas
// =============================================================================

const statsQuerySchema = z.object({
  organizationId: z.string().min(1, "organizationId is required"),
})

const activityQuerySchema = z.object({
  organizationId: z.string().min(1, "organizationId is required"),
  limit: z.coerce.number().min(1).max(50).default(ACTIVITY_LIMIT),
})

export type StatsQuery = z.infer<typeof statsQuerySchema>
export type ActivityQuery = z.infer<typeof activityQuerySchema>

// =============================================================================
// Types
// =============================================================================

interface DashboardStats {
  activeEndpoints: number
  mcpServers: number
  totalTraces: number
  teamMembers: number
}

interface ActivityItem {
  id: string
  type: "trace" | "mcp_server_added" | "mcp_server_removed" | "member_joined"
  description: string
  timestamp: string
  metadata?: Record<string, unknown>
}

// =============================================================================
// Routes
// =============================================================================

const dashboard = new Hono()

// Apply auth middleware to all dashboard routes
dashboard.use("*", authMiddleware)

/**
 * GET /api/dashboard/stats
 * Return aggregated stats for the user's organization
 */
dashboard.get("/stats", zValidator("query", statsQuerySchema), async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const { organizationId } = c.req.valid("query")

  // Verify user is member of organization
  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    organizationId
  )

  if (!isMember) {
    throw ApiError.forbidden("Access denied")
  }

  // Calculate date 30 days ago for trace filtering
  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS)

  // Run all count queries in parallel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  const [
    endpointCountResult,
    mcpServerCountResult,
    traceCountResult,
    memberCountResult,
  ] = await Promise.all([
    // Count active endpoints
    dbAny
      .select({ count: sql<number>`count(*)` })
      .from(endpoint)
      .where(
        and(
          eq(endpoint.organizationId, organizationId),
          eq(endpoint.status, "active")
        )
      ),

    // Count MCP servers
    dbAny
      .select({ count: sql<number>`count(*)` })
      .from(mcpServer)
      .where(eq(mcpServer.organizationId, organizationId)),

    // Count traces in last 30 days
    dbAny
      .select({ count: sql<number>`count(*)` })
      .from(trace)
      .where(
        and(
          eq(trace.organizationId, organizationId),
          gte(trace.startTime, thirtyDaysAgo)
        )
      ),

    // Count team members
    dbAny
      .select({ count: sql<number>`count(*)` })
      .from(member)
      .where(eq(member.organizationId, organizationId)),
  ])

  const stats: DashboardStats = {
    activeEndpoints: Number(endpointCountResult[0]?.count ?? 0),
    mcpServers: Number(mcpServerCountResult[0]?.count ?? 0),
    totalTraces: Number(traceCountResult[0]?.count ?? 0),
    teamMembers: Number(memberCountResult[0]?.count ?? 0),
  }

  // Set cache headers for efficiency
  c.header("Cache-Control", `private, max-age=${STATS_CACHE_MAX_AGE}`)

  return c.json(stats)
})

/**
 * GET /api/dashboard/activity
 * Return recent activity feed for the organization
 */
dashboard.get(
  "/activity",
  zValidator("query", activityQuerySchema),
  async (c) => {
    const db = getDb()
    const auth = getAuthContext(c)
    const { organizationId, limit } = c.req.valid("query")

    // Verify user is member of organization
    const isMember = await verifyOrganizationMembership(
      db,
      auth.userId,
      organizationId
    )

    if (!isMember) {
      throw ApiError.forbidden("Access denied")
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbQuery = (db as any).query

    // Fetch recent traces
    const recentTraces = await dbQuery.trace.findMany({
      where: eq(trace.organizationId, organizationId),
      orderBy: [desc(trace.startTime)],
      limit: Math.min(limit, ACTIVITY_LIMIT),
      columns: {
        id: true,
        name: true,
        status: true,
        startTime: true,
        mcpServerId: true,
      },
    })

    // Fetch recent MCP servers (added recently)
    const recentMcpServers = await dbQuery.mcpServer.findMany({
      where: eq(mcpServer.organizationId, organizationId),
      orderBy: [desc(mcpServer.createdAt)],
      limit: Math.min(limit, 10),
      columns: {
        id: true,
        name: true,
        createdAt: true,
        status: true,
      },
    })

    // Fetch recent members
    const recentMembers = await dbQuery.member.findMany({
      where: eq(member.organizationId, organizationId),
      orderBy: [desc(member.createdAt)],
      limit: Math.min(limit, 10),
      columns: {
        id: true,
        userId: true,
        role: true,
        createdAt: true,
      },
      with: {
        user: {
          columns: {
            name: true,
            email: true,
          },
        },
      },
    })

    // Transform and combine activities
    const activities: ActivityItem[] = []

    // Add trace activities
    for (const t of recentTraces) {
      activities.push({
        id: `trace-${t.id}`,
        type: "trace",
        description: `Tool call: ${t.name} (${t.status})`,
        timestamp: t.startTime.toISOString(),
        metadata: {
          traceId: t.id,
          status: t.status,
          mcpServerId: t.mcpServerId,
        },
      })
    }

    // Add MCP server activities
    for (const s of recentMcpServers) {
      activities.push({
        id: `mcp-${s.id}`,
        type: "mcp_server_added",
        description: `MCP server added: ${s.name}`,
        timestamp: s.createdAt.toISOString(),
        metadata: {
          serverId: s.id,
          serverName: s.name,
          status: s.status,
        },
      })
    }

    // Add member activities
    for (const m of recentMembers) {
      const userName = m.user?.name || m.user?.email || "Unknown user"
      activities.push({
        id: `member-${m.id}`,
        type: "member_joined",
        description: `${userName} joined as ${m.role}`,
        timestamp: m.createdAt.toISOString(),
        metadata: {
          memberId: m.id,
          userId: m.userId,
          role: m.role,
        },
      })
    }

    // Sort by timestamp descending and limit
    activities.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    const limitedActivities = activities.slice(0, limit)

    return c.json({
      activities: limitedActivities,
      total: limitedActivities.length,
    })
  }
)

export default dashboard
