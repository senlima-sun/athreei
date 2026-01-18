"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  MarketplaceHeader,
  MarketplaceSearch,
  MarketplaceFilters,
  MarketplaceFiltersMobile,
  PluginGrid,
  InstallModal,
} from "@/components/marketplace"
import { useMarketplaces } from "@/hooks/use-marketplaces"
import { usePlugins } from "@/hooks/use-plugins"
import { useUninstallPlugin } from "@/hooks/use-plugin-installation"
import type {
  PluginSearchResult,
  PluginInstallation,
  PluginSortOption,
  PluginCategory,
} from "@/types/marketplace"

const DEFAULT_CATEGORIES: PluginCategory[] = [
  { name: "Development Workflows", slug: "development-workflows", count: 0 },
  { name: "External Integrations", slug: "external-integrations", count: 0 },
  { name: "Code Intelligence", slug: "code-intelligence", count: 0 },
  { name: "Output Styles", slug: "output-styles", count: 0 },
  { name: "Utilities", slug: "utilities", count: 0 },
]

export default function MarketplacePage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialSearch = searchParams.get("search") || ""
  const initialCategory = searchParams.get("category") || null
  const initialVerified = searchParams.get("verified") === "true"
  const initialSort =
    (searchParams.get("sort") as PluginSortOption) || "popularity"
  const initialMarketplace = searchParams.get("marketplace") || ""

  const [search, setSearch] = useState(initialSearch)
  const [category, setCategory] = useState<string | null>(initialCategory)
  const [verifiedOnly, setVerifiedOnly] = useState(initialVerified)
  const [sort, setSort] = useState<PluginSortOption>(initialSort)
  const [selectedMarketplace, setSelectedMarketplace] =
    useState(initialMarketplace)

  const [installModalOpen, setInstallModalOpen] = useState(false)
  const [selectedPlugin, setSelectedPlugin] =
    useState<PluginSearchResult | null>(null)
  const [installingPluginId, setInstallingPluginId] = useState<string | null>(
    null
  )

  const uninstallMutation = useUninstallPlugin()

  const { data: marketplacesData } = useMarketplaces({ isPublic: true })
  const marketplaces = marketplacesData?.marketplaces ?? []

  const pluginsParams = useMemo(
    () => ({
      search: search || undefined,
      category: category || undefined,
      marketplaceSlug: selectedMarketplace || undefined,
      isVerified: verifiedOnly || undefined,
      sort,
    }),
    [search, category, selectedMarketplace, verifiedOnly, sort]
  )

  const { data: pluginsData, isLoading: isPluginsLoading } =
    usePlugins(pluginsParams)

  const totalPlugins = pluginsData?.pages[0]?.total ?? 0

  const updateUrlParams = useCallback(
    (params: {
      search?: string
      category?: string | null
      verified?: boolean
      sort?: PluginSortOption
      marketplace?: string
    }) => {
      const newParams = new URLSearchParams(searchParams.toString())

      if (params.search !== undefined) {
        if (params.search) {
          newParams.set("search", params.search)
        } else {
          newParams.delete("search")
        }
      }

      if (params.category !== undefined) {
        if (params.category) {
          newParams.set("category", params.category)
        } else {
          newParams.delete("category")
        }
      }

      if (params.verified !== undefined) {
        if (params.verified) {
          newParams.set("verified", "true")
        } else {
          newParams.delete("verified")
        }
      }

      if (params.sort !== undefined) {
        if (params.sort !== "popularity") {
          newParams.set("sort", params.sort)
        } else {
          newParams.delete("sort")
        }
      }

      if (params.marketplace !== undefined) {
        if (params.marketplace) {
          newParams.set("marketplace", params.marketplace)
        } else {
          newParams.delete("marketplace")
        }
      }

      const queryString = newParams.toString()
      router.replace(
        queryString ? `?${queryString}` : "/dashboard/marketplace",
        {
          scroll: false,
        }
      )
    },
    [searchParams, router]
  )

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
      updateUrlParams({ search: value })
    },
    [updateUrlParams]
  )

  const handleCategoryChange = useCallback(
    (value: string | null) => {
      setCategory(value)
      updateUrlParams({ category: value })
    },
    [updateUrlParams]
  )

  const handleVerifiedChange = useCallback(
    (value: boolean) => {
      setVerifiedOnly(value)
      updateUrlParams({ verified: value })
    },
    [updateUrlParams]
  )

  const handleSortChange = useCallback(
    (value: PluginSortOption) => {
      setSort(value)
      updateUrlParams({ sort: value })
    },
    [updateUrlParams]
  )

  const handleMarketplaceChange = useCallback(
    (value: string) => {
      setSelectedMarketplace(value)
      updateUrlParams({ marketplace: value })
    },
    [updateUrlParams]
  )

  const handleClearFilters = useCallback(() => {
    setSearch("")
    setCategory(null)
    setVerifiedOnly(false)
    setSort("popularity")
    setSelectedMarketplace("")
    router.replace("/dashboard/marketplace", { scroll: false })
  }, [router])

  const handleInstall = useCallback((plugin: PluginSearchResult) => {
    setSelectedPlugin(plugin)
    setInstallModalOpen(true)
  }, [])

  const handleInstallSuccess = useCallback(() => {
    setInstallingPluginId(null)
    setSelectedPlugin(null)
    setInstallModalOpen(false)
  }, [])

  const handleUninstall = useCallback(
    async (installation: PluginInstallation) => {
      if (
        !window.confirm(
          `Are you sure you want to uninstall ${installation.plugin.name}?`
        )
      ) {
        return
      }

      try {
        await uninstallMutation.mutateAsync(installation.id)
      } catch {
        // Error handled by mutation
      }
    },
    [uninstallMutation]
  )

  const handleConfigure = useCallback(
    (installation: PluginInstallation) => {
      router.push(`/dashboard/plugins/${installation.id}/configure`)
    },
    [router]
  )

  useEffect(() => {
    if (selectedPlugin) {
      setInstallingPluginId(selectedPlugin.id)
    }
  }, [selectedPlugin])

  return (
    <div className="flex flex-col gap-6">
      <MarketplaceHeader
        marketplaces={marketplaces}
        selectedMarketplace={selectedMarketplace}
        onMarketplaceChange={handleMarketplaceChange}
      />

      <MarketplaceSearch
        value={search}
        onChange={handleSearchChange}
        resultCount={!isPluginsLoading ? totalPlugins : undefined}
        isLoading={isPluginsLoading && !!search}
      />

      <MarketplaceFiltersMobile
        categories={DEFAULT_CATEGORIES}
        selectedCategory={category}
        onCategoryChange={handleCategoryChange}
        verifiedOnly={verifiedOnly}
        onVerifiedChange={handleVerifiedChange}
        sort={sort}
        onSortChange={handleSortChange}
        onClearFilters={handleClearFilters}
      />

      <div className="flex gap-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <MarketplaceFilters
            categories={DEFAULT_CATEGORIES}
            selectedCategory={category}
            onCategoryChange={handleCategoryChange}
            verifiedOnly={verifiedOnly}
            onVerifiedChange={handleVerifiedChange}
            sort={sort}
            onSortChange={handleSortChange}
            onClearFilters={handleClearFilters}
          />
        </aside>

        <main className="min-w-0 flex-1">
          <PluginGrid
            params={pluginsParams}
            onInstall={handleInstall}
            onUninstall={handleUninstall}
            onConfigure={handleConfigure}
            installingPluginId={installingPluginId}
          />
        </main>
      </div>

      {selectedPlugin && (
        <InstallModal
          isOpen={installModalOpen}
          onClose={() => {
            setInstallModalOpen(false)
            setInstallingPluginId(null)
            setSelectedPlugin(null)
          }}
          onSuccess={handleInstallSuccess}
          pluginName={selectedPlugin.name}
          pluginSlug={selectedPlugin.slug}
          marketplaceSlug={selectedPlugin.marketplace.slug}
          version={selectedPlugin.latestVersion?.version}
        />
      )}
    </div>
  )
}
