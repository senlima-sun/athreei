import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq, sql, asc, like, or } from "drizzle-orm"
import { authMiddleware, requireAdmin, ApiError } from "../../middleware"
import {
  adminCreateMarketplaceSchema,
  adminUpdateMarketplaceSchema,
  listMarketplacesQuerySchema,
  verifyPluginSchema,
  featurePluginSchema,
  listPluginsQuerySchema,
} from "../../schemas/marketplaces"
import { db } from "../../lib/db-operations"
import { marketplace, plugin } from "@athreei/db"
import { generateMarketplaceId } from "../../services"
import { syncMarketplace } from "../../services/marketplace-sync"

const adminMarketplaces = new Hono()

adminMarketplaces.use("*", authMiddleware)
adminMarketplaces.use("*", requireAdmin)

adminMarketplaces.get(
  "/",
  zValidator("query", listMarketplacesQuerySchema),
  async (c) => {
    const query = c.req.valid("query")

    const limit = Math.min(Math.max(query.limit || 20, 1), 100)
    const offset = Math.max(query.offset || 0, 0)

    const [marketplaces, countResult] = await Promise.all([
      db()
        .select({
          id: marketplace.id,
          slug: marketplace.slug,
          name: marketplace.name,
          description: marketplace.description,
          ownerType: marketplace.ownerType,
          ownerId: marketplace.ownerId,
          sourceType: marketplace.sourceType,
          isPublic: marketplace.isPublic,
          isDefault: marketplace.isDefault,
          lastSyncedAt: marketplace.lastSyncedAt,
          createdAt: marketplace.createdAt,
          updatedAt: marketplace.updatedAt,
          pluginCount: sql<number>`(
            SELECT COUNT(*) FROM plugin WHERE plugin.marketplace_id = marketplace.id
          )`.as("plugin_count"),
        })
        .from(marketplace)
        .orderBy(asc(marketplace.name))
        .limit(limit)
        .offset(offset),
      db()
        .select({ count: sql<number>`count(*)` })
        .from(marketplace),
    ])

    const total = Number(countResult[0]?.count ?? 0)

    return c.json({
      data: marketplaces,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + marketplaces.length < total,
      },
    })
  }
)

adminMarketplaces.post(
  "/",
  zValidator("json", adminCreateMarketplaceSchema),
  async (c) => {
    const body = c.req.valid("json")

    const existing = await db().query.marketplace.findFirst({
      where: eq(marketplace.slug, body.slug),
    })
    if (existing) {
      throw ApiError.conflict("A marketplace with this slug already exists")
    }

    const now = new Date()
    const id = generateMarketplaceId()

    await db()
      .insert(marketplace)
      .values({
        id,
        slug: body.slug,
        name: body.name,
        description: body.description || null,
        ownerType: body.ownerType || "system",
        ownerId: body.ownerId || null,
        sourceType: body.sourceType || "internal",
        sourceUrl: body.sourceUrl || null,
        sourceRepo: body.sourceRepo || null,
        sourceRef: body.sourceRef || null,
        isPublic: body.isPublic ?? true,
        isDefault: body.isDefault ?? false,
        autoUpdate: body.autoUpdate ?? true,
        createdAt: now,
        updatedAt: now,
      })

    const created = await db().query.marketplace.findFirst({
      where: eq(marketplace.id, id),
    })

    const sourceType = body.sourceType || "internal"
    if (sourceType !== "internal") {
      syncMarketplace(id).catch(() => {})
    }

    return c.json({ marketplace: created }, 201)
  }
)

adminMarketplaces.post("/:slug/sync", async (c) => {
  const slug = c.req.param("slug")

  const mkt = await db().query.marketplace.findFirst({
    where: eq(marketplace.slug, slug),
  })

  if (!mkt) {
    throw ApiError.notFound("Marketplace not found")
  }

  if (mkt.sourceType === "internal") {
    throw ApiError.badRequest("Internal marketplaces cannot be synced")
  }

  const result = await syncMarketplace(mkt.id)
  return c.json(result)
})

adminMarketplaces.patch(
  "/:slug",
  zValidator("json", adminUpdateMarketplaceSchema),
  async (c) => {
    const slug = c.req.param("slug")
    const updates = c.req.valid("json")

    const mkt = await db().query.marketplace.findFirst({
      where: eq(marketplace.slug, slug),
    })

    if (!mkt) {
      throw ApiError.notFound("Marketplace not found")
    }

    const updateData: Partial<typeof marketplace.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined)
      updateData.description = updates.description
    if (updates.ownerType !== undefined)
      updateData.ownerType = updates.ownerType
    if (updates.ownerId !== undefined) updateData.ownerId = updates.ownerId
    if (updates.sourceType !== undefined)
      updateData.sourceType = updates.sourceType
    if (updates.sourceUrl !== undefined)
      updateData.sourceUrl = updates.sourceUrl
    if (updates.sourceRepo !== undefined)
      updateData.sourceRepo = updates.sourceRepo
    if (updates.sourceRef !== undefined)
      updateData.sourceRef = updates.sourceRef
    if (updates.isPublic !== undefined) updateData.isPublic = updates.isPublic
    if (updates.isDefault !== undefined)
      updateData.isDefault = updates.isDefault
    if (updates.autoUpdate !== undefined)
      updateData.autoUpdate = updates.autoUpdate

    await db()
      .update(marketplace)
      .set(updateData)
      .where(eq(marketplace.id, mkt.id))

    const updated = await db().query.marketplace.findFirst({
      where: eq(marketplace.id, mkt.id),
    })

    return c.json({ marketplace: updated })
  }
)

