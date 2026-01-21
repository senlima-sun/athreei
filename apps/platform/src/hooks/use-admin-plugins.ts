"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchApi } from "@/lib/api"

export interface AdminPlugin {
  id: string
  slug: string
  name: string
  description: string | null
  iconUrl: string | null
  isVerified: boolean
  isFeatured: boolean
  downloadCount: string
  marketplace: {
    id: string
    slug: string
    name: string
  }
}

export interface ListAdminPluginsOptions {
  limit?: number
  offset?: number
  marketplaceSlug?: string
  search?: string
  isVerified?: boolean
  isFeatured?: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

export function useAdminPlugins(options: ListAdminPluginsOptions = {}) {
  const {
    limit = 50,
    offset = 0,
    marketplaceSlug,
    search,
    isVerified,
    isFeatured,
  } = options

  return useQuery<PaginatedResponse<AdminPlugin>>({
    queryKey: ["admin-plugins", options],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      queryParams.set("limit", String(limit))
      queryParams.set("offset", String(offset))
      if (marketplaceSlug) queryParams.set("marketplaceSlug", marketplaceSlug)
      if (search) queryParams.set("search", search)
      if (isVerified !== undefined)
        queryParams.set("isVerified", String(isVerified))
      if (isFeatured !== undefined)
        queryParams.set("isFeatured", String(isFeatured))

      const queryString = queryParams.toString()
      const path = `/api/admin/marketplaces/plugins${queryString ? `?${queryString}` : ""}`

      return fetchApi<PaginatedResponse<AdminPlugin>>(path)
    },
  })
}
