"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchApi } from "@/lib/api"
import { useActiveOrganizationSafe } from "@/lib/auth-client"
import type {
  PluginInstallation,
  PluginInstallationScope,
  InstallPluginInput,
  UpdateInstallationInput,
  UpdateVersionInput,
  ListInstallationsParams,
} from "@/types/marketplace"

interface InstalledPluginsResponse {
  installations: PluginInstallation[]
  total: number
}

interface InstallPluginResponse {
  installation: PluginInstallation
}

export function useInstalledPlugins(
  params: Omit<ListInstallationsParams, "status" | "scope"> & {
    status?: "active" | "disabled" | "pending_update"
    scope?: PluginInstallationScope
  } = {}
) {
  const { data: activeOrg, isPending: isOrgPending } =
    useActiveOrganizationSafe()
  const { status, scope, componentType, limit = 20, offset = 0 } = params

  return useQuery<InstalledPluginsResponse>({
    queryKey: [
      "plugins",
      "installations",
      activeOrg?.id,
      status,
      scope,
      componentType,
      limit,
      offset,
    ],
    queryFn: async () => {
      const queryParams = new URLSearchParams()
      if (status) queryParams.set("status", status)
      if (scope) queryParams.set("scope", scope)
      if (componentType) queryParams.set("componentType", componentType)
      queryParams.set("limit", String(limit))
      queryParams.set("offset", String(offset))

      const queryString = queryParams.toString()
      const path = `/api/organizations/${activeOrg!.id}/plugins${queryString ? `?${queryString}` : ""}`

      return fetchApi<InstalledPluginsResponse>(path)
    },
    enabled: !isOrgPending && !!activeOrg?.id,
  })
}

export function usePluginInstallation(pluginId: string | undefined) {
  const { data: activeOrg, isPending: isOrgPending } =
    useActiveOrganizationSafe()

  return useQuery<{ installation: PluginInstallation | null }>({
    queryKey: ["plugins", "installation", activeOrg?.id, pluginId],
    queryFn: async () => {
      const path = `/api/organizations/${activeOrg!.id}/plugins?limit=100`
      const result = await fetchApi<InstalledPluginsResponse>(path)
      const installation =
        result.installations.find((i) => i.pluginId === pluginId) || null
      return { installation }
    },
    enabled: !isOrgPending && !!activeOrg?.id && !!pluginId,
  })
}

export function useInstallPlugin() {
  const queryClient = useQueryClient()
  const { data: activeOrg } = useActiveOrganizationSafe()

  return useMutation<InstallPluginResponse, Error, InstallPluginInput>({
    mutationFn: async (input) => {
      const path = `/api/organizations/${activeOrg!.id}/plugins/install`
      return fetchApi<InstallPluginResponse>(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugins", "installations"] })
      queryClient.invalidateQueries({ queryKey: ["plugins", "installation"] })
    },
  })
}

export function useUninstallPlugin() {
  const queryClient = useQueryClient()
  const { data: activeOrg } = useActiveOrganizationSafe()

  return useMutation<{ message: string }, Error, string>({
    mutationFn: async (installationId) => {
      const path = `/api/organizations/${activeOrg!.id}/plugins/${installationId}/uninstall`
      return fetchApi<{ message: string }>(path, {
        method: "POST",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugins", "installations"] })
      queryClient.invalidateQueries({ queryKey: ["plugins", "installation"] })
    },
  })
}

export function useUpdatePlugin() {
  const queryClient = useQueryClient()
  const { data: activeOrg } = useActiveOrganizationSafe()

  return useMutation<
    InstallPluginResponse,
    Error,
    { installationId: string; version?: string }
  >({
    mutationFn: async ({ installationId, version }) => {
      const path = `/api/organizations/${activeOrg!.id}/plugins/${installationId}/update`
      const body: UpdateVersionInput = {}
      if (version) body.version = version
      return fetchApi<InstallPluginResponse>(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugins", "installations"] })
      queryClient.invalidateQueries({ queryKey: ["plugins", "installation"] })
    },
  })
}

export function useUpdateInstallation() {
  const queryClient = useQueryClient()
  const { data: activeOrg } = useActiveOrganizationSafe()

  return useMutation<
    InstallPluginResponse,
    Error,
    {
      installationId: string
      updates: Omit<UpdateInstallationInput, "status"> & {
        status?: "active" | "disabled" | "pending_update"
      }
    }
  >({
    mutationFn: async ({ installationId, updates }) => {
      const path = `/api/organizations/${activeOrg!.id}/plugins/${installationId}`
      return fetchApi<InstallPluginResponse>(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plugins", "installations"] })
      queryClient.invalidateQueries({ queryKey: ["plugins", "installation"] })
    },
  })
}
