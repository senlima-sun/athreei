import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
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
import {
  Search,
  FileText,
  Globe,
  Trash2,
  AlertTriangle,
  Pencil,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import {
  useMemories,
  useSearchMemories,
  useDeleteMemory,
  useTags,
  useMemoryFilters,
  useSpaces,
} from "@/hooks"
import { PageLoading } from "@/components/loading-spinner"
import { ErrorDisplay } from "@/components/error-display"
import { EmptyState } from "@/components/empty-state"
import { MemoryFilters } from "@/components/memory-filters"
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

interface MemoryCardProps {
  memory: Memory
  spaceName: string | null
  onEdit?: () => void
}

function MemoryCard({
  memory,
  spaceName,
  onEdit,
}: MemoryCardProps): React.ReactElement {
  const navigate = useNavigate()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const deleteMemory = useDeleteMemory()

  const time = new Date(memory.created_at * 1000)
  const dateString = time.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const timeString = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  const handleDelete = async (): Promise<void> => {
    await deleteMemory.mutateAsync(memory.id)
    setShowDeleteConfirm(false)
  }

  if (showDeleteConfirm) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
        <div className="flex-1">
          <p className="text-sm font-medium">Delete this memory?</p>
          <p className="text-xs text-muted-foreground">
            This action cannot be undone.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDeleteConfirm(false)}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          loading={deleteMemory.isPending}
        >
          Delete
        </Button>
      </div>
    )
  }

  const handleCardClick = (): void => {
    navigate(`/memories/${memory.id}`)
  }

  return (
    <div
      className="group cursor-pointer rounded-lg border border-border bg-card/50 p-4 transition-colors hover:bg-card"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          handleCardClick()
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-md bg-muted p-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h5 className="truncate font-medium">
                  {memory.title || memory.source || "Untitled"}
                </h5>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {memory.source}
                </Badge>
                {spaceName && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {spaceName}
                  </Badge>
                )}
              </div>
              {memory.summary && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {memory.summary}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit()
                  }}
                  className="rounded-md p-1 hover:bg-accent"
                  title="Edit memory"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowDeleteConfirm(true)
                }}
                className="rounded-md p-1 hover:bg-destructive/10 hover:text-destructive"
                title="Delete memory"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {memory.content && (
            <div className="mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setExpanded(!expanded)
                }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Hide content
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" />
                    Show full content
                  </>
                )}
              </button>
              {expanded && (
                <div className="mt-2 rounded-md bg-muted/50 p-3">
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {memory.content}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {dateString} at {timeString}
            </span>
            {memory.tags.length > 0 && (
              <div className="flex items-center gap-1">
                {memory.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {memory.tags.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{memory.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
