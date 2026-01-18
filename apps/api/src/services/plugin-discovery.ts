import { eq, and, or, like, sql, desc, asc, inArray } from "drizzle-orm"
import { db } from "../lib/db-operations"
import {
  marketplace,
  plugin,
  pluginVersion,
  pluginComponent,
  pluginInstallation,
  organizationMarketplaceSetting,
} from "@athreei/db"
import type { ListPluginsQuery } from "../schemas/marketplaces"

function safeJsonParse<T>(value: string | null | undefined, defaultValue: T): T {
  if (!value) return defaultValue
  try {
    return JSON.parse(value) as T
  } catch {
    return defaultValue
  }
}

export interface PluginSearchResult {
  id: string
  slug: string
  name: string
  description: string | null
  category: string | null
  tags: string[]
  author: string | null
  iconUrl: string | null
  isVerified: boolean
  isFeatured: boolean
  downloadCount: number
  marketplace: {
    id: string
    slug: string
    name: string
  }
  latestVersion: {
    id: string
    version: string
    publishedAt: Date
  } | null
}

export interface PluginDetails {
  id: string
  slug: string
  name: string
  description: string | null
  category: string | null
  tags: string[]
  author: string | null
  homepage: string | null
  repository: string | null
  license: string | null
  iconUrl: string | null
  isVerified: boolean
  isFeatured: boolean
  downloadCount: number
  createdAt: Date
  updatedAt: Date
  marketplace: {
    id: string
    slug: string
    name: string
  }
  versions: Array<{
    id: string
    version: string
    changelog: string | null
    isLatest: boolean
    publishedAt: Date
  }>
  components: Array<{
    id: string
    type: string
    name: string
    description: string | null
  }>
  installationStatus?: {
    installed: boolean
    installedVersion?: string
    installationId?: string
  }
}

export async function getOrgMarketplaceRestrictions(
  organizationId: string
): Promise<{
  restrictMarketplaces: boolean
  allowedMarketplaceIds: string[]
  restrictPlugins: boolean
  allowedPluginIds: string[]
} | null> {
  const settings = await db().query.organizationMarketplaceSetting.findFirst({
    where: eq(organizationMarketplaceSetting.organizationId, organizationId),
  })

  if (!settings) return null

  return {
    restrictMarketplaces: settings.restrictMarketplaces,
    allowedMarketplaceIds: safeJsonParse<string[]>(
      settings.allowedMarketplaceIds,
      []
    ),
    restrictPlugins: settings.restrictPlugins,
    allowedPluginIds: safeJsonParse<string[]>(settings.allowedPluginIds, []),
  }
}

