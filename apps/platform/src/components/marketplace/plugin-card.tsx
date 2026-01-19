"use client"

import Link from "next/link"
import { Download, ChevronDown, Settings, Trash2, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PluginIcon } from "./plugin-icon"
import { VerifiedBadge } from "./verified-badge"
import type {
  PluginSearchResult,
  PluginInstallation,
} from "@/types/marketplace"

interface PluginCardProps {
  plugin: PluginSearchResult
  installation?: PluginInstallation | null
  onInstall?: (plugin: PluginSearchResult) => void
  onUninstall?: (installation: PluginInstallation) => void
  onConfigure?: (installation: PluginInstallation) => void
  isInstalling?: boolean
}

export function PluginCard({
  plugin,
  installation,
  onInstall,
  onUninstall,
  onConfigure,
  isInstalling = false,
}: PluginCardProps) {
  const isInstalled = !!installation
  const detailHref = `/dashboard/marketplace/${plugin.marketplace.slug}/${plugin.slug}`

  const formatDownloadCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  const displayTags = plugin.tags.slice(0, 3)

  return (
    <div className="group relative rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm">
      <Link href={detailHref} className="absolute inset-0 z-0" />

      <div className="relative z-10">
        <div className="flex items-start gap-3">
          <PluginIcon iconUrl={plugin.iconUrl} name={plugin.name} size="md" />

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-medium text-gray-900">
                {plugin.name}
              </h3>
              {plugin.isVerified && <VerifiedBadge />}
            </div>
            {plugin.author && (
              <p className="truncate text-sm text-gray-500">
                by {plugin.author}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {plugin.isFeatured && (
              <Badge
                variant="secondary"
                className="gap-1 bg-amber-50 text-amber-700"
              >
                <Star className="h-3 w-3 fill-current" />
                Featured
              </Badge>
            )}
            {plugin.category && (
              <Badge variant="outline" className="hidden sm:inline-flex">
                {plugin.category}
              </Badge>
            )}
          </div>
        </div>

        {plugin.description && (
          <p className="mt-3 line-clamp-2 text-sm text-gray-600">
            {plugin.description}
          </p>
        )}

        {displayTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {displayTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {plugin.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{plugin.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Download className="h-4 w-4" />
            <span>{formatDownloadCount(plugin.downloadCount)}</span>
          </div>

          {isInstalled ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="relative z-20 gap-1"
                    onClick={(e) => e.preventDefault()}
                  />
                }
              >
                Installed
                <ChevronDown className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onConfigure && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault()
                      onConfigure(installation)
                    }}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Configure
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {onUninstall && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={(e) => {
                      e.preventDefault()
                      onUninstall(installation)
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Uninstall
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              size="sm"
              className="relative z-20"
              onClick={(e) => {
                e.preventDefault()
                onInstall?.(plugin)
              }}
              disabled={isInstalling}
            >
              {isInstalling ? "Installing..." : "Install"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
