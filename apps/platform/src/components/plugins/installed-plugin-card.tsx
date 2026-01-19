"use client"

import Link from "next/link"
import { Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PluginIcon } from "@/components/marketplace/plugin-icon"
import { StatusBadge } from "./status-badge"
import { ComponentsSummary } from "./components-summary"
import { PluginActions } from "./plugin-actions"
import type {
  PluginInstallation,
  PluginComponentSummary,
} from "@/types/marketplace"

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  const weeks = Math.floor(diffDays / 7)
  if (diffDays < 30) return `${weeks} week${weeks === 1 ? "" : "s"} ago`
  const months = Math.floor(diffDays / 30)
  if (diffDays < 365) return `${months} month${months === 1 ? "" : "s"} ago`
  const years = Math.floor(diffDays / 365)
  return `${years} year${years === 1 ? "" : "s"} ago`
}

interface InstalledPluginCardProps {
  installation: PluginInstallation
  components?: PluginComponentSummary[]
  iconUrl?: string | null
  hasUpdate?: boolean
  onEnable?: (installation: PluginInstallation) => void
  onDisable?: (installation: PluginInstallation) => void
  onUpdate?: (installation: PluginInstallation) => void
  onConfigure?: (installation: PluginInstallation) => void
  onUninstall?: (installation: PluginInstallation) => void
  isUpdating?: boolean
  isToggling?: boolean
  isUninstalling?: boolean
}

export function InstalledPluginCard({
  installation,
  components = [],
  iconUrl,
  hasUpdate = false,
  onEnable,
  onDisable,
  onUpdate,
  onConfigure,
  onUninstall,
  isUpdating = false,
  isToggling = false,
  isUninstalling = false,
}: InstalledPluginCardProps) {
  const detailHref = `/dashboard/marketplace/${installation.plugin.marketplace.slug}/${installation.plugin.slug}`

  return (
    <div className="group relative rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm">
      <Link href={detailHref} className="absolute inset-0 z-0" />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <PluginIcon
              iconUrl={iconUrl ?? null}
              name={installation.plugin.name}
              size="md"
            />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="truncate font-medium text-gray-900">
                  {installation.plugin.name}
                </h3>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-sm text-gray-500">
                <span>v{installation.version.version}</span>
                <span className="text-gray-300">|</span>
                <Badge variant="outline" className="text-xs capitalize">
                  {installation.scope}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge
              status={hasUpdate ? "pending_update" : installation.status}
            />
          </div>
        </div>

        {components.length > 0 && (
          <div className="mt-4">
            <ComponentsSummary components={components} />
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Installed {formatRelativeDate(installation.installedAt)}
          </span>

          <div className="flex items-center gap-2">
            {onConfigure && (
              <Button
                variant="outline"
                size="sm"
                className="relative z-20"
                onClick={(e) => {
                  e.preventDefault()
                  onConfigure(installation)
                }}
              >
                <Settings className="mr-1.5 h-4 w-4" />
                Configure
              </Button>
            )}
            <div className="relative z-20">
              <PluginActions
                installation={installation}
                hasUpdate={hasUpdate}
                onEnable={onEnable}
                onDisable={onDisable}
                onUpdate={onUpdate}
                onConfigure={onConfigure}
                onUninstall={onUninstall}
                isUpdating={isUpdating}
                isToggling={isToggling}
                isUninstalling={isUninstalling}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