export async function searchPlugins(
  params: ListPluginsQuery,
  organizationId?: string
): Promise<{
  data: PluginSearchResult[]
  pagination: { limit: number; offset: number; total: number; hasMore: boolean }
}> {
  const limit = Math.min(Math.max(params.limit || 20, 1), 100)
  const offset = Math.max(params.offset || 0, 0)

  const conditions: ReturnType<typeof eq>[] = []

  conditions.push(eq(marketplace.isPublic, true))

  if (params.marketplaceSlug) {
    conditions.push(eq(marketplace.slug, params.marketplaceSlug))
  }

  if (params.search) {
    const searchTerm = `%${params.search.slice(0, 200)}%`
    const searchCondition = or(
      like(plugin.name, searchTerm),
      like(plugin.description, searchTerm)
    )
    if (searchCondition) {
      conditions.push(searchCondition)
    }
  }

  if (params.category) {
    conditions.push(eq(plugin.category, params.category))
  }

  if (params.isVerified !== undefined) {
    conditions.push(eq(plugin.isVerified, params.isVerified))
  }

  if (params.isFeatured !== undefined) {
    conditions.push(eq(plugin.isFeatured, params.isFeatured))
  }

  let restrictions: Awaited<ReturnType<typeof getOrgMarketplaceRestrictions>> =
    null
  if (organizationId) {
    restrictions = await getOrgMarketplaceRestrictions(organizationId)
  }

  if (restrictions?.restrictMarketplaces) {
    if (restrictions.allowedMarketplaceIds.length > 0) {
      conditions.push(
        inArray(marketplace.id, restrictions.allowedMarketplaceIds)
      )
    } else {
      conditions.push(sql`1 = 0`)
    }
  }

  if (restrictions?.restrictPlugins) {
    if (restrictions.allowedPluginIds.length > 0) {
      conditions.push(inArray(plugin.id, restrictions.allowedPluginIds))
    } else {
      conditions.push(sql`1 = 0`)
    }
  }

  let orderByClause
  switch (params.sort) {
    case "recent":
      orderByClause = desc(plugin.createdAt)
      break
    case "name":
      orderByClause = asc(plugin.name)
      break
    case "popularity":
    default:
      orderByClause = desc(sql`CAST(${plugin.downloadCount} AS INTEGER)`)
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined

  const [plugins, countResult] = await Promise.all([
    db()
      .select({
        id: plugin.id,
        slug: plugin.slug,
        name: plugin.name,
        description: plugin.description,
        category: plugin.category,
        tags: plugin.tags,
        author: plugin.author,
        iconUrl: plugin.iconUrl,
        isVerified: plugin.isVerified,
        isFeatured: plugin.isFeatured,
        downloadCount: plugin.downloadCount,
        marketplaceId: marketplace.id,
        marketplaceSlug: marketplace.slug,
        marketplaceName: marketplace.name,
      })
      .from(plugin)
      .innerJoin(marketplace, eq(plugin.marketplaceId, marketplace.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset),
    db()
      .select({ count: sql<number>`count(*)` })
      .from(plugin)
      .innerJoin(marketplace, eq(plugin.marketplaceId, marketplace.id))
      .where(whereClause),
  ])

  const total = Number(countResult[0]?.count ?? 0)

  const pluginIds = plugins.map((p) => p.id)
  const latestVersions =
    pluginIds.length > 0
      ? await db()
          .select({
            pluginId: pluginVersion.pluginId,
            id: pluginVersion.id,
            version: pluginVersion.version,
            publishedAt: pluginVersion.publishedAt,
          })
          .from(pluginVersion)
          .where(
            and(
              inArray(pluginVersion.pluginId, pluginIds),
              eq(pluginVersion.isLatest, true)
            )
          )
      : []

  const versionMap = new Map(latestVersions.map((v) => [v.pluginId, v]))

  const data: PluginSearchResult[] = plugins.map((p) => {
    const latestVersion = versionMap.get(p.id)
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      category: p.category,
      tags: safeJsonParse<string[]>(p.tags, []),
      author: p.author,
      iconUrl: p.iconUrl,
      isVerified: p.isVerified,
      isFeatured: p.isFeatured,
      downloadCount: parseInt(p.downloadCount, 10),
      marketplace: {
        id: p.marketplaceId,
        slug: p.marketplaceSlug,
        name: p.marketplaceName,
      },
      latestVersion: latestVersion
        ? {
            id: latestVersion.id,
            version: latestVersion.version,
            publishedAt: latestVersion.publishedAt,
          }
        : null,
    }
  })

  return {
    data,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + data.length < total,
    },
  }
}

