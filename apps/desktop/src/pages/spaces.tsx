import { useState } from "react"
import { Link } from "react-router-dom"
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
import { Plus, FolderOpen, Lock, Trash2, X, AlertTriangle } from "lucide-react"
import {
  useSpaces,
  useCreateSpace,
  useDeleteSpace,
  useSpaceMemoryCount,
} from "@/hooks"
import { PageLoading } from "@/components/loading-spinner"
import { ErrorDisplay } from "@/components/error-display"
import { EmptyState } from "@/components/empty-state"
import type { Space } from "@/lib/types"

// Common emoji options for spaces
const EMOJI_OPTIONS = [
  "📁",
  "💼",
  "🏠",
  "🎯",
  "📚",
  "💡",
  "🔬",
  "🎨",
  "🎮",
  "🛠️",
  "📝",
  "🌟",
]

export function SpacesPage(): React.ReactElement {
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const { data: spaces = [], isLoading, error, refetch } = useSpaces()

  return (
    <div className="space-y-6">
      {/* Header with New Space button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Your Spaces</h2>
          <p className="text-sm text-muted-foreground">
            Organize your memories into separate contexts
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4" />
          New Space
        </Button>
      </div>

      {/* Create Space Dialog */}
      {showCreateDialog && (
        <CreateSpaceDialog onClose={() => setShowCreateDialog(false)} />
      )}

      {/* Content */}
      {isLoading ? (
        <PageLoading message="Loading spaces..." />
      ) : error ? (
        <ErrorDisplay error={error} onRetry={refetch} />
      ) : spaces.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={FolderOpen}
              title="No spaces yet"
              description="Create your first space to start organizing your memories into separate contexts."
              action={
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Space
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {spaces.map((space) => (
            <SpaceCard key={space.id} space={space} />
          ))}

          {/* Add Space Card */}
          <Card
            className="flex cursor-pointer items-center justify-center border-dashed transition-colors hover:border-primary hover:bg-accent/50"
            onClick={() => setShowCreateDialog(true)}
          >
            <CardContent className="flex flex-col items-center py-8 text-center">
              <div className="mb-3 rounded-full bg-muted p-3">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Create New Space</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add a new context for your memories
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

interface SpaceCardProps {
  space: Space
}

function SpaceCard({ space }: SpaceCardProps): React.ReactElement {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const deleteSpace = useDeleteSpace()
  const { data: memoryCount = 0 } = useSpaceMemoryCount(space.id)

  const handleDelete = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async (): Promise<void> => {
    await deleteSpace.mutateAsync(space.id)
    setShowDeleteConfirm(false)
  }

  const lastActivity = new Date(space.updated_at * 1000)
  const lastActivityStr = lastActivity.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })

  if (showDeleteConfirm) {
    return (
      <Card className="h-full border-destructive/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <CardTitle className="text-base">Delete Space?</CardTitle>
          </div>
          <CardDescription>
            This will delete &quot;{space.name}&quot; and all its memories. This
            action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteConfirm(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={confirmDelete}
            loading={deleteSpace.isPending}
            className="flex-1"
          >
            Delete
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Link to={`/spaces/${space.id}`} className="group no-underline">
      <Card className="h-full transition-colors hover:border-primary">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="rounded-lg bg-muted p-2 text-xl">
              {space.icon || (
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <Lock className="mr-1 h-3 w-3" /> Private
              </Badge>
              <button
                onClick={handleDelete}
                className="rounded-md p-1 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                title="Delete space"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <CardTitle className="mt-3">{space.name}</CardTitle>
          {space.source_rules && (
            <CardDescription className="line-clamp-2">
              {space.source_rules}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{memoryCount} memories</span>
            <span>Updated: {lastActivityStr}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

interface CreateSpaceDialogProps {
  onClose: () => void
}

function CreateSpaceDialog({
  onClose,
}: CreateSpaceDialogProps): React.ReactElement {
  const [name, setName] = useState("")
  const [icon, setIcon] = useState<string | undefined>()
  const createSpace = useCreateSpace()

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      await createSpace.mutateAsync({ name: name.trim(), icon })
      onClose()
    } catch {
      // Error is handled by React Query
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Create New Space</CardTitle>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent">
            <X className="h-5 w-5" />
          </button>
        </div>
        <CardDescription>
          Create a space to organize related memories together
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name input */}
          <div className="space-y-2">
            <label htmlFor="space-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="space-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Work Projects"
              autoFocus
            />
          </div>

          {/* Icon picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Icon (optional)</label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(icon === emoji ? undefined : emoji)}
                  className={`rounded-md p-2 text-xl transition-colors ${
                    icon === emoji
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-accent"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Error message */}
          {createSpace.error && <ErrorDisplay error={createSpace.error} />}

          {/* Submit button */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              loading={createSpace.isPending}
            >
              Create Space
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
