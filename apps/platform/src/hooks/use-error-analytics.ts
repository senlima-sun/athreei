"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchApi } from "@/lib/api"
import { useActiveOrganizationSafe } from "@/lib/auth-client"

interface ErrorOverview {
  total: number
  errors: number
  success: number
  errorRate: number
}

interface ToolErrorStats {
  toolName: string
  total: number
  errors: number
  errorRate: number
}

interface ServerErrorStats {
  serverId: string | null
  total: number
  errors: number
  errorRate: number
}

interface CommonMessage {
  message: string
  count: number
}

interface ErrorTrend {
  date: string
  total: number
  errors: number
  errorRate: number
}

interface AnalyticsParams {
  startDate?: string
  endDate?: string
}

export function useErrorOverview(params?: AnalyticsParams) {
  const { data: activeOrg, isPending: isOrgPending } =
    useActiveOrganizationSafe()

  return useQuery<{ overview: ErrorOverview }>({
    queryKey: ["analytics", "errors", "overview", activeOrg?.id, params],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        organizationId: activeOrg!.id,
      })
      if (params?.startDate) queryParams.set("startDate", params.startDate)
      if (params?.endDate) queryParams.set("endDate", params.endDate)

      return fetchApi<{ overview: ErrorOverview }>(
        `/api/analytics/errors/overview?${queryParams.toString()}`
      )
    },
    enabled: !isOrgPending && !!activeOrg?.id,
  })
}

export function useErrorsByTool(params?: AnalyticsParams) {
  const { data: activeOrg, isPending: isOrgPending } =
    useActiveOrganizationSafe()

  return useQuery<{ byTool: ToolErrorStats[] }>({
    queryKey: ["analytics", "errors", "by-tool", activeOrg?.id, params],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        organizationId: activeOrg!.id,
      })
      if (params?.startDate) queryParams.set("startDate", params.startDate)
      if (params?.endDate) queryParams.set("endDate", params.endDate)

      return fetchApi<{ byTool: ToolErrorStats[] }>(
        `/api/analytics/errors/by-tool?${queryParams.toString()}`
      )
    },
    enabled: !isOrgPending && !!activeOrg?.id,
  })
}

export function useErrorsByServer(params?: AnalyticsParams) {
  const { data: activeOrg, isPending: isOrgPending } =
    useActiveOrganizationSafe()

  return useQuery<{ byServer: ServerErrorStats[] }>({
    queryKey: ["analytics", "errors", "by-server", activeOrg?.id, params],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        organizationId: activeOrg!.id,
      })
      if (params?.startDate) queryParams.set("startDate", params.startDate)
      if (params?.endDate) queryParams.set("endDate", params.endDate)

      return fetchApi<{ byServer: ServerErrorStats[] }>(
        `/api/analytics/errors/by-server?${queryParams.toString()}`
      )
    },
    enabled: !isOrgPending && !!activeOrg?.id,
  })
}

export function useCommonErrorMessages(params?: AnalyticsParams) {
  const { data: activeOrg, isPending: isOrgPending } =
    useActiveOrganizationSafe()

  return useQuery<{ commonMessages: CommonMessage[] }>({
    queryKey: ["analytics", "errors", "common-messages", activeOrg?.id, params],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        organizationId: activeOrg!.id,
      })
      if (params?.startDate) queryParams.set("startDate", params.startDate)
      if (params?.endDate) queryParams.set("endDate", params.endDate)

      return fetchApi<{ commonMessages: CommonMessage[] }>(
        `/api/analytics/errors/common-messages?${queryParams.toString()}`
      )
    },
    enabled: !isOrgPending && !!activeOrg?.id,
  })
}

export function useErrorTrend(params?: AnalyticsParams) {
  const { data: activeOrg, isPending: isOrgPending } =
    useActiveOrganizationSafe()

  return useQuery<{ trend: ErrorTrend[] }>({
    queryKey: ["analytics", "errors", "trend", activeOrg?.id, params],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        organizationId: activeOrg!.id,
      })
      if (params?.startDate) queryParams.set("startDate", params.startDate)
      if (params?.endDate) queryParams.set("endDate", params.endDate)

      return fetchApi<{ trend: ErrorTrend[] }>(
        `/api/analytics/errors/trend?${queryParams.toString()}`
      )
    },
    enabled: !isOrgPending && !!activeOrg?.id,
  })
}
