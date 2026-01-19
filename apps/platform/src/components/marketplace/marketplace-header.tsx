"use client"

import Link from "next/link"
import { Store, Package } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Marketplace } from "@/types/marketplace"

interface MarketplaceHeaderProps {
  marketplaces?: Marketplace[]
  selectedMarketplace?: string
  onMarketplaceChange?: (slug: string) => void
}

export function MarketplaceHeader({
  marketplaces = [],
  selectedMarketplace,
  onMarketplaceChange,
}: MarketplaceHeaderProps) {
  const showMarketplaceSelector = marketplaces.length > 1

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Store className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-sm text-gray-600">
            Discover and install plugins to extend your AI capabilities
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {showMarketplaceSelector && (
          <Select
            value={selectedMarketplace || "all"}
            onValueChange={(value) => {
              if (value !== null) {
                onMarketplaceChange?.(value === "all" ? "" : value)
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All marketplaces</SelectItem>
              {marketplaces.map((marketplace) => (
                <SelectItem key={marketplace.id} value={marketplace.slug}>
                  {marketplace.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Link
          href="/dashboard/plugins"
          className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Package className="h-4 w-4" />
          Installed plugins
        </Link>
      </div>
    </div>
  )
}
