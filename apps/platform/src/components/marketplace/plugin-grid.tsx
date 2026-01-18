"use client"

import { useEffect, useRef, useCallback } from "react"
import { Puzzle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PluginCard } from "./plugin-card"
import { PluginGridSkeleton } from "./skeletons"
import { usePlugins } from "@/hooks/use-plugins"
import { useInstalledPlugins } from "@/hooks/use-plugin-installation"
import type {
  ListPluginsParams,
  PluginSearchResult,
  PluginInstallation,
} from "@/types/marketplace"

interface PluginGridProps {
  params?: ListPluginsParams
  onInstall?: (plugin: PluginSearchResult) => void
  onUninstall?: (installation: PluginInstallation) => void
  onConfigure?: (installation: PluginInstallation) => void
  installingPluginId?: string | null
  useIntersectionObserver?: boolean
}

export function PluginGrid({
  params,
  onInstall,
  onUninstall,
  onConfigure,
  installingPluginId,
  useIntersectionObserver = true,
}: PluginGridProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = usePlugins(params)

  const { data: installedData } = useInstalledPlugins()

  const loadMoreRef = useRef<HTMLDivElement>(null)

  const getInstallation = useCallback(
    (pluginId: string): PluginInstallation | null => {
      if (!installedData?.installations) return null
      return (
        installedData.installations.find((i) => i.pluginId === pluginId) ?? null
      )
    },
    [installedData?.installations]
  )

  useEffect(() => {
    if (!useIntersectionObserver || !hasNextPage || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [useIntersectionObserver, hasNextPage, isFetchingNextPage, fetchNextPage])

  if (isLoading) {
    return <PluginGridSkeleton />
  }

  if (isError) {
    return (
      <div className="rounded-lg border-2 border-dashed border-red-200 bg-red-50 p-12 text-center">
        <Puzzle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-4 text-lg font-medium text-red-900">
          Failed to load plugins
        </h3>
        <p className="mt-2 text-sm text-red-600">
          {error?.message || "An error occurred while loading plugins."}
        </p>
      </div>
    )
  }

  const plugins = data?.pages.flatMap((page) => page.plugins) ?? []

  if (plugins.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
        <Puzzle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No plugins found
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Try adjusting your search or filters to find plugins.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plugins.map((plugin) => (
          <PluginCard
            key={plugin.id}
            plugin={plugin}
            installation={getInstallation(plugin.id)}
            onInstall={onInstall}
            onUninstall={onUninstall}
            onConfigure={onConfigure}
            isInstalling={installingPluginId === plugin.id}
          />
        ))}
      </div>

      {hasNextPage && (
        <div ref={loadMoreRef} className="flex justify-center pt-4">
          {useIntersectionObserver ? (
            isFetchingNextPage && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Loading more...</span>
              </div>
            )
          ) : (
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load more"
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
