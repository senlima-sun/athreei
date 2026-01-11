import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search, FileText } from "lucide-react"
import {
  useMemories,
  useSearchMemories,
  useTags,
  useMemoryFilters,
  useSpaces,
} from "@/hooks"
import { PageLoading } from "@/components/common/loading-spinner"
import { ErrorDisplay } from "@/components/common/error-display"
import { EmptyState } from "@/components/common/empty-state"
import { MemoryFilters } from "@/components/memory/memory-filters"
import { MemoryCard } from "@/components/memory/memory-card"
import { EditMemoryDialog } from "@/components/edit-memory-dialog"
import type { Memory } from "@/lib/types"

export function MemoriesPage(): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState("")
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null)

  const {
    filters,
    filterMemories,
    clearFilters,
    setDateRange,
    setSource,
    toggleTag,
    activeFilterCount,
    hasActiveFilters,
  } = useMemoryFilters()

  const {
    data: memories = [],
    isLoading: memoriesLoading,
    error: memoriesError,
    refetch: refetchMemories,
  } = useMemories(undefined, 500)

  const { data: tags = [] } = useTags()
  const { data: spaces = [] } = useSpaces()

  const { data: searchResults, isLoading: searchLoading } = useSearchMemories(
    searchQuery,
    undefined
  )

  const baseMemories = searchQuery.length > 0 ? (searchResults ?? []) : memories
  const displayMemories = useMemo(
    () => filterMemories(baseMemories),
    [filterMemories, baseMemories]
  )

  const getSpaceName = (spaceId: string | null): string | null => {
    if (!spaceId) return null
    const space = spaces.find((s) => s.id === spaceId)
    return space ? space.name : null
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search all memories..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <MemoryFilters
              filters={filters}
              memories={memories}
              tags={tags}
              onDateRangeChange={setDateRange}
              onSourceChange={setSource}
              onTagToggle={toggleTag}
              onClearAll={clearFilters}
              activeFilterCount={activeFilterCount}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Memories</CardTitle>
            {(searchQuery || hasActiveFilters) && (
              <Badge variant="outline" className="text-xs">
                {displayMemories.length} of {memories.length}
              </Badge>
            )}
          </div>
          <CardDescription>
            {searchQuery && hasActiveFilters
              ? `Filtered search results for "${searchQuery}"`
              : searchQuery
                ? `Search results for "${searchQuery}"`
                : hasActiveFilters
                  ? "Filtered memories"
                  : "All captured memories across all spaces"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {memoriesLoading || searchLoading ? (
            <PageLoading message="Loading memories..." />
          ) : memoriesError ? (
            <ErrorDisplay error={memoriesError} onRetry={refetchMemories} />
          ) : displayMemories.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={searchQuery ? "No results found" : "No memories yet"}
              description={
                searchQuery
                  ? `No memories match "${searchQuery}". Try a different search.`
                  : "Memories will appear here when you use AI tools connected through MCP."
              }
            />
          ) : (
            <div className="space-y-3">
              {displayMemories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  spaceName={getSpaceName(memory.space_id)}
                  onEdit={() => setEditingMemory(memory)}
                  showExpandContent={true}
                  navigateOnClick={true}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {searchQuery && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Search:</span>
          <Badge
            variant="secondary"
            className="cursor-pointer gap-1"
            onClick={() => setSearchQuery("")}
          >
            {searchQuery}
            <span>&times;</span>
          </Badge>
        </div>
      )}

      <EditMemoryDialog
        open={editingMemory !== null}
        onOpenChange={(open) => !open && setEditingMemory(null)}
        memory={editingMemory}
      />
    </div>
  )
}
