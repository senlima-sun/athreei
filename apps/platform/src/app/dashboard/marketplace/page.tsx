"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQueryState, parseAsString, parseAsBoolean } from "nuqs"
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

const VALID_SORT_OPTIONS: PluginSortOption[] = ["popularity", "recent", "name"]

const parseAsSort = parseAsString
  .withOptions({ shallow: false })
  .withDefault("popularity")

function isValidSortOption(value: string): value is PluginSortOption {
  return VALID_SORT_OPTIONS.includes(value as PluginSortOption)
}

export default function MarketplacePage() {
  const router = useRouter()

  const [search, setSearch] = useQueryState(
    "search",
    parseAsString.withOptions({ shallow: false }).withDefault("")
  )
  const [category, setCategory] = useQueryState(
    "category",
    parseAsString.withOptions({ shallow: false })
  )
  const [verifiedOnly, setVerifiedOnly] = useQueryState(
    "verified",
    parseAsBoolean.withOptions({ shallow: false }).withDefault(false)
  )
  const [sortRaw, setSortRaw] = useQueryState("sort", parseAsSort)
  const [selectedMarketplace, setSelectedMarketplace] = useQueryState(
    "marketplace",
    parseAsString.withOptions({ shallow: false }).withDefault("")
  )

  const sort: PluginSortOption = isValidSortOption(sortRaw)
    ? sortRaw
    : "popularity"

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

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value || null)
    },
    [setSearch]
  )

  const handleCategoryChange = useCallback(
    (value: string | null) => {
      setCategory(value)
    },
    [setCategory]
  )

  const handleVerifiedChange = useCallback(
    (value: boolean) => {
      setVerifiedOnly(value || null)
    },
    [setVerifiedOnly]
  )

  const handleSortChange = useCallback(
    (value: PluginSortOption) => {
      setSortRaw(value === "popularity" ? null : value)
    },
    [setSortRaw]
  )

  const handleMarketplaceChange = useCallback(
    (value: string) => {
      setSelectedMarketplace(value || null)
    },
    [setSelectedMarketplace]
  )

  const handleClearFilters = useCallback(() => {
    setSearch(null)
    setCategory(null)
    setVerifiedOnly(null)
    setSortRaw(null)
    setSelectedMarketplace(null)
  }, [
    setSearch,
    setCategory,
    setVerifiedOnly,
    setSortRaw,
    setSelectedMarketplace,
  ])

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
