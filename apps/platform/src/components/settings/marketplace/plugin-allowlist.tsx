"use client"

import { useState, useMemo, useCallback } from "react"
import { usePlugins } from "@/hooks/use-plugins"
import { Badge } from "@/components/ui/badge"
import { Loader2, X, Search, Package, Plus, Check, Star } from "lucide-react"
import type { PluginSearchResult } from "@/types/marketplace"
import { useDebounce } from "@/hooks/use-debounce"

interface PluginAllowlistProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

export function PluginAllowlist({
  selectedIds,
  onChange,
  disabled = false,
}: PluginAllowlistProps) {
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

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Allowed Plugins
      </label>

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
            placeholder="Search plugins to add..."
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

      {selectedIds.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-xs font-medium uppercase text-gray-500">
            {selectedIds.length} Plugin{selectedIds.length !== 1 ? "s" : ""}{" "}
            Allowed
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedIds.map((pluginId) => {
              const plugin = selectedPluginsMap.get(pluginId)
              return (
                <Badge
                  key={pluginId}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <Package className="h-3 w-3" />
                  {plugin?.name || pluginId}
                  <button
                    type="button"
                    onClick={() => handleRemove(pluginId)}
                    disabled={disabled}
                    className="ml-1 rounded p-0.5 hover:bg-gray-200 disabled:cursor-not-allowed"
                    aria-label={`Remove ${plugin?.name || pluginId}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )
            })}
          </div>
        </div>
      )}

      {selectedIds.length === 0 && (
        <p className="text-sm text-amber-600">
          No plugins selected. Members will not be able to install any plugins
          while restrictions are enabled.
        </p>
      )}
    </div>
  )
}
