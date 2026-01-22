import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { eq, and, sql, gte, lte, desc } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { db } from "../lib/db-operations"
import { trace } from "@athreei/db"
import { verifyOrganizationMembership } from "../services"

const analytics = new Hono()
analytics.use("*", authMiddleware)

const analyticsQuerySchema = z.object({
  organizationId: z.string().min(1, "organizationId is required"),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

analytics.get(
  "/errors/overview",
  zValidator("query", analyticsQuerySchema),
  async (c) => {
    const auth = getAuthContext(c)
    const { organizationId, startDate, endDate } = c.req.valid("query")

    const isMember = await verifyOrganizationMembership(
      auth.userId,
      organizationId
    )
    if (!isMember) {
      throw ApiError.forbidden("Access denied")
    }

    const conditions = [eq(trace.organizationId, organizationId)]
    if (startDate) conditions.push(gte(trace.startTime, new Date(startDate)))
    if (endDate) conditions.push(lte(trace.startTime, new Date(endDate)))

    const result = await db()
      .select({
        total: sql<number>`count(*)`,
        errors: sql<number>`sum(case when ${trace.status} = 'error' then 1 else 0 end)`,
        success: sql<number>`sum(case when ${trace.status} = 'success' then 1 else 0 end)`,
      })
      .from(trace)
      .where(and(...conditions))

    const stats = result[0]
    const total = Number(stats?.total ?? 0)
    const errors = Number(stats?.errors ?? 0)
    const errorRate = total > 0 ? (errors / total) * 100 : 0

    return c.json({
      overview: {
        total,
        errors,
        success: Number(stats?.success ?? 0),
        errorRate: Math.round(errorRate * 100) / 100,
      },
    })
  }
)

analytics.get(
  "/errors/by-tool",
  zValidator("query", analyticsQuerySchema),
  async (c) => {
    const auth = getAuthContext(c)
    const { organizationId, startDate, endDate } = c.req.valid("query")

    const isMember = await verifyOrganizationMembership(
      auth.userId,
      organizationId
    )
    if (!isMember) {
      throw ApiError.forbidden("Access denied")
    }

    const conditions = [eq(trace.organizationId, organizationId)]
    if (startDate) conditions.push(gte(trace.startTime, new Date(startDate)))
    if (endDate) conditions.push(lte(trace.startTime, new Date(endDate)))

    const result = await db()
      .select({
        toolName: trace.name,
        total: sql<number>`count(*)`,
        errors: sql<number>`sum(case when ${trace.status} = 'error' then 1 else 0 end)`,
      })
      .from(trace)
      .where(and(...conditions))
      .groupBy(trace.name)
      .orderBy(
        desc(sql`sum(case when ${trace.status} = 'error' then 1 else 0 end)`)
      )
      .limit(20)

    return c.json({
      byTool: result.map((r) => ({
        toolName: r.toolName,
        total: Number(r.total),
        errors: Number(r.errors),
        errorRate:
          Number(r.total) > 0
            ? Math.round((Number(r.errors) / Number(r.total)) * 10000) / 100
            : 0,
      })),
    })
  }
)

analytics.get(
  "/errors/by-server",
  zValidator("query", analyticsQuerySchema),
  async (c) => {
    const auth = getAuthContext(c)
    const { organizationId, startDate, endDate } = c.req.valid("query")

    const isMember = await verifyOrganizationMembership(
      auth.userId,
      organizationId
    )
    if (!isMember) {
      throw ApiError.forbidden("Access denied")
    }

    const conditions = [eq(trace.organizationId, organizationId)]
    if (startDate) conditions.push(gte(trace.startTime, new Date(startDate)))
    if (endDate) conditions.push(lte(trace.startTime, new Date(endDate)))

    const result = await db()
      .select({
        mcpServerId: trace.mcpServerId,
        total: sql<number>`count(*)`,
        errors: sql<number>`sum(case when ${trace.status} = 'error' then 1 else 0 end)`,
      })
      .from(trace)
      .where(and(...conditions))
      .groupBy(trace.mcpServerId)
      .orderBy(
        desc(sql`sum(case when ${trace.status} = 'error' then 1 else 0 end)`)
      )
      .limit(20)

    return c.json({
      byServer: result.map((r) => ({
        serverId: r.mcpServerId,
        total: Number(r.total),
        errors: Number(r.errors),
        errorRate:
          Number(r.total) > 0
            ? Math.round((Number(r.errors) / Number(r.total)) * 10000) / 100
            : 0,
      })),
    })
  }
)

analytics.get(
  "/errors/common-messages",
  zValidator("query", analyticsQuerySchema),
  async (c) => {
    const auth = getAuthContext(c)
    const { organizationId, startDate, endDate } = c.req.valid("query")

    const isMember = await verifyOrganizationMembership(
      auth.userId,
      organizationId
    )
    if (!isMember) {
      throw ApiError.forbidden("Access denied")
    }

    const conditions = [
      eq(trace.organizationId, organizationId),
      eq(trace.status, "error"),
    ]
    if (startDate) conditions.push(gte(trace.startTime, new Date(startDate)))
    if (endDate) conditions.push(lte(trace.startTime, new Date(endDate)))

    const result = await db()
      .select({
        message: trace.statusMessage,
        count: sql<number>`count(*)`,
      })
      .from(trace)
      .where(and(...conditions))
      .groupBy(trace.statusMessage)
      .orderBy(desc(sql`count(*)`))
      .limit(10)

    return c.json({
      commonMessages: result.map((r) => ({
        message: r.message || "Unknown error",
        count: Number(r.count),
      })),
    })
  }
)

analytics.get(
  "/errors/trend",
  zValidator("query", analyticsQuerySchema),
  async (c) => {
    const auth = getAuthContext(c)
    const { organizationId, startDate, endDate } = c.req.valid("query")

    const isMember = await verifyOrganizationMembership(
      auth.userId,
      organizationId
    )
    if (!isMember) {
      throw ApiError.forbidden("Access denied")
    }

    const conditions = [eq(trace.organizationId, organizationId)]
    if (startDate) conditions.push(gte(trace.startTime, new Date(startDate)))
    if (endDate) conditions.push(lte(trace.startTime, new Date(endDate)))

    const result = await db()
      .select({
        date: sql<string>`date(${trace.startTime})`,
        total: sql<number>`count(*)`,
        errors: sql<number>`sum(case when ${trace.status} = 'error' then 1 else 0 end)`,
      })
      .from(trace)
      .where(and(...conditions))
      .groupBy(sql`date(${trace.startTime})`)
      .orderBy(sql`date(${trace.startTime})`)
      .limit(30)

    return c.json({
      trend: result.map((r) => ({
        date: r.date,
        total: Number(r.total),
        errors: Number(r.errors),
        errorRate:
          Number(r.total) > 0
            ? Math.round((Number(r.errors) / Number(r.total)) * 10000) / 100
            : 0,
      })),
    })
  }
)

export default analytics
