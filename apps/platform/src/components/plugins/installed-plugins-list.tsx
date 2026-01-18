"use client"

import { useMemo, useState } from "react"
import { ArrowDownAZ, CalendarArrowDown, Puzzle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LoadingState, EmptyState } from "@/components/dashboard"
import { InstalledPluginCard } from "./installed-plugin-card"
import type {
  PluginInstallation,
  PluginComponentSummary,
} from "@/types/marketplace"

type SortOption = "name" | "date"

interface InstalledPluginsListProps {
  installations: PluginInstallation[]
  componentsMap?: Record<string, PluginComponentSummary[]>
  iconUrlMap?: Record<string, string | null>
  updateAvailableIds?: Set<string>
  isLoading?: boolean
  onEnable?: (installation: PluginInstallation) => void
  onDisable?: (installation: PluginInstallation) => void
  onUpdate?: (installation: PluginInstallation) => void
  onConfigure?: (installation: PluginInstallation) => void
  onUninstall?: (installation: PluginInstallation) => void
  updatingIds?: Set<string>
  togglingIds?: Set<string>
  uninstallingIds?: Set<string>
  emptyStateAction?: {
    label: string
    href: string
  }
}

export function InstalledPluginsList({
  installations,
  componentsMap = {},
  iconUrlMap = {},
  updateAvailableIds = new Set(),
  isLoading = false,
  onEnable,
  onDisable,
  onUpdate,
  onConfigure,
  onUninstall,
  updatingIds = new Set(),
  togglingIds = new Set(),
  uninstallingIds = new Set(),
  emptyStateAction,
}: InstalledPluginsListProps) {
  const [sortBy, setSortBy] = useState<SortOption>("date")

  const sortedInstallations = useMemo(() => {
    const sorted = [...installations]

    if (sortBy === "name") {
      sorted.sort((a, b) => a.plugin.name.localeCompare(b.plugin.name))
    } else {
      sorted.sort(
        (a, b) =>
          new Date(b.installedAt).getTime() - new Date(a.installedAt).getTime()
      )
    }

    return sorted
  }, [installations, sortBy])

  if (isLoading) {
    return <LoadingState message="Loading plugins..." />
  }

  if (installations.length === 0) {
    return (
      <EmptyState
        icon={Puzzle}
        title="No plugins installed"
        description="Browse the marketplace to discover and install plugins."
        action={
          emptyStateAction
            ? {
                label: emptyStateAction.label,
                href: emptyStateAction.href,
              }
            : undefined
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {installations.length} plugin{installations.length !== 1 ? "s" : ""}{" "}
          installed
        </p>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            {sortBy === "name" ? (
              <ArrowDownAZ className="mr-1.5 h-4 w-4" />
            ) : (
              <CalendarArrowDown className="mr-1.5 h-4 w-4" />
            )}
            Sort by {sortBy === "name" ? "Name" : "Date"}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              checked={sortBy === "name"}
              onCheckedChange={() => setSortBy("name")}
            >
              <ArrowDownAZ className="mr-2 h-4 w-4" />
              Name
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortBy === "date"}
              onCheckedChange={() => setSortBy("date")}
            >
              <CalendarArrowDown className="mr-2 h-4 w-4" />
              Installation Date
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {sortedInstallations.map((installation) => (
          <InstalledPluginCard
            key={installation.id}
            installation={installation}
            components={componentsMap[installation.pluginId] || []}
            iconUrl={iconUrlMap[installation.pluginId]}
            hasUpdate={updateAvailableIds.has(installation.id)}
            onEnable={onEnable}
            onDisable={onDisable}
            onUpdate={onUpdate}
            onConfigure={onConfigure}
            onUninstall={onUninstall}
            isUpdating={updatingIds.has(installation.id)}
            isToggling={togglingIds.has(installation.id)}
            isUninstalling={uninstallingIds.has(installation.id)}
          />
        ))}
      </div>
    </div>
  )
}
