import { useState, useMemo } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Search, FileText } from "lucide-react"
import {
  useSpace,
  useMemories,
  useSearchMemories,
  useTags,
  useMemoryFilters,
} from "@/hooks"
import { PageLoading } from "@/components/common/loading-spinner"
import { PageError, ErrorDisplay } from "@/components/common/error-display"
import { EmptyState } from "@/components/common/empty-state"
import { MemoryFilters } from "@/components/memory/memory-filters"
import { MemoryCard } from "@/components/memory/memory-card"
import { EditMemoryDialog } from "@/components/edit-memory-dialog"
import type { Memory } from "@/lib/types"

export function SpaceDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
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
    data: space,
    isLoading: spaceLoading,
    error: spaceError,
  } = useSpace(id ?? "")

  const {
    data: memories = [],
    isLoading: memoriesLoading,
    error: memoriesError,
    refetch: refetchMemories,
  } = useMemories(id, 100)

  const { data: tags = [] } = useTags()

  const { data: searchResults, isLoading: searchLoading } = useSearchMemories(
    searchQuery,
    id
  )

  const baseMemories = searchQuery.length > 0 ? (searchResults ?? []) : memories
  const displayMemories = useMemo(
    () => filterMemories(baseMemories),
    [filterMemories, baseMemories]
  )

  if (spaceLoading) {
    return <PageLoading message="Loading space..." />
  }

  if (spaceError) {
    return <PageError error={spaceError} onRetry={() => navigate("/spaces")} />
  }

  if (!space) {
    return (
      <div className="space-y-6">
        <Link
          to="/spaces"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Spaces
        </Link>
        <PageError
          error={new Error("Space not found")}
          onRetry={() => navigate("/spaces")}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/spaces"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Spaces
        </Link>
      </div>

      <div className="flex items-start gap-3">
        {space.icon && (
          <div className="rounded-lg bg-muted p-2 text-2xl">{space.icon}</div>
        )}
        <div>
          <h2 className="text-2xl font-semibold">{space.name}</h2>
          {space.source_rules && (
            <p className="mt-1 text-muted-foreground">{space.source_rules}</p>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search memories..."
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
            <CardTitle>Memories</CardTitle>
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
                  ? "Filtered memories in this space"
                  : "All captured memories in this space"}
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
                  : "Memories will appear here when you use AI tools connected through MCP, or when you save manual notes."
              }
            />
          ) : (
            <div className="space-y-3">
              {displayMemories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onEdit={() => setEditingMemory(memory)}
                  showExpandContent={false}
                  navigateOnClick={false}
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