export async function getPluginDetails(
  marketplaceSlug: string,
  pluginSlug: string,
  organizationId?: string
): Promise<PluginDetails | null> {
  const result = await db()
    .select({
      id: plugin.id,
      slug: plugin.slug,
      name: plugin.name,
      description: plugin.description,
      category: plugin.category,
      tags: plugin.tags,
      author: plugin.author,
      homepage: plugin.homepage,
      repository: plugin.repository,
      license: plugin.license,
      iconUrl: plugin.iconUrl,
      isVerified: plugin.isVerified,
      isFeatured: plugin.isFeatured,
      downloadCount: plugin.downloadCount,
      createdAt: plugin.createdAt,
      updatedAt: plugin.updatedAt,
      marketplaceId: marketplace.id,
      marketplaceSlug: marketplace.slug,
      marketplaceName: marketplace.name,
      marketplaceIsPublic: marketplace.isPublic,
    })
    .from(plugin)
    .innerJoin(marketplace, eq(plugin.marketplaceId, marketplace.id))
    .where(
      and(eq(marketplace.slug, marketplaceSlug), eq(plugin.slug, pluginSlug))
    )
    .limit(1)

  const p = result[0]
  if (!p) return null

  if (!p.marketplaceIsPublic) {
    if (!organizationId) {
      return null
    }
    const restrictions = await getOrgMarketplaceRestrictions(organizationId)
    if (restrictions?.restrictMarketplaces) {
      if (restrictions.allowedMarketplaceIds.length === 0) {
        return null
      }
      if (!restrictions.allowedMarketplaceIds.includes(p.marketplaceId)) {
        return null
      }
    }
    if (restrictions?.restrictPlugins) {
      if (restrictions.allowedPluginIds.length === 0) {
        return null
      }
      if (!restrictions.allowedPluginIds.includes(p.id)) {
        return null
      }
    }
  } else if (organizationId) {
    const restrictions = await getOrgMarketplaceRestrictions(organizationId)
    if (restrictions?.restrictMarketplaces) {
      if (restrictions.allowedMarketplaceIds.length === 0) {
        return null
      }
      if (!restrictions.allowedMarketplaceIds.includes(p.marketplaceId)) {
        return null
      }
    }
    if (restrictions?.restrictPlugins) {
      if (restrictions.allowedPluginIds.length === 0) {
        return null
      }
      if (!restrictions.allowedPluginIds.includes(p.id)) {
        return null
      }
    }
  }

  const versions = await db()
    .select({
      id: pluginVersion.id,
      version: pluginVersion.version,
      changelog: pluginVersion.changelog,
      isLatest: pluginVersion.isLatest,
      publishedAt: pluginVersion.publishedAt,
    })
    .from(pluginVersion)
    .where(eq(pluginVersion.pluginId, p.id))
    .orderBy(desc(pluginVersion.publishedAt))

  const latestVersion = versions.find((v) => v.isLatest)
  const components = latestVersion
    ? await db()
        .select({
          id: pluginComponent.id,
          type: pluginComponent.type,
          name: pluginComponent.name,
          description: pluginComponent.description,
        })
        .from(pluginComponent)
        .where(eq(pluginComponent.pluginVersionId, latestVersion.id))
    : []

  let installationStatus: PluginDetails["installationStatus"] = undefined
  if (organizationId) {
    const installation = await db().query.pluginInstallation.findFirst({
      where: and(
        eq(pluginInstallation.organizationId, organizationId),
        eq(pluginInstallation.pluginId, p.id)
      ),
    })

    if (installation) {
      const installedVersion = await db().query.pluginVersion.findFirst({
        where: eq(pluginVersion.id, installation.pluginVersionId),
      })
      installationStatus = {
        installed: true,
        installedVersion: installedVersion?.version,
        installationId: installation.id,
      }
    } else {
      installationStatus = { installed: false }
    }
  }

  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    category: p.category,
    tags: safeJsonParse<string[]>(p.tags, []),
    author: p.author,
    homepage: p.homepage,
    repository: p.repository,
    license: p.license,
    iconUrl: p.iconUrl,
    isVerified: p.isVerified,
    isFeatured: p.isFeatured,
    downloadCount: parseInt(p.downloadCount, 10),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    marketplace: {
      id: p.marketplaceId,
      slug: p.marketplaceSlug,
      name: p.marketplaceName,
    },
    versions,
    components,
    installationStatus,
  }
}

export async function getPluginVersions(
  marketplaceSlug: string,
  pluginSlug: string,
  organizationId?: string
): Promise<
  Array<{
    id: string
    version: string
    changelog: string | null
    isLatest: boolean
    publishedAt: Date
  }>
