import { Hono } from "hono"
import { sql, count, eq } from "drizzle-orm"
import { authMiddleware, requireAdmin } from "../../middleware"
import { db } from "../../lib/db-operations"
import { marketplace, plugin } from "@athreei/db"

const adminStats = new Hono()

adminStats.use("*", authMiddleware)
adminStats.use("*", requireAdmin)

adminStats.get("/", async (c) => {
  const stats = await db().transaction(async (tx) => {
    const [
      pluginCountResult,
      marketplaceCountResult,
      verifiedCountResult,
      featuredCountResult,
      totalDownloadsResult,
    ] = await Promise.all([
      tx.select({ count: count() }).from(plugin),
      tx.select({ count: count() }).from(marketplace),
      tx
        .select({ count: count() })
        .from(plugin)
        .where(eq(plugin.isVerified, true)),
      tx
        .select({ count: count() })
        .from(plugin)
        .where(eq(plugin.isFeatured, true)),
      tx
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${plugin.downloadCount} AS BIGINT)), 0)`,
        })
        .from(plugin),
    ])

    const totalPlugins = pluginCountResult[0]?.count ?? 0
    const totalMarketplaces = marketplaceCountResult[0]?.count ?? 0
    const verifiedPlugins = verifiedCountResult[0]?.count ?? 0
    const featuredPlugins = featuredCountResult[0]?.count ?? 0
    const totalDownloads = Number(totalDownloadsResult[0]?.total ?? 0)

    return {
      totalPlugins,
      pendingApprovals: 0,
      totalDownloads,
      totalMarketplaces,
      verifiedPlugins,
      featuredPlugins,
    }
  })

  return c.json(stats)
})

export default adminStats
