import type { Context } from "hono"
import { eq, and, or, like, sql, asc } from "drizzle-orm"
import { getAuthContext, ApiError } from "../../middleware"
import { db } from "../../lib/db-operations"
import { marketplace } from "@athreei/db"
import {
  verifyOrganizationMembership,
  generateMarketplaceId,
} from "../../services"
import type {
  CreateMarketplaceInput,
  UpdateMarketplaceInput,
  ListMarketplacesQuery,
} from "../../schemas/marketplaces"

export async function listMarketplaces(c: Context): Promise<Response> {
  const auth = c.get("auth") as { userId: string } | undefined
  const query = c.req.query() as unknown as ListMarketplacesQuery

  const limit = Math.min(Math.max(query.limit || 20, 1), 100)
  const offset = Math.max(query.offset || 0, 0)

  const conditions: ReturnType<typeof eq>[] = []

  if (query.isPublic !== undefined) {
    if (query.isPublic) {
      conditions.push(eq(marketplace.isPublic, true))
    }
  } else if (!auth) {
    conditions.push(eq(marketplace.isPublic, true))
  }

  if (query.ownerType) {
    conditions.push(eq(marketplace.ownerType, query.ownerType))
  }

  if (query.search) {
    const searchTerm = `%${query.search.slice(0, 200)}%`
    conditions.push(
      or(
        like(marketplace.name, searchTerm),
        like(marketplace.description, searchTerm)
      )!
    )
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

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
      .where(whereClause)
      .orderBy(asc(marketplace.name))
      .limit(limit)
      .offset(offset),
    db()
      .select({ count: sql<number>`count(*)` })
      .from(marketplace)
      .where(whereClause),
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

export async function getMarketplace(c: Context): Promise<Response> {
  const auth = c.get("auth") as { userId: string } | undefined
  const slug = c.req.param("slug")

  const result = await db()
    .select({
      id: marketplace.id,
      slug: marketplace.slug,
      name: marketplace.name,
      description: marketplace.description,
      ownerType: marketplace.ownerType,
      ownerId: marketplace.ownerId,
      sourceType: marketplace.sourceType,
      sourceUrl: marketplace.sourceUrl,
      sourceRepo: marketplace.sourceRepo,
      sourceRef: marketplace.sourceRef,
      isPublic: marketplace.isPublic,
      isDefault: marketplace.isDefault,
      autoUpdate: marketplace.autoUpdate,
      lastSyncedAt: marketplace.lastSyncedAt,
      createdAt: marketplace.createdAt,
      updatedAt: marketplace.updatedAt,
      pluginCount: sql<number>`(
        SELECT COUNT(*) FROM plugin WHERE plugin.marketplace_id = marketplace.id
      )`.as("plugin_count"),
      installCount: sql<number>`(
        SELECT COUNT(*) FROM plugin_installation pi
        INNER JOIN plugin p ON pi.plugin_id = p.id
        WHERE p.marketplace_id = marketplace.id
      )`.as("install_count"),
    })
    .from(marketplace)
    .where(eq(marketplace.slug, slug))
    .limit(1)

  const mkt = result[0]
  if (!mkt) {
    throw ApiError.notFound("Marketplace not found")
  }

  if (!mkt.isPublic && mkt.ownerType === "organization" && mkt.ownerId) {
    if (!auth) {
      throw ApiError.forbidden("Access denied")
    }
    const isMember = await verifyOrganizationMembership(auth.userId, mkt.ownerId)
    if (!isMember) {
      throw ApiError.forbidden("Access denied")
    }
  }

  return c.json({ marketplace: mkt })
}

export async function createMarketplace(c: Context): Promise<Response> {
  const auth = getAuthContext(c)
  const body = (
    c.req as unknown as { valid: (target: "json") => CreateMarketplaceInput }
  ).valid("json")

  const organizationId = c.req.query("organizationId")
  if (!organizationId) {
    throw ApiError.badRequest("organizationId query parameter is required")
  }

  const isMember = await verifyOrganizationMembership(auth.userId, organizationId)
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  const existing = await db().query.marketplace.findFirst({
    where: eq(marketplace.slug, body.slug),
  })
  if (existing) {
    throw ApiError.conflict("A marketplace with this slug already exists")
  }

  const now = new Date()
  const id = generateMarketplaceId()

  await db().insert(marketplace).values({
    id,
    slug: body.slug,
    name: body.name,
    description: body.description || null,
    ownerType: "organization",
    ownerId: organizationId,
    sourceType: body.sourceType || "internal",
    sourceUrl: body.sourceUrl || null,
    sourceRepo: body.sourceRepo || null,
    sourceRef: body.sourceRef || null,
    isPublic: body.isPublic ?? false,
    isDefault: false,
    autoUpdate: body.autoUpdate ?? true,
    createdAt: now,
    updatedAt: now,
  })

  const created = await db().query.marketplace.findFirst({
    where: eq(marketplace.id, id),
  })

  return c.json({ marketplace: created }, 201)
}

export async function updateMarketplace(c: Context): Promise<Response> {
  const auth = getAuthContext(c)
  const slug = c.req.param("slug")
  const updates = (
    c.req as unknown as { valid: (target: "json") => UpdateMarketplaceInput }
  ).valid("json")

  const mkt = await db().query.marketplace.findFirst({
    where: eq(marketplace.slug, slug),
  })

  if (!mkt) {
    throw ApiError.notFound("Marketplace not found")
  }

  if (mkt.ownerType === "organization" && mkt.ownerId) {
    const isMember = await verifyOrganizationMembership(auth.userId, mkt.ownerId)
    if (!isMember) {
      throw ApiError.forbidden("You do not have access to this marketplace")
    }
  } else if (mkt.ownerType === "system") {
    throw ApiError.forbidden("System marketplaces can only be updated by admins")
  }

  const updateData: Partial<typeof marketplace.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.description !== undefined)
    updateData.description = updates.description
  if (updates.sourceType !== undefined) updateData.sourceType = updates.sourceType
  if (updates.sourceUrl !== undefined) updateData.sourceUrl = updates.sourceUrl
  if (updates.sourceRepo !== undefined) updateData.sourceRepo = updates.sourceRepo
  if (updates.sourceRef !== undefined) updateData.sourceRef = updates.sourceRef
  if (updates.isPublic !== undefined) updateData.isPublic = updates.isPublic
  if (updates.autoUpdate !== undefined) updateData.autoUpdate = updates.autoUpdate

  await db().update(marketplace).set(updateData).where(eq(marketplace.id, mkt.id))

  const updated = await db().query.marketplace.findFirst({
    where: eq(marketplace.id, mkt.id),
  })

  return c.json({ marketplace: updated })
}

export async function deleteMarketplace(c: Context): Promise<Response> {
  const auth = getAuthContext(c)
  const slug = c.req.param("slug")

  const mkt = await db().query.marketplace.findFirst({
    where: eq(marketplace.slug, slug),
  })

  if (!mkt) {
    throw ApiError.notFound("Marketplace not found")
  }

  if (mkt.ownerType === "organization" && mkt.ownerId) {
    const isMember = await verifyOrganizationMembership(auth.userId, mkt.ownerId)
    if (!isMember) {
      throw ApiError.forbidden("You do not have access to this marketplace")
    }
  } else if (mkt.ownerType === "system") {
    throw ApiError.forbidden("System marketplaces can only be deleted by admins")
  }

  await db().delete(marketplace).where(eq(marketplace.id, mkt.id))

  return c.json({ message: "Marketplace deleted successfully" })
}