> {
  const p = await db()
    .select({
      id: plugin.id,
      marketplaceId: marketplace.id,
      marketplaceIsPublic: marketplace.isPublic,
    })
    .from(plugin)
    .innerJoin(marketplace, eq(plugin.marketplaceId, marketplace.id))
    .where(
      and(eq(marketplace.slug, marketplaceSlug), eq(plugin.slug, pluginSlug))
    )
    .limit(1)

  if (!p[0]) return []

  if (!p[0].marketplaceIsPublic) {
    if (!organizationId) {
      return []
    }
    const restrictions = await getOrgMarketplaceRestrictions(organizationId)
    if (restrictions?.restrictMarketplaces) {
      if (
        restrictions.allowedMarketplaceIds.length === 0 ||
        !restrictions.allowedMarketplaceIds.includes(p[0].marketplaceId)
      ) {
        return []
      }
    }
    if (restrictions?.restrictPlugins) {
      if (
        restrictions.allowedPluginIds.length === 0 ||
        !restrictions.allowedPluginIds.includes(p[0].id)
      ) {
        return []
      }
    }
  }

  return db()
    .select({
      id: pluginVersion.id,
      version: pluginVersion.version,
      changelog: pluginVersion.changelog,
      isLatest: pluginVersion.isLatest,
      publishedAt: pluginVersion.publishedAt,
    })
    .from(pluginVersion)
    .where(eq(pluginVersion.pluginId, p[0].id))
    .orderBy(desc(pluginVersion.publishedAt))
}

export async function getPluginVersionDetails(
  marketplaceSlug: string,
  pluginSlug: string,
  version: string,
  organizationId?: string
): Promise<{
  id: string
  version: string
  changelog: string | null
  manifest: unknown
  isLatest: boolean
  publishedAt: Date
  components: Array<{
    id: string
    type: string
    name: string
    description: string | null
    config: unknown
  }>
} | null> {
  const p = await db()
    .select({
      id: plugin.id,
      marketplaceId: marketplace.id,
      marketplaceIsPublic: marketplace.isPublic,
    })
    .from(plugin)
    .innerJoin(marketplace, eq(plugin.marketplaceId, marketplace.id))
    .where(
      and(eq(marketplace.slug, marketplaceSlug), eq(plugin.slug, pluginSlug))
    )
    .limit(1)

  if (!p[0]) return null

  if (!p[0].marketplaceIsPublic) {
    if (!organizationId) {
      return null
    }
    const restrictions = await getOrgMarketplaceRestrictions(organizationId)
    if (restrictions?.restrictMarketplaces) {
      if (
        restrictions.allowedMarketplaceIds.length === 0 ||
        !restrictions.allowedMarketplaceIds.includes(p[0].marketplaceId)
      ) {
        return null
      }
    }
    if (restrictions?.restrictPlugins) {
      if (
        restrictions.allowedPluginIds.length === 0 ||
        !restrictions.allowedPluginIds.includes(p[0].id)
      ) {
        return null
      }
    }
  }

  const v = await db()
    .select({
      id: pluginVersion.id,
      version: pluginVersion.version,
      changelog: pluginVersion.changelog,
      manifest: pluginVersion.manifest,
      isLatest: pluginVersion.isLatest,
      publishedAt: pluginVersion.publishedAt,
    })
    .from(pluginVersion)
    .where(
      and(
        eq(pluginVersion.pluginId, p[0].id),
        eq(pluginVersion.version, version)
      )
    )
    .limit(1)

  if (!v[0]) return null

  const components = await db()
    .select({
      id: pluginComponent.id,
      type: pluginComponent.type,
      name: pluginComponent.name,
      description: pluginComponent.description,
      config: pluginComponent.config,
    })
    .from(pluginComponent)
    .where(eq(pluginComponent.pluginVersionId, v[0].id))

  return {
    ...v[0],
    manifest: safeJsonParse<unknown>(v[0].manifest, {}),
    components: components.map((c) => ({
      ...c,
      config: safeJsonParse<unknown>(c.config, {}),
    })),
  }
}
