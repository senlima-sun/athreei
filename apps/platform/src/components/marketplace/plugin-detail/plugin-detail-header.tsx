"use client"

import { Download, ExternalLink, Star, Calendar, GitBranch } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PluginIcon } from "../plugin-icon"
import { VerifiedBadge } from "../verified-badge"
import { ValidationBadge } from "../validation-badge"
import { InstallButton } from "../install-button"
import type {
  Plugin,
  PluginVersionSummary,
  EnvVarDefinition,
} from "@/types/marketplace"

interface PluginDetailHeaderProps {
  plugin: Plugin
  latestVersion?: PluginVersionSummary
  envVars?: EnvVarDefinition[]
  onConfigure?: () => void
}

function formatDownloadCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return count.toString()
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

function openExternalUrl(url: string | undefined | null): void {
  if (!url) return
  try {
    const parsed = new URL(url)
    if (!["http:", "https:"].includes(parsed.protocol)) return
    window.open(parsed.toString(), "_blank", "noopener,noreferrer")
  } catch {
    // Invalid URL, ignore
  }
}

export function PluginDetailHeader({
  plugin,
  latestVersion,
  envVars = [],
  onConfigure,
}: PluginDetailHeaderProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <PluginIcon iconUrl={plugin.iconUrl} name={plugin.name} size="lg" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {plugin.name}
              </h1>
              {plugin.isVerified && <VerifiedBadge className="h-5 w-5" />}
              {latestVersion?.validation && (
                <ValidationBadge
                  status={latestVersion.validation.status}
                  errors={latestVersion.validation.errors}
                  warnings={latestVersion.validation.warnings}
                  showLabel
                />
              )}
              {plugin.isFeatured && (
                <Badge
                  variant="secondary"
                  className="gap-1 bg-amber-50 text-amber-700"
                >
                  <Star className="h-3 w-3 fill-current" />
                  Featured
                </Badge>
              )}
            </div>

            {plugin.author && (
              <p className="mt-1 text-sm text-gray-600">by {plugin.author}</p>
            )}

            {latestVersion && (
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <GitBranch className="h-4 w-4" />
                  <span>v{latestVersion.version}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(latestVersion.publishedAt)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  <span>
                    {formatDownloadCount(plugin.downloadCount)} downloads
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <InstallButton
            pluginId={plugin.id}
            pluginName={plugin.name}
            pluginSlug={plugin.slug}
            marketplaceSlug={plugin.marketplace.slug}
            latestVersion={latestVersion?.version}
            envVars={envVars}
            onConfigure={onConfigure}
            size="default"
          />
        </div>
      </div>

      {(plugin.homepage || plugin.repository) && (
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-4">
          {plugin.homepage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openExternalUrl(plugin.homepage)}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Homepage
            </Button>
          )}
          {plugin.repository && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openExternalUrl(plugin.repository)}
            >
              <GitBranch className="mr-2 h-4 w-4" />
              Repository
            </Button>
          )}
          {plugin.license && (
            <Badge variant="outline" className="text-gray-600">
              {plugin.license}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
