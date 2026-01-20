"use client"

import { useQuery, useInfiniteQuery } from "@tanstack/react-query"
import { fetchApi } from "@/lib/api"
import { useActiveOrganizationSafe } from "@/lib/auth-client"
import type {
  PluginSearchResult,
  Plugin,
  PluginVersion,
  PluginVersionSummary,
  ListPluginsParams,
} from "@/types/marketplace"

interface PluginsResponse {
  plugins: PluginSearchResult[]
  total: number
  hasMore: boolean
}

interface PluginDetailResponse {
  plugin: Plugin
}

interface PluginVersionsResponse {
  versions: PluginVersionSummary[]
}

interface PluginVersionDetailResponse {
  version: PluginVersion
}

export function usePlugins(params: ListPluginsParams = {}) {
  const { data: activeOrg } = useActiveOrganizationSafe()
  const {
    search,
    marketplaceSlug,
    category,
    tags,
    componentType,
    transport,
    isVerified,
    isFeatured,
    sort = "popularity",
    limit = 20,
  } = params

  return useInfiniteQuery<PluginsResponse>({
    queryKey: [
      "plugins",
      "list",
      search,
      marketplaceSlug,
      category,
      tags,
      componentType,
      transport,
      isVerified,
      isFeatured,
      sort,
      limit,
      activeOrg?.id,
    ],
    queryFn: async ({ pageParam }) => {
      const queryParams = new URLSearchParams()
      if (search) queryParams.set("search", search)
      if (marketplaceSlug) queryParams.set("marketplaceSlug", marketplaceSlug)
      if (category) queryParams.set("category", category)
      if (tags) queryParams.set("tags", tags)
      if (componentType) queryParams.set("componentType", componentType)
      if (transport) queryParams.set("transport", transport)
      if (isVerified !== undefined)
        queryParams.set("isVerified", String(isVerified))
      if (isFeatured !== undefined)
        queryParams.set("isFeatured", String(isFeatured))
      queryParams.set("sort", sort)
      queryParams.set("limit", String(limit))
      queryParams.set("offset", String(pageParam))
      if (activeOrg?.id) queryParams.set("organizationId", activeOrg.id)

      const path = `/api/plugins?${queryParams.toString()}`

      const result = await fetchApi<{
        plugins: PluginSearchResult[]
        total: number
      }>(path)
      return {
        plugins: result.plugins,
        total: result.total,
        hasMore: (pageParam as number) + limit < result.total,
      }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined
      return allPages.length * limit
    },
  })
}

export function usePlugin(
  marketplaceSlug: string | undefined,
  pluginSlug: string | undefined
) {
  const { data: activeOrg } = useActiveOrganizationSafe()

  return useQuery<PluginDetailResponse>({
    queryKey: ["plugins", "detail", marketplaceSlug, pluginSlug, activeOrg?.id],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (activeOrg?.id) queryParams.set("organizationId", activeOrg.id)
      const queryString = queryParams.toString()
      const path = `/api/plugins/${marketplaceSlug}/${pluginSlug}${queryString ? `?${queryString}` : ""}`

      return fetchApi<PluginDetailResponse>(path)
    },
    enabled: !!marketplaceSlug && !!pluginSlug,
  })
}

export function usePluginVersions(
  marketplaceSlug: string | undefined,
  pluginSlug: string | undefined
) {
  const { data: activeOrg } = useActiveOrganizationSafe()

  return useQuery<PluginVersionsResponse>({
    queryKey: [
      "plugins",
      "versions",
      marketplaceSlug,
      pluginSlug,
      activeOrg?.id,
    ],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (activeOrg?.id) queryParams.set("organizationId", activeOrg.id)
      const queryString = queryParams.toString()
      const path = `/api/plugins/${marketplaceSlug}/${pluginSlug}/versions${queryString ? `?${queryString}` : ""}`

      return fetchApi<PluginVersionsResponse>(path)
    },
    enabled: !!marketplaceSlug && !!pluginSlug,
  })
}

export function usePluginVersion(
  marketplaceSlug: string | undefined,
  pluginSlug: string | undefined,
  version: string | undefined
) {
  const { data: activeOrg } = useActiveOrganizationSafe()

  return useQuery<PluginVersionDetailResponse>({
    queryKey: [
      "plugins",
      "version",
      marketplaceSlug,
      pluginSlug,
      version,
      activeOrg?.id,
    ],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (activeOrg?.id) queryParams.set("organizationId", activeOrg.id)
      const queryString = queryParams.toString()
      const path = `/api/plugins/${marketplaceSlug}/${pluginSlug}/versions/${version}${queryString ? `?${queryString}` : ""}`

      return fetchApi<PluginVersionDetailResponse>(path)
    },
    enabled: !!marketplaceSlug && !!pluginSlug && !!version,
  })
}