adminMarketplaces.delete("/:slug", async (c) => {
  const slug = c.req.param("slug")

  const mkt = await db().query.marketplace.findFirst({
    where: eq(marketplace.slug, slug),
  })

  if (!mkt) {
    throw ApiError.notFound("Marketplace not found")
  }

  await db().delete(marketplace).where(eq(marketplace.id, mkt.id))

  return c.json({ message: "Marketplace deleted successfully" })
})

adminMarketplaces.get(
  "/plugins",
  zValidator("query", listPluginsQuerySchema),
  async (c) => {
    const query = c.req.valid("query")

    const limit = Math.min(Math.max(query.limit || 20, 1), 100)
    const offset = Math.max(query.offset || 0, 0)

    const baseQuery = db()
      .select({
        id: plugin.id,
        slug: plugin.slug,
        name: plugin.name,
        description: plugin.description,
        iconUrl: plugin.iconUrl,
        isVerified: plugin.isVerified,
        isFeatured: plugin.isFeatured,
        downloadCount: plugin.downloadCount,
        marketplaceId: plugin.marketplaceId,
        marketplaceSlug: marketplace.slug,
        marketplaceName: marketplace.name,
      })
      .from(plugin)
      .innerJoin(marketplace, eq(plugin.marketplaceId, marketplace.id))

    let filteredQuery = baseQuery.$dynamic()

    if (query.marketplaceSlug) {
      filteredQuery = filteredQuery.where(
        eq(marketplace.slug, query.marketplaceSlug)
      )
    }

    if (query.search) {
      const searchTerm = `%${query.search}%`
      filteredQuery = filteredQuery.where(
        or(like(plugin.name, searchTerm), like(plugin.slug, searchTerm))
      )
    }

    if (query.isVerified !== undefined) {
      filteredQuery = filteredQuery.where(
        eq(plugin.isVerified, query.isVerified)
      )
    }

    if (query.isFeatured !== undefined) {
      filteredQuery = filteredQuery.where(
        eq(plugin.isFeatured, query.isFeatured)
      )
    }

    const [plugins, countResult] = await Promise.all([
      filteredQuery.orderBy(asc(plugin.name)).limit(limit).offset(offset),
      db()
        .select({ count: sql<number>`count(*)` })
        .from(plugin),
    ])

    const total = Number(countResult[0]?.count ?? 0)

    const formattedPlugins = plugins.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      iconUrl: p.iconUrl,
      isVerified: p.isVerified,
      isFeatured: p.isFeatured,
      downloadCount: p.downloadCount,
      marketplace: {
        id: p.marketplaceId,
        slug: p.marketplaceSlug,
        name: p.marketplaceName,
      },
    }))

    return c.json({
      data: formattedPlugins,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + plugins.length < total,
      },
    })
  }
)

adminMarketplaces.post(
  "/plugins/:pluginId/verify",
  zValidator("json", verifyPluginSchema),
  async (c) => {
    const pluginId = c.req.param("pluginId")
    const { verified } = c.req.valid("json")

    const plg = await db().query.plugin.findFirst({
      where: eq(plugin.id, pluginId),
    })

    if (!plg) {
      throw ApiError.notFound("Plugin not found")
    }

    await db()
      .update(plugin)
      .set({
        isVerified: verified,
        updatedAt: new Date(),
      })
      .where(eq(plugin.id, pluginId))

    const updated = await db().query.plugin.findFirst({
      where: eq(plugin.id, pluginId),
    })

    return c.json({ plugin: updated })
  }
)

adminMarketplaces.post(
  "/plugins/:pluginId/feature",
  zValidator("json", featurePluginSchema),
  async (c) => {
    const pluginId = c.req.param("pluginId")
    const { featured } = c.req.valid("json")

    const plg = await db().query.plugin.findFirst({
      where: eq(plugin.id, pluginId),
    })

    if (!plg) {
      throw ApiError.notFound("Plugin not found")
    }

    await db()
      .update(plugin)
      .set({
        isFeatured: featured,
        updatedAt: new Date(),
      })
      .where(eq(plugin.id, pluginId))

    const updated = await db().query.plugin.findFirst({
      where: eq(plugin.id, pluginId),
    })

    return c.json({ plugin: updated })
  }
)

adminMarketplaces.delete("/plugins/:pluginId", async (c) => {
  const pluginId = c.req.param("pluginId")

  const plg = await db().query.plugin.findFirst({
    where: eq(plugin.id, pluginId),
  })

  if (!plg) {
    throw ApiError.notFound("Plugin not found")
  }

  await db().delete(plugin).where(eq(plugin.id, pluginId))

  return c.json({ message: "Plugin deleted successfully" })
})

export default adminMarketplaces
