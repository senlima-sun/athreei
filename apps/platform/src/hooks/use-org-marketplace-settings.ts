"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchApi } from "@/lib/api"
import { useActiveOrganizationSafe } from "@/lib/auth-client"
import type {
  OrgMarketplaceSettings,
  UpdateOrgMarketplaceSettingsInput,
} from "@/types/marketplace"

interface OrgMarketplaceSettingsResponse {
  settings: OrgMarketplaceSettings
}

export function useOrgMarketplaceSettings() {
  const { data: activeOrg, isPending: isOrgPending } =
    useActiveOrganizationSafe()

  return useQuery<OrgMarketplaceSettingsResponse>({
    queryKey: ["organization", "marketplace-settings", activeOrg?.id],
    queryFn: async () => {
      const path = `/api/organizations/${activeOrg!.id}/marketplace/settings`
      return fetchApi<OrgMarketplaceSettingsResponse>(path)
    },
    enabled: !isOrgPending && !!activeOrg?.id,
  })
}

export function useUpdateOrgMarketplaceSettings() {
  const queryClient = useQueryClient()
  const { data: activeOrg } = useActiveOrganizationSafe()

  return useMutation<
    OrgMarketplaceSettingsResponse,
    Error,
    UpdateOrgMarketplaceSettingsInput
  >({
    mutationFn: async (updates) => {
      const path = `/api/organizations/${activeOrg!.id}/marketplace/settings`
      return fetchApi<OrgMarketplaceSettingsResponse>(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organization", "marketplace-settings", activeOrg?.id],
      })
    },
  })
}
