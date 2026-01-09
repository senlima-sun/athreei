import { useEffect, useRef, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import {
  Search,
  X,
  Clock,
  Calendar,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useSearch, useSpaces } from "@/hooks"
import type { Memory, Space } from "@/lib/types"

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface MemoryWithSpace extends Memory {
  space?: Space | null
}

/**
 * Group memories by their space
 */
function groupMemoriesBySpace(
  memories: Memory[],
  spaces: Space[]
): Map<string, MemoryWithSpace[]> {
  const spaceMap = new Map(spaces.map((s) => [s.id, s]))
  const grouped = new Map<string, MemoryWithSpace[]>()

  for (const memory of memories) {
    const spaceId = memory.space_id ?? "uncategorized"
    const space = memory.space_id ? spaceMap.get(memory.space_id) : null

    if (!grouped.has(spaceId)) {
      grouped.set(spaceId, [])
    }
    grouped.get(spaceId)!.push({ ...memory, space })
  }

  return grouped
}

/**
 * Format date for display
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

/**
 * Truncate text to a specified length
 */
function truncate(text: string | null, maxLength: number): string {
  if (!text) return ""
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + "..."
}

export function SearchDialog({
  open,
  onOpenChange,
}: SearchDialogProps): React.ReactElement | null {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const {
    query,
    setQuery,
    results,
    isLoading,
    recentSearches,
    saveSearch,
    clearRecent,
    removeRecentSearch,
  } = useSearch()

  const { data: spaces = [] } = useSpaces()

  // Grouped results for display
  const groupedResults = groupMemoriesBySpace(results, spaces)
  const flatResults = Array.from(groupedResults.values()).flat()
  const hasResults = flatResults.length > 0
  const showRecent = !query && recentSearches.length > 0

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedIndex(-1)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [results])

  // Close on escape
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault()
        onOpenChange(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onOpenChange])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const maxIndex = hasResults ? flatResults.length - 1 : -1

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((prev) => (prev < maxIndex ? prev + 1 : 0))
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : maxIndex))
          break
        case "Enter":
          e.preventDefault()
          if (selectedIndex >= 0 && flatResults[selectedIndex]) {
            handleSelectMemory(flatResults[selectedIndex])
          } else if (query && hasResults) {
            handleSelectMemory(flatResults[0])
          }
          break
      }
    },
    [hasResults, flatResults, selectedIndex, query]
  )

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      )
      selectedElement?.scrollIntoView({ block: "nearest" })
    }
  }, [selectedIndex])

  const handleSelectMemory = (memory: Memory): void => {
    saveSearch(query)
    onOpenChange(false)
    setQuery("")
    navigate(`/spaces/${memory.space_id}?memory=${memory.id}`)
  }

  const handleRecentClick = (recentQuery: string): void => {
    setQuery(recentQuery)
    inputRef.current?.focus()
  }

  const handleClose = (): void => {
    onOpenChange(false)
    setQuery("")
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-[15%] w-full max-w-xl -translate-x-1/2 px-4">
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          {/* Search input */}
          <div className="flex items-center border-b border-border px-4">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search memories..."
              className="h-14 flex-1 bg-transparent px-4 text-base outline-none placeholder:text-muted-foreground"
            />
            {isLoading && (
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" />
            )}
            {query && !isLoading && (
              <button
                onClick={() => setQuery("")}
                className="rounded-md p-1 hover:bg-accent"
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Content */}
          <div ref={listRef} className="max-h-[400px] overflow-y-auto">
            {/* Recent searches */}
            {showRecent && (
              <div className="px-2 py-2">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Recent
                  </span>
                  <button
                    onClick={clearRecent}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 px-2 py-1">
                  {recentSearches.map((recent) => (
                    <button
                      key={recent}
                      onClick={() => handleRecentClick(recent)}
                      className="group flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <Clock className="h-3 w-3" />
                      <span>{recent}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeRecentSearch(recent)
                        }}
                        className="ml-0.5 rounded opacity-0 group-hover:opacity-100"
                        aria-label={`Remove ${recent} from recent searches`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading state */}
            {isLoading && query && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* No results */}
            {!isLoading && query && !hasResults && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No memories found for "{query}"
                </p>
              </div>
            )}

            {/* Results grouped by space */}
            {!isLoading && hasResults && (
              <div className="py-2">
                {Array.from(groupedResults.entries()).map(
                  ([spaceId, memories]) => {
                    const spaceName =
                      spaceId === "uncategorized"
                        ? "Uncategorized"
                        : (memories[0]?.space?.name ?? "Unknown Space")
                    const spaceIcon =
                      spaceId === "uncategorized"
                        ? null
                        : memories[0]?.space?.icon

                    return (
                      <div key={spaceId}>
                        {/* Space header */}
                        <div className="px-4 py-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            {spaceIcon && (
                              <span className="mr-1">{spaceIcon}</span>
                            )}
                            {spaceName}
                          </span>
                        </div>

                        {/* Memories in this space */}
                        {memories.map((memory) => {
                          const globalIndex = flatResults.indexOf(memory)
                          const isSelected = globalIndex === selectedIndex

                          return (
                            <button
                              key={memory.id}
                              data-index={globalIndex}
                              onClick={() => handleSelectMemory(memory)}
                              className={cn(
                                "flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors",
                                isSelected ? "bg-accent" : "hover:bg-accent/50"
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-medium">
                                  {memory.title ?? "Untitled"}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="shrink-0 text-xs"
                                >
                                  {memory.source}
                                </Badge>
                              </div>
                              {memory.summary && (
                                <p className="text-sm text-muted-foreground">
                                  {truncate(memory.summary, 100)}
                                </p>
                              )}
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(memory.created_at)}
                                </span>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )
                  }
                )}
              </div>
            )}

            {/* Empty state - no query */}
            {!query && !showRecent && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Start typing to search your memories
                </p>
              </div>
            )}
          </div>

          {/* Footer with keyboard hints */}
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <ArrowUp className="h-3 w-3" />
                <ArrowDown className="h-3 w-3" />
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" />
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted px-1">
                  Esc
                </kbd>
                Close
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
