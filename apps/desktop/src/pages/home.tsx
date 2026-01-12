import { useMemo } from "react"
import { Clock } from "lucide-react"
import { useFilteredMemories } from "@/hooks"
import { PageLoading } from "@/components/common/loading-spinner"
import { ErrorDisplay } from "@/components/common/error-display"
import { EmptyState } from "@/components/common/empty-state"
import { VirtualizedMemoryList } from "@/components/virtualized-memory-list"
import { MemorySearchHeader } from "@/components/memory-search-header"
import { FilterChips } from "@/components/filter-chips"
import { useLayoutHeader } from "@/components/layout/layout"

export function HomePage(): React.ReactElement {
  const {
    memories,
    isLoading,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,

    searchQuery,
    isSearchMode,
    onSearchChange,
    onTagSelect,
    recentSearches,
    onSelectRecent,
    isSearching,

    dateRange,
    selectedTags,
    selectedSource,
    setDateRange,
    toggleTag,
    removeTag,
    setSource,
    clearFilters,
    activeFilterCount,
    hasActiveFilters,
    availableSources,
  } = useFilteredMemories()

  const headerConfig = useMemo(
    () => ({
      title: (
        <MemorySearchHeader
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onTagSelect={onTagSelect}
          recentSearches={recentSearches}
          onSelectRecent={onSelectRecent}
          isSearching={isSearching}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedTags={selectedTags}
          onTagToggle={toggleTag}
          selectedSource={selectedSource}
          onSourceChange={setSource}
          availableSources={availableSources}
          activeFilterCount={activeFilterCount}
        />
      ),
    }),
    [
      searchQuery,
      onSearchChange,
      onTagSelect,
      recentSearches,
      onSelectRecent,
      isSearching,
      dateRange,
      setDateRange,
      selectedTags,
      toggleTag,
      selectedSource,
      setSource,
      availableSources,
      activeFilterCount,
    ]
  )

  useLayoutHeader(headerConfig)

  if (isLoading) {
    return <PageLoading message="Loading memories..." />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={refetch} />
  }

  const emptyMessage = hasActiveFilters
    ? "No memories match your filters"
    : "No memories yet"

  const emptyDescription = hasActiveFilters
    ? "Try adjusting your search or filters"
    : "Memories will appear here as you browse"

  if (memories.length === 0) {
    return (
      <div className="flex h-full flex-col">
        {hasActiveFilters && (
          <FilterChips
            dateRange={dateRange}
            onRemoveDateRange={() => setDateRange("all")}
            selectedTags={selectedTags}
            onRemoveTag={removeTag}
            selectedSource={selectedSource}
            onRemoveSource={() => setSource(null)}
            onClearAll={clearFilters}
            className="mb-3 px-1"
          />
        )}
        <EmptyState
          icon={Clock}
          title={emptyMessage}
          description={emptyDescription}
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {hasActiveFilters && (
        <div className="shrink-0 border-b border-border px-3 py-2">
          {isSearchMode && (
            <div className="mb-1.5 text-xs text-muted-foreground">
              {memories.length} result{memories.length !== 1 ? "s" : ""} for
              &ldquo;{searchQuery}&rdquo;
            </div>
          )}
          <FilterChips
            dateRange={dateRange}
            onRemoveDateRange={() => setDateRange("all")}
            selectedTags={selectedTags}
            onRemoveTag={removeTag}
            selectedSource={selectedSource}
            onRemoveSource={() => setSource(null)}
            onClearAll={clearFilters}
          />
        </div>
      )}

      <div className="min-h-0 flex-1">
        <VirtualizedMemoryList
          memories={memories}
          onLoadMore={fetchNextPage}
          hasMore={hasNextPage}
          isLoading={isFetchingNextPage}
          showDateGroups={!isSearchMode}
        />
      </div>
    </div>
  )
}
