import { useState, useCallback } from "react"
import { useSearchMemories } from "./use-memories"
import { useDebounce } from "./use-debounce"

const RECENT_SEARCHES_KEY = "aiii-recent-searches"
const MAX_RECENT_SEARCHES = 5

/**
 * Get recent searches from localStorage
 */
function getRecentSearches(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

/**
 * Save a search query to recent searches
 */
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

/**
 * Clear all recent searches
 */
function clearRecentSearches(): void {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY)
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Hook for managing search state with debouncing and recent searches
 *
 * @param spaceId - Optional space filter
 * @param debounceMs - Debounce delay in milliseconds (default 300ms)
 */
export function useSearch(spaceId?: string, debounceMs = 300) {
  const [query, setQuery] = useState("")
  const [recentSearches, setRecentSearches] =
    useState<string[]>(getRecentSearches)

  const debouncedQuery = useDebounce(query, debounceMs)

  const searchResult = useSearchMemories(debouncedQuery, spaceId)

  const handleSearch = useCallback((newQuery: string) => {
    setQuery(newQuery)
  }, [])

  const saveSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return
    saveRecentSearch(searchQuery)
    setRecentSearches(getRecentSearches())
  }, [])

  const clearRecent = useCallback(() => {
    clearRecentSearches()
    setRecentSearches([])
  }, [])

  const removeRecentSearch = useCallback(
    (searchQuery: string) => {
      const updated = recentSearches.filter((s) => s !== searchQuery)
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
      } catch {
        // Ignore localStorage errors
      }
      setRecentSearches(updated)
    },
    [recentSearches]
  )

  return {
    query,
    debouncedQuery,
    setQuery: handleSearch,
    results: searchResult.data ?? [],
    isLoading: searchResult.isLoading,
    isError: searchResult.isError,
    error: searchResult.error,
    recentSearches,
    saveSearch,
    clearRecent,
    removeRecentSearch,
  }
}
