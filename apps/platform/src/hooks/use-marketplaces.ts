"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchApi } from "@/lib/api"
import type { Marketplace, ListMarketplacesParams } from "@/types/marketplace"

interface MarketplacesResponse {
  marketplaces: Marketplace[]
  total: number
}

interface MarketplaceResponse {
  marketplace: Marketplace
}

export function useMarketplaces(params: ListMarketplacesParams = {}) {
  const { search, ownerType, isPublic, limit = 20, offset = 0 } = params

  return useQuery<MarketplacesResponse>({
    queryKey: [
      "marketplaces",
      "list",
      search,
      ownerType,
      isPublic,
      limit,
      offset,
    ],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (search) queryParams.set("search", search)
      if (ownerType) queryParams.set("ownerType", ownerType)
      if (isPublic !== undefined) queryParams.set("isPublic", String(isPublic))
      queryParams.set("limit", String(limit))
      queryParams.set("offset", String(offset))

      const queryString = queryParams.toString()
      const path = `/api/marketplaces${queryString ? `?${queryString}` : ""}`

      return fetchApi<MarketplacesResponse>(path)
    },
  })
}

export function useMarketplace(slug: string | undefined) {
  return useQuery<MarketplaceResponse>({
    queryKey: ["marketplaces", "detail", slug],
    queryFn: async () => {
      return fetchApi<MarketplaceResponse>(`/api/marketplaces/${slug}`)
    },
    enabled: !!slug,
  })
}
