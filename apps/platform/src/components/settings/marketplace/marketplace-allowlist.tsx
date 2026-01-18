"use client"

import { useState, useMemo } from "react"
import { useMarketplaces } from "@/hooks/use-marketplaces"
import { Badge } from "@/components/ui/badge"
import { Loader2, X, Search, Store, Plus, Check } from "lucide-react"
import type { Marketplace } from "@/types/marketplace"

interface MarketplaceAllowlistProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

export function MarketplaceAllowlist({
  selectedIds,
  onChange,
  disabled = false,
}: MarketplaceAllowlistProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const { data: marketplacesData, isPending } = useMarketplaces({ limit: 100 })

  const marketplaces = marketplacesData?.marketplaces ?? []

  const selectedMarketplaces = useMemo(() => {
    return marketplaces.filter((m) => selectedIds.includes(m.id))
  }, [marketplaces, selectedIds])

  const filteredMarketplaces = useMemo(() => {
    if (!searchQuery.trim()) {
      return marketplaces
    }
    const query = searchQuery.toLowerCase()
    return marketplaces.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.slug.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query)
    )
  }, [marketplaces, searchQuery])

  const handleAdd = (marketplace: Marketplace) => {
    if (!selectedIds.includes(marketplace.id)) {
      onChange([...selectedIds, marketplace.id])
    }
    setSearchQuery("")
    setIsDropdownOpen(false)
  }

  const handleRemove = (marketplaceId: string) => {
    onChange(selectedIds.filter((id) => id !== marketplaceId))
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Allowed Marketplaces
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
            placeholder="Search marketplaces to add..."
            disabled={disabled || isPending}
            className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {isDropdownOpen && !isPending && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsDropdownOpen(false)}
            />
            <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
              {filteredMarketplaces.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No marketplaces found
                </div>
              ) : (
                <ul className="py-1">
                  {filteredMarketplaces.map((marketplace) => {
                    const isSelected = selectedIds.includes(marketplace.id)
                    return (
                      <li key={marketplace.id}>
                        <button
                          type="button"
                          onClick={() => handleAdd(marketplace)}
                          disabled={disabled || isSelected}
                          className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100">
                            <Store className="h-4 w-4 text-gray-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-900">
                              {marketplace.name}
                            </p>
                            <p className="truncate text-xs text-gray-500">
                              {marketplace.slug}
                              {marketplace.isPublic && " (Public)"}
                            </p>
                          </div>
                          {isSelected ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Plus className="h-4 w-4 text-gray-400" />
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

      {isPending && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading marketplaces...
        </div>
      )}

      {selectedMarketplaces.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="mb-2 text-xs font-medium uppercase text-gray-500">
            {selectedMarketplaces.length} Marketplace
            {selectedMarketplaces.length !== 1 ? "s" : ""} Allowed
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedMarketplaces.map((marketplace) => (
              <Badge
                key={marketplace.id}
                variant="secondary"
                className="flex items-center gap-1 pr-1"
              >
                <Store className="h-3 w-3" />
                {marketplace.name}
                <button
                  type="button"
                  onClick={() => handleRemove(marketplace.id)}
                  disabled={disabled}
                  className="ml-1 rounded p-0.5 hover:bg-gray-200 disabled:cursor-not-allowed"
                  aria-label={`Remove ${marketplace.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {selectedMarketplaces.length === 0 && !isPending && (
        <p className="text-sm text-amber-600">
          No marketplaces selected. Members will not be able to install any
          plugins while restrictions are enabled.
        </p>
      )}
    </div>
  )
}
