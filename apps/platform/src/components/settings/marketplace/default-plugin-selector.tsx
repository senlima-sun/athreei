"use client"

import { useState, useMemo, useCallback } from "react"
import { usePlugins } from "@/hooks/use-plugins"
import { Badge } from "@/components/ui/badge"
import { Loader2, X, Search, Package, Plus, Check, Star } from "lucide-react"
import type { PluginSearchResult } from "@/types/marketplace"
import { useDebounce } from "@/hooks/use-debounce"

interface DefaultPluginSelectorProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

export function DefaultPluginSelector({
  selectedIds,
  onChange,
  disabled = false,
}: DefaultPluginSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const debouncedSearch = useDebounce(searchQuery, 300)

  const { data: pluginsData, isPending } = usePlugins({
    search: debouncedSearch || undefined,
    limit: 50,
  })

  const plugins = useMemo(() => {
    const allPlugins: PluginSearchResult[] = []
    if (pluginsData?.pages) {
      for (const page of pluginsData.pages) {
        allPlugins.push(...page.plugins)
      }
    }
    return allPlugins
  }, [pluginsData])

  const selectedPluginsMap = useMemo(() => {
    const map = new Map<string, PluginSearchResult>()
    for (const plugin of plugins) {
      if (selectedIds.includes(plugin.id)) {
        map.set(plugin.id, plugin)
      }
    }
    return map
  }, [plugins, selectedIds])

  const handleAdd = useCallback(
    (plugin: PluginSearchResult) => {
      if (!selectedIds.includes(plugin.id)) {
        onChange([...selectedIds, plugin.id])
      }
      setSearchQuery("")
      setIsDropdownOpen(false)
    },
    [selectedIds, onChange]
  )

  const handleRemove = useCallback(
    (pluginId: string) => {
      onChange(selectedIds.filter((id) => id !== pluginId))
    },
    [selectedIds, onChange]
  )

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index === 0) return
      const newIds = [...selectedIds]
      const prevItem = newIds[index - 1]
      const currentItem = newIds[index]
      if (prevItem !== undefined && currentItem !== undefined) {
        newIds[index - 1] = currentItem
        newIds[index] = prevItem
        onChange(newIds)
      }
    },
    [selectedIds, onChange]
  )

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index === selectedIds.length - 1) return
      const newIds = [...selectedIds]
      const currentItem = newIds[index]
      const nextItem = newIds[index + 1]
      if (currentItem !== undefined && nextItem !== undefined) {
        newIds[index] = nextItem
        newIds[index + 1] = currentItem
        onChange(newIds)
      }
    },
    [selectedIds, onChange]
  )

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Default Plugins for New Members
        </label>
        <p className="mt-1 text-sm text-gray-500">
          These plugins will be automatically installed when new members join
          your organization. Plugins are installed in the order shown below.
        </p>
      </div>

      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setIsDropdownOpen(true)
            }}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder="Search plugins to add as default..."
            disabled={disabled}
            className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {isDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsDropdownOpen(false)}
            />
            <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
              {isPending ? (
                <div className="flex items-center justify-center gap-2 p-4 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching plugins...
                </div>
              ) : plugins.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  {searchQuery
                    ? "No plugins found matching your search"
                    : "Start typing to search for plugins"}
                </div>
              ) : (
                <ul className="py-1">
                  {plugins.map((plugin) => {
                    const isSelected = selectedIds.includes(plugin.id)
                    return (
                      <li key={plugin.id}>
                        <button
                          type="button"
                          onClick={() => handleAdd(plugin)}
                          disabled={disabled || isSelected}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {plugin.iconUrl ? (
                            <img
                              src={plugin.iconUrl}
                              alt=""
                              className="h-8 w-8 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                              <Package className="h-4 w-4 text-gray-600" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-sm font-medium text-gray-900">
                                {plugin.name}
                              </p>
                              {plugin.isVerified && (
                                <Check className="h-3 w-3 text-blue-500" />
                              )}
                              {plugin.isFeatured && (
                                <Star className="h-3 w-3 text-amber-500" />
                              )}
                            </div>
                            <p className="truncate text-xs text-gray-500">
                              {plugin.marketplace.name} / {plugin.slug}
                            </p>
                          </div>
                          {isSelected ? (
                            <Check className="h-4 w-4 shrink-0 text-green-500" />
                          ) : (
                            <Plus className="h-4 w-4 shrink-0 text-gray-400" />
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>

      {selectedIds.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-3 py-2">
            <p className="text-xs font-medium uppercase text-gray-500">
              {selectedIds.length} Default Plugin
              {selectedIds.length !== 1 ? "s" : ""} (Install Order)
            </p>
          </div>
          <ul className="divide-y divide-gray-100">
            {selectedIds.map((pluginId, index) => {
              const plugin = selectedPluginsMap.get(pluginId)
              return (
                <li
                  key={pluginId}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={disabled || index === 0}
                      className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={disabled || index === selectedIds.length - 1}
                      className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>

                  <Badge
                    variant="outline"
                    className="h-6 w-6 shrink-0 justify-center p-0 text-xs"
                  >
                    {index + 1}
                  </Badge>

                  {plugin?.iconUrl ? (
                    <img
                      src={plugin.iconUrl}
                      alt=""
                      className="h-8 w-8 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                      <Package className="h-4 w-4 text-gray-600" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {plugin?.name || pluginId}
                      </p>
                      {plugin?.isVerified && (
                        <Check className="h-3 w-3 text-blue-500" />
                      )}
                    </div>
                    {plugin && (
                      <p className="truncate text-xs text-gray-500">
                        {plugin.marketplace.name}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(pluginId)}
                    disabled={disabled}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500 disabled:cursor-not-allowed"
                    aria-label={`Remove ${plugin?.name || pluginId}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <Package className="mx-auto h-8 w-8 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            No default plugins configured
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Search above to add plugins that will be auto-installed for new
            members
          </p>
        </div>
      )}
    </div>
  )
}
