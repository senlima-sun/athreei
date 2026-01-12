import { useState, useMemo, useCallback } from "react"
import { useInfiniteMemories } from "./use-infinite-memories"
import { useSearchMemories } from "./use-memories"
import { useMemoriesByDateRange } from "./use-memories-by-date-range"
import { useDebounce } from "./use-debounce"
import type { DateRange, MemoryFilters } from "./use-memory-filters"

const RECENT_SEARCHES_KEY = "aiii-recent-searches"
const MAX_RECENT_SEARCHES = 5

function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveRecentSearch(query: string): void {
  if (!query.trim()) return
  const recent = getRecentSearches()
  const filtered = recent.filter((s) => s !== query)
  const updated = [query, ...filtered].slice(0, MAX_RECENT_SEARCHES)
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
  } catch {
    // Ignore localStorage errors
  }
}

function getDateRangeTimestamps(
  dateRange: DateRange
): { start: number; end: number } | null {
  if (dateRange === "all") return null

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(today)
  endOfToday.setDate(endOfToday.getDate() + 1)

  const end = Math.floor(endOfToday.getTime() / 1000)

  switch (dateRange) {
    case "today":
      return { start: Math.floor(today.getTime() / 1000), end }
    case "yesterday": {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return {
        start: Math.floor(yesterday.getTime() / 1000),
        end: Math.floor(today.getTime() / 1000),
      }
    }
    case "week": {
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return { start: Math.floor(weekAgo.getTime() / 1000), end }
    }
    case "month": {
      const monthAgo = new Date(today)
      monthAgo.setDate(monthAgo.getDate() - 30)
      return { start: Math.floor(monthAgo.getTime() / 1000), end }
    }
    default:
      return null
  }
}

interface UseFilteredMemoriesOptions {
  spaceId?: string
  debounceMs?: number
}

export function useFilteredMemories(options: UseFilteredMemoriesOptions = {}) {
  const { spaceId, debounceMs = 300 } = options

  const [searchQuery, setSearchQuery] = useState("")
  const [filters, setFilters] = useState<MemoryFilters>({
    dateRange: "all",
    source: null,
    tags: [],
  })
  const [recentSearches, setRecentSearches] =
    useState<string[]>(getRecentSearches)

  const debouncedQuery = useDebounce(searchQuery, debounceMs)
  const isSearchMode = debouncedQuery.trim().length > 0

  const dateRangeTimestamps = getDateRangeTimestamps(filters.dateRange)
  const hasDateFilter = dateRangeTimestamps !== null

  const infiniteQuery = useInfiniteMemories(spaceId)
  const searchResult = useSearchMemories(debouncedQuery, spaceId)
  const dateRangeQuery = useMemoriesByDateRange(
    dateRangeTimestamps?.start ?? 0,
    dateRangeTimestamps?.end ?? 0,
    spaceId
  )

  const activeQuery = useMemo(() => {
    if (isSearchMode) {
      return {
        data: searchResult.data ? [{ memories: searchResult.data }] : undefined,
        isLoading: searchResult.isLoading,
        error: searchResult.error,
        refetch: searchResult.refetch,
        hasNextPage: false,
        fetchNextPage: () => Promise.resolve(),
        isFetchingNextPage: false,
      }
    }
    if (hasDateFilter) {
      return {
        data: dateRangeQuery.data?.pages,
        isLoading: dateRangeQuery.isLoading,
        error: dateRangeQuery.error,
        refetch: dateRangeQuery.refetch,
        hasNextPage: dateRangeQuery.hasNextPage,
        fetchNextPage: dateRangeQuery.fetchNextPage,
        isFetchingNextPage: dateRangeQuery.isFetchingNextPage,
      }
    }
    return {
      data: infiniteQuery.data?.pages,
      isLoading: infiniteQuery.isLoading,
      error: infiniteQuery.error,
      refetch: infiniteQuery.refetch,
      hasNextPage: infiniteQuery.hasNextPage,
      fetchNextPage: infiniteQuery.fetchNextPage,
      isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    }
  }, [isSearchMode, hasDateFilter, searchResult, dateRangeQuery, infiniteQuery])

  const rawMemories = useMemo(() => {
    if (!activeQuery.data) return []
    return activeQuery.data.flatMap((page) => page.memories)
  }, [activeQuery.data])

  const memories = useMemo(() => {
    let filtered = rawMemories

    if (filters.source !== null) {
      filtered = filtered.filter((m) => m.source === filters.source)
    }

    if (filters.tags.length > 0) {
      filtered = filtered.filter((m) =>
        filters.tags.every((tag) => m.tags.includes(tag))
      )
    }

    return filtered
  }, [rawMemories, filters.source, filters.tags])

  const availableSources = useMemo(() => {
    const sources = new Set<string>()
    rawMemories.forEach((m) => sources.add(m.source))
    return Array.from(sources).sort()
  }, [rawMemories])

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const saveSearch = useCallback((query: string) => {
    if (!query.trim()) return
    saveRecentSearch(query)
    setRecentSearches(getRecentSearches())
  }, [])

  const handleSelectRecent = useCallback(
    (query: string) => {
      setSearchQuery(query)
      saveSearch(query)
    },
    [saveSearch]
  )

  const handleTagSelect = useCallback((tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags : [...prev.tags, tag],
    }))
  }, [])

  const setDateRange = useCallback((dateRange: DateRange) => {
    setFilters((prev) => ({ ...prev, dateRange }))
  }, [])

  const setSource = useCallback((source: string | null) => {
    setFilters((prev) => ({ ...prev, source }))
  }, [])

  const toggleTag = useCallback((tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({ dateRange: "all", source: null, tags: [] })
    setSearchQuery("")
  }, [])

  const removeTag = useCallback((tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }))
  }, [])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.dateRange !== "all") count++
    if (filters.source !== null) count++
    count += filters.tags.length
    return count
  }, [filters])

  return {
    memories,
    isLoading: activeQuery.isLoading,
    error: activeQuery.error,
    refetch: activeQuery.refetch,
    hasNextPage: activeQuery.hasNextPage ?? false,
    fetchNextPage: activeQuery.fetchNextPage,
    isFetchingNextPage: activeQuery.isFetchingNextPage,

    searchQuery,
    debouncedQuery,
    isSearchMode,
    onSearchChange: handleSearchChange,
    onTagSelect: handleTagSelect,
    recentSearches,
    saveSearch,
    onSelectRecent: handleSelectRecent,
    isSearching: isSearchMode && searchResult.isLoading,

    filters,
    dateRange: filters.dateRange,
    selectedTags: filters.tags,
    selectedSource: filters.source,
    setDateRange,
    setSource,
    toggleTag,
    removeTag,
    clearFilters,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0 || isSearchMode,

    availableSources,
  }
}
