"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchApi } from "@/lib/api"
import type {
  MarketplaceOwnerType,
  MarketplaceSourceType,
} from "@/types/marketplace"

export interface AdminMarketplace {
  id: string
  slug: string
  name: string
  description: string | null
  ownerType: MarketplaceOwnerType
  ownerId: string | null
  sourceType: MarketplaceSourceType
  sourceUrl: string | null
  sourceRepo: string | null
  sourceRef: string | null
  isPublic: boolean
  isDefault: boolean
  autoUpdate: boolean
  lastSyncedAt: string | null
  pluginCount: number
  createdAt: string
  updatedAt: string
}

export interface CreateMarketplaceInput {
  slug: string
  name: string
  description?: string
  ownerType?: MarketplaceOwnerType
  ownerId?: string
  sourceType?: MarketplaceSourceType
  sourceUrl?: string
  sourceRepo?: string
  sourceRef?: string
  isPublic?: boolean
  isDefault?: boolean
  autoUpdate?: boolean
}

export interface UpdateMarketplaceInput {
  name?: string
  description?: string
  ownerType?: MarketplaceOwnerType
  ownerId?: string
  sourceType?: MarketplaceSourceType
  sourceUrl?: string
  sourceRepo?: string
  sourceRef?: string
  isPublic?: boolean
  isDefault?: boolean
  autoUpdate?: boolean
}

export interface ListAdminMarketplacesOptions {
  limit?: number
  offset?: number
  ownerType?: MarketplaceOwnerType
  sourceType?: MarketplaceSourceType
  search?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

interface AdminMarketplacesResponse {
  data: AdminMarketplace[]
  pagination: {
    limit: number
    offset: number
    total: number
    hasMore: boolean
  }
}

interface AdminMarketplaceResponse {
  marketplace: AdminMarketplace
}

export function useAdminMarketplaces(
  options: ListAdminMarketplacesOptions = {}
) {
  const { limit = 20, offset = 0, ownerType, sourceType, search } = options

  return useQuery<PaginatedResponse<AdminMarketplace>>({
    queryKey: ["admin-marketplaces", options],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      queryParams.set("limit", String(limit))
      queryParams.set("offset", String(offset))
      if (ownerType) queryParams.set("ownerType", ownerType)
      if (sourceType) queryParams.set("sourceType", sourceType)
      if (search) queryParams.set("search", search)

      const queryString = queryParams.toString()
      const path = `/api/admin/marketplaces${queryString ? `?${queryString}` : ""}`

      const result = await fetchApi<AdminMarketplacesResponse>(path)

      return {
        data: result.data,
        total: result.pagination.total,
        limit: result.pagination.limit,
        offset: result.pagination.offset,
        hasMore: result.pagination.hasMore,
      }
    },
  })
}

export function useAdminMarketplace(slug: string | undefined) {
  return useQuery<AdminMarketplaceResponse>({
    queryKey: ["admin-marketplace", slug],
    queryFn: async () => {
      return fetchApi<AdminMarketplaceResponse>(
        `/api/admin/marketplaces/${slug}`
      )
    },
    enabled: !!slug,
  })
}

export function useCreateMarketplace() {
  const queryClient = useQueryClient()

  return useMutation<AdminMarketplaceResponse, Error, CreateMarketplaceInput>({
    mutationFn: async (input) => {
      return fetchApi<AdminMarketplaceResponse>("/api/admin/marketplaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketplaces"] })
    },
  })
}

export function useUpdateMarketplace() {
  const queryClient = useQueryClient()

  return useMutation<
    AdminMarketplaceResponse,
    Error,
    { slug: string; updates: UpdateMarketplaceInput }
  >({
    mutationFn: async ({ slug, updates }) => {
      return fetchApi<AdminMarketplaceResponse>(
        `/api/admin/marketplaces/${slug}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      )
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketplaces"] })
      queryClient.invalidateQueries({
        queryKey: ["admin-marketplace", variables.slug],
      })
    },
  })
}

export function useDeleteMarketplace() {
  const queryClient = useQueryClient()

  return useMutation<{ message: string }, Error, string>({
    mutationFn: async (slug) => {
      return fetchApi<{ message: string }>(`/api/admin/marketplaces/${slug}`, {
        method: "DELETE",
      })
    },
    onSuccess: (_data, slug) => {
      queryClient.invalidateQueries({ queryKey: ["admin-marketplaces"] })
      queryClient.removeQueries({ queryKey: ["admin-marketplace", slug] })
    },
  })
}
