import { useState } from "react"
import { useParams, Link, useNavigate } from "react-router-dom"
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
  ArrowLeft,
  Calendar,
  Tag,
  Search,
  FileText,
  Globe,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import {
  useSpace,
  useMemories,
  useSearchMemories,
  useDeleteMemory,
} from "@/hooks"
import { PageLoading } from "@/components/loading-spinner"
import { PageError, ErrorDisplay } from "@/components/error-display"
import { EmptyState } from "@/components/empty-state"
import type { Memory } from "@/lib/types"

export function SpaceDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState("")

  // Fetch space details
  const {
    data: space,
    isLoading: spaceLoading,
    error: spaceError,
  } = useSpace(id ?? "")

  // Fetch memories for this space
  const {
    data: memories = [],
    isLoading: memoriesLoading,
    error: memoriesError,
    refetch: refetchMemories,
  } = useMemories(id, 100)

  // Search memories
  const { data: searchResults, isLoading: searchLoading } = useSearchMemories(
    searchQuery,
    id
  )

  // Use search results if searching, otherwise use all memories
  const displayMemories =
    searchQuery.length > 0 ? (searchResults ?? []) : memories

  // Loading state
  if (spaceLoading) {
    return <PageLoading message="Loading space..." />
  }

  // Error state
  if (spaceError) {
    return <PageError error={spaceError} onRetry={() => navigate("/spaces")} />
  }

  // Not found
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
      {/* Back link and title */}
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

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search memories..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filter buttons */}
            <Button variant="outline" size="sm" className="gap-2">
              <Calendar className="h-4 w-4" />
              Date Range
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Tag className="h-4 w-4" />
              Tags
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Memories List */}
      <Card>
        <CardHeader>
          <CardTitle>Memories</CardTitle>
          <CardDescription>
            {searchQuery
              ? `Search results for "${searchQuery}"`
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
                <MemoryCard key={memory.id} memory={memory} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active filters display */}
      {searchQuery && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          <Badge
            variant="secondary"
            className="cursor-pointer"
            onClick={() => setSearchQuery("")}
          >
            Search: {searchQuery}
            <span className="ml-1">&times;</span>
          </Badge>
        </div>
      )}
    </div>
  )
}

interface MemoryCardProps {
  memory: Memory
}

function MemoryCard({ memory }: MemoryCardProps): React.ReactElement {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
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

  return (
    <div className="group flex items-start gap-3 rounded-lg border border-border bg-card/50 p-4 transition-colors hover:bg-card">
      <div className="mt-0.5 rounded-md bg-muted p-2">
        <Globe className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h5 className="truncate font-medium">
                {memory.title || memory.source || "Untitled"}
              </h5>
              <Badge variant="outline" className="shrink-0 text-xs">
                {memory.source}
              </Badge>
            </div>
            {memory.summary && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {memory.summary}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="shrink-0 rounded-md p-1 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
            title="Delete memory"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Content preview */}
        {memory.content && (
          <div className="mt-2 rounded-md bg-muted/50 p-2">
            <p className="line-clamp-3 text-xs text-muted-foreground">
              {memory.content}
            </p>
          </div>
        )}

        {/* Metadata */}
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
  )
}
