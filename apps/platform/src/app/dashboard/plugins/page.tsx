"use client"

import { useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Store, Server, Sparkles, Webhook, Terminal, Bot } from "lucide-react"
import { PageHeader, LoadingState, ErrorState } from "@/components/dashboard"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { InstalledPluginsList } from "@/components/plugins/installed-plugins-list"
import {
  useInstalledPlugins,
  useUpdateInstallation,
  useUpdatePlugin,
  useUninstallPlugin,
} from "@/hooks/use-plugin-installation"
import { useActiveOrganizationSafe } from "@/lib/auth-client"
import type {
  PluginInstallation,
  PluginInstallationStatus,
  PluginComponentType,
} from "@/types/marketplace"

type FilterTab = "all" | PluginComponentType

const filterTabs: { value: FilterTab; label: string; icon: typeof Server }[] = [
  { value: "all", label: "All", icon: Store },
  { value: "mcp_server", label: "MCP Servers", icon: Server },
  { value: "skill", label: "Skills", icon: Sparkles },
  { value: "hook", label: "Hooks", icon: Webhook },
  { value: "command", label: "Commands", icon: Terminal },
  { value: "agent", label: "Agents", icon: Bot },
]

export default function InstalledPluginsPage() {
  const router = useRouter()
  const { data: activeOrg, isPending: isOrgPending } =
    useActiveOrganizationSafe()

  const [activeTab, setActiveTab] = useState<FilterTab>("all")
  const [statusFilter, setStatusFilter] = useState<
    PluginInstallationStatus | "all"
  >("all")

  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set())
  const [uninstallingIds, setUninstallingIds] = useState<Set<string>>(new Set())

  const queryParams = useMemo(() => {
    const params: {
      componentType?: string
      status?: PluginInstallationStatus
    } = {}
    if (activeTab !== "all") {
      params.componentType = activeTab
    }
    if (statusFilter !== "all") {
      params.status = statusFilter
    }
    return params
  }, [activeTab, statusFilter])

  const {
    data: installationsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useInstalledPlugins(queryParams)

  const updateInstallationMutation = useUpdateInstallation()
  const updatePluginMutation = useUpdatePlugin()
  const uninstallMutation = useUninstallPlugin()

  const installations = installationsData?.installations ?? []

  const handleEnable = useCallback(
    async (installation: PluginInstallation) => {
      setTogglingIds((prev) => new Set(prev).add(installation.id))
      try {
        await updateInstallationMutation.mutateAsync({
          installationId: installation.id,
          updates: { status: "active" },
        })
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev)
          next.delete(installation.id)
          return next
        })
      }
    },
    [updateInstallationMutation]
  )

  const handleDisable = useCallback(
    async (installation: PluginInstallation) => {
      setTogglingIds((prev) => new Set(prev).add(installation.id))
      try {
        await updateInstallationMutation.mutateAsync({
          installationId: installation.id,
          updates: { status: "disabled" },
        })
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev)
          next.delete(installation.id)
          return next
        })
      }
    },
    [updateInstallationMutation]
  )

  const handleUpdate = useCallback(
    async (installation: PluginInstallation) => {
      setUpdatingIds((prev) => new Set(prev).add(installation.id))
      try {
        await updatePluginMutation.mutateAsync({
          installationId: installation.id,
        })
      } finally {
        setUpdatingIds((prev) => {
          const next = new Set(prev)
          next.delete(installation.id)
          return next
        })
      }
    },
    [updatePluginMutation]
  )

  const handleConfigure = useCallback(
    (installation: PluginInstallation) => {
      router.push(`/dashboard/plugins/${installation.id}/configure`)
    },
    [router]
  )

  const handleUninstall = useCallback(
    async (installation: PluginInstallation) => {
      setUninstallingIds((prev) => new Set(prev).add(installation.id))
      try {
        await uninstallMutation.mutateAsync(installation.id)
      } finally {
        setUninstallingIds((prev) => {
          const next = new Set(prev)
          next.delete(installation.id)
          return next
        })
      }
    },
    [uninstallMutation]
  )

  const activeFiltersCount =
    (statusFilter !== "all" ? 1 : 0) + (activeTab !== "all" ? 1 : 0)

  if (isOrgPending || isLoading) {
    return (
      <div>
        <PageHeader
          title="Installed Plugins"
          description="Manage plugins installed in your organization"
          actions={
            <Button
              nativeButton={false}
              render={<Link href="/dashboard/marketplace" />}
            >
              <Store className="mr-1.5 h-4 w-4" />
              Browse Marketplace
            </Button>
          }
        />
        <LoadingState message="Loading installed plugins..." />
      </div>
    )
  }

  if (!activeOrg) {
    return (
      <div>
        <PageHeader
          title="Installed Plugins"
          description="Manage plugins installed in your organization"
        />
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-sm text-yellow-700">
            Please select an organization to view installed plugins.
          </p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        <PageHeader
          title="Installed Plugins"
          description="Manage plugins installed in your organization"
          actions={
            <Button
              nativeButton={false}
              render={<Link href="/dashboard/marketplace" />}
            >
              <Store className="mr-1.5 h-4 w-4" />
              Browse Marketplace
            </Button>
          }
        />
        <ErrorState
          message={
            error instanceof Error ? error.message : "Failed to load plugins"
          }
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Installed Plugins"
        description="Manage plugins installed in your organization"
        actions={
          <Button
            nativeButton={false}
            render={<Link href="/dashboard/marketplace" />}
          >
            <Store className="mr-1.5 h-4 w-4" />
            Browse Marketplace
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {filterTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            Status
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1.5">
                {activeFiltersCount}
              </Badge>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={statusFilter === "all"}
                onCheckedChange={() => setStatusFilter("all")}
              >
                All Statuses
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === "active"}
                onCheckedChange={() => setStatusFilter("active")}
              >
                Active
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === "disabled"}
                onCheckedChange={() => setStatusFilter("disabled")}
              >
                Disabled
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={statusFilter === "pending_update"}
                onCheckedChange={() => setStatusFilter("pending_update")}
              >
                Update Available
              </DropdownMenuCheckboxItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <InstalledPluginsList
        installations={installations}
        isLoading={isLoading}
        onEnable={handleEnable}
        onDisable={handleDisable}
        onUpdate={handleUpdate}
        onConfigure={handleConfigure}
        onUninstall={handleUninstall}
        updatingIds={updatingIds}
        togglingIds={togglingIds}
        uninstallingIds={uninstallingIds}
        emptyStateAction={{
          label: "Browse Marketplace",
          href: "/dashboard/marketplace",
        }}
      />
    </div>
  )
}
