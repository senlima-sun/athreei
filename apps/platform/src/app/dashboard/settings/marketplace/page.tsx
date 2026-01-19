"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import {
  useOrgMarketplaceSettings,
  useUpdateOrgMarketplaceSettings,
} from "@/hooks/use-org-marketplace-settings"
import {
  useActiveOrganizationSafe,
  useSession,
  organization,
} from "@/lib/auth-client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  MarketplaceAllowlist,
  PluginAllowlist,
  DefaultPluginSelector,
} from "@/components/settings/marketplace"
import { Loader2, AlertCircle, Store, Package, Shield } from "lucide-react"

interface Member {
  id: string
  userId: string
  role: string
}

export default function MarketplaceSettingsPage() {
  const { data: session } = useSession()
  const { data: activeOrg, isPending: isOrgPending } =
    useActiveOrganizationSafe()
  const { data: settingsData, isPending: isSettingsPending } =
    useOrgMarketplaceSettings()
  const updateSettings = useUpdateOrgMarketplaceSettings()

  const [members, setMembers] = useState<Member[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)

  useEffect(() => {
    const loadMembers = async () => {
      if (!activeOrg?.id) return

      try {
        const result = await organization.listMembers({
          query: { organizationId: activeOrg.id },
        })

        if (result.data && "members" in result.data) {
          setMembers(result.data.members as Member[])
        }
      } catch (err) {
        console.error("Failed to load members:", err)
      } finally {
        setIsLoadingMembers(false)
      }
    }

    loadMembers()
  }, [activeOrg?.id])

  const currentUserMember = members.find((m) => m.userId === session?.user?.id)
  const isAdmin =
    currentUserMember?.role === "owner" || currentUserMember?.role === "admin"

  const settings = settingsData?.settings

  const handleToggleMarketplaceRestriction = async (enabled: boolean) => {
    await updateSettings.mutateAsync({
      restrictMarketplaces: enabled,
    })
  }

  const handleTogglePluginRestriction = async (enabled: boolean) => {
    await updateSettings.mutateAsync({
      restrictPlugins: enabled,
    })
  }

  const handleMarketplaceAllowlistChange = async (marketplaceIds: string[]) => {
    await updateSettings.mutateAsync({
      allowedMarketplaceIds: marketplaceIds,
    })
  }

  const handlePluginAllowlistChange = async (pluginIds: string[]) => {
    await updateSettings.mutateAsync({
      allowedPluginIds: pluginIds,
    })
  }

  const handleDefaultPluginsChange = async (pluginIds: string[]) => {
    await updateSettings.mutateAsync({
      defaultPluginIds: pluginIds,
    })
  }

  if (isOrgPending || isSettingsPending || isLoadingMembers) {
    return (
      <div>
        <PageHeader
          title="Marketplace Settings"
          description="Control which marketplaces and plugins are available to your organization"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div>
        <PageHeader
          title="Marketplace Settings"
          description="Control which marketplaces and plugins are available to your organization"
        />
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Admin Access Required
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            You need to be an organization admin or owner to access marketplace
            settings.
          </p>
        </div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div>
        <PageHeader
          title="Marketplace Settings"
          description="Control which marketplaces and plugins are available to your organization"
        />
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-700">
              Failed to load marketplace settings. Please try again later.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Marketplace Settings"
        description="Control which marketplaces and plugins are available to your organization"
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <Store className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Marketplace Restrictions</CardTitle>
                <CardDescription>
                  Restrict which marketplaces your organization can install
                  plugins from
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Enable marketplace restrictions
                  </p>
                  <p className="text-sm text-gray-500">
                    When enabled, members can only install plugins from allowed
                    marketplaces
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.restrictMarketplaces}
                  onClick={() =>
                    handleToggleMarketplaceRestriction(
                      !settings.restrictMarketplaces
                    )
                  }
                  disabled={updateSettings.isPending}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    settings.restrictMarketplaces
                      ? "bg-gray-900"
                      : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.restrictMarketplaces
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {settings.restrictMarketplaces && (
                <MarketplaceAllowlist
                  selectedIds={settings.allowedMarketplaceIds}
                  onChange={handleMarketplaceAllowlistChange}
                  disabled={updateSettings.isPending}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <Package className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Plugin Restrictions</CardTitle>
                <CardDescription>
                  Restrict which specific plugins your organization can install
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Enable plugin restrictions
                  </p>
                  <p className="text-sm text-gray-500">
                    When enabled, members can only install specifically allowed
                    plugins
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.restrictPlugins}
                  onClick={() =>
                    handleTogglePluginRestriction(!settings.restrictPlugins)
                  }
                  disabled={updateSettings.isPending}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    settings.restrictPlugins ? "bg-gray-900" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.restrictPlugins
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {settings.restrictPlugins && (
                <PluginAllowlist
                  selectedIds={settings.allowedPluginIds}
                  onChange={handlePluginAllowlistChange}
                  disabled={updateSettings.isPending}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle>Default Plugins</CardTitle>
                <CardDescription>
                  Select plugins that are automatically installed for new
                  organization members
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DefaultPluginSelector
              selectedIds={settings.defaultPluginIds}
              onChange={handleDefaultPluginsChange}
              disabled={updateSettings.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
