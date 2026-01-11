import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, FolderOpen, Trash2, X, ChevronRight } from "lucide-react"
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
  const [isCreating, setIsCreating] = useState(false)

  const { data: spaces = [], isLoading, error, refetch } = useSpaces()

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Spaces</h2>
          <p className="text-xs text-muted-foreground">
            Organize memories into contexts
          </p>
        </div>
        {!isCreating && (
          <Button
            size="sm"
            variant="secondary"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        )}
      </div>

      {/* Inline Create Form */}
      {isCreating && (
        <CreateSpaceInline onClose={() => setIsCreating(false)} />
      )}

      {/* Content */}
      {isLoading ? (
        <PageLoading message="Loading spaces..." />
      ) : error ? (
        <ErrorDisplay error={error} onRetry={refetch} />
      ) : spaces.length === 0 && !isCreating ? (
        <div className="rounded-md bg-card p-4">
          <EmptyState
            icon={FolderOpen}
            title="No spaces yet"
            description="Create a space to organize your memories."
            action={
              <Button
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Create Space
              </Button>
            }
          />
        </div>
      ) : (
        <div className="space-y-1">
          {spaces.map((space) => (
            <SpaceRow key={space.id} space={space} />
          ))}
        </div>
      )}
    </div>
  )
}

interface SpaceRowProps {
  space: Space
}

function SpaceRow({ space }: SpaceRowProps): React.ReactElement {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteSpace = useDeleteSpace()
  const { data: memoryCount = 0 } = useSpaceMemoryCount(space.id)

  const handleDelete = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    if (confirmDelete) {
      await deleteSpace.mutateAsync(space.id)
    } else {
      setConfirmDelete(true)
    }
  }

  return (
    <Link
      to={`/spaces/${space.id}`}
      className="group flex items-center gap-2.5 rounded-md bg-card px-3 py-2 no-underline transition-colors hover:bg-accent"
      onMouseLeave={() => setConfirmDelete(false)}
    >
      <span className="shrink-0 text-base">
        {space.icon || <FolderOpen className="h-4 w-4 text-muted-foreground" />}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-medium">
        {space.name}
      </span>
      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
        {memoryCount}
      </span>
      <button
        onClick={handleDelete}
        className={`shrink-0 rounded p-1 opacity-0 transition-all group-hover:opacity-100 ${
          confirmDelete
            ? "bg-destructive text-destructive-foreground opacity-100"
            : "hover:bg-destructive/10 hover:text-destructive"
        }`}
        title={confirmDelete ? "Click again to confirm" : "Delete space"}
      >
        <Trash2 className="h-3 w-3" />
      </button>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
    </Link>
  )
}

interface CreateSpaceInlineProps {
  onClose: () => void
}

function CreateSpaceInline({
  onClose,
}: CreateSpaceInlineProps): React.ReactElement {
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
      // Error handled by React Query
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md bg-card p-3 space-y-2.5"
    >
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Space name..."
          className="h-7 flex-1 text-xs"
          autoFocus
        />
        <Button
          type="submit"
          size="sm"
          className="h-7 text-xs"
          disabled={!name.trim()}
          loading={createSpace.isPending}
        >
          Create
        </Button>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 hover:bg-accent"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {EMOJI_OPTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => setIcon(icon === emoji ? undefined : emoji)}
            className={`rounded p-1 text-sm transition-colors ${
              icon === emoji
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>
      {createSpace.error && <ErrorDisplay error={createSpace.error} />}
    </form>
  )
}
