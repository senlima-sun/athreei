import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { eq, and, desc, gte, sql } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { db } from "../lib/db-operations"
import { endpoint, mcpServer, trace, member } from "@athreei/db"
import { verifyOrganizationMembership } from "../services"

const ACTIVITY_LIMIT = 20
const STATS_CACHE_MAX_AGE = 60
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

const statsQuerySchema = z.object({
  organizationId: z.string().min(1, "organizationId is required"),
})

const activityQuerySchema = z.object({
  organizationId: z.string().min(1, "organizationId is required"),
  limit: z.coerce.number().min(1).max(50).default(ACTIVITY_LIMIT),
})

export type StatsQuery = z.infer<typeof statsQuerySchema>
export type ActivityQuery = z.infer<typeof activityQuerySchema>

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

const dashboard = new Hono()

dashboard.use("*", authMiddleware)

dashboard.get("/stats", zValidator("query", statsQuerySchema), async (c) => {
  const auth = getAuthContext(c)
  const { organizationId } = c.req.valid("query")

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    organizationId
  )

  if (!isMember) {
    throw ApiError.forbidden("Access denied")
  }

  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS)

  const [
    endpointCountResult,
    mcpServerCountResult,
    traceCountResult,
    memberCountResult,
  ] = await Promise.all([
    db()
      .select({ count: sql<number>`count(*)` })
      .from(endpoint)
      .where(
        and(
          eq(endpoint.organizationId, organizationId),
          eq(endpoint.status, "active")
        )
      ),

    db()
      .select({ count: sql<number>`count(*)` })
      .from(mcpServer)
      .where(eq(mcpServer.organizationId, organizationId)),

    db()
      .select({ count: sql<number>`count(*)` })
      .from(trace)
      .where(
        and(
          eq(trace.organizationId, organizationId),
          gte(trace.startTime, thirtyDaysAgo)
        )
      ),

    db()
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

  c.header("Cache-Control", `private, max-age=${STATS_CACHE_MAX_AGE}`)

  return c.json(stats)
})

dashboard.get(
  "/activity",
  zValidator("query", activityQuerySchema),
  async (c) => {
    const auth = getAuthContext(c)
    const { organizationId, limit } = c.req.valid("query")

    const isMember = await verifyOrganizationMembership(
      auth.userId,
      organizationId
    )

    if (!isMember) {
      throw ApiError.forbidden("Access denied")
    }

    const dbQuery = db().query

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

    const activities: ActivityItem[] = []

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
