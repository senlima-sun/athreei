import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Globe,
  Trash2,
  AlertTriangle,
  Pencil,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { useDeleteMemory } from "@/hooks"
import type { Memory } from "@/lib/types"

interface MemoryCardProps {
  memory: Memory
  spaceName?: string | null
  onEdit?: () => void
  showExpandContent?: boolean
  navigateOnClick?: boolean
}

export function MemoryCard({
  memory,
  spaceName,
  onEdit,
  showExpandContent = true,
  navigateOnClick = true,
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
    if (navigateOnClick) {
      navigate(`/memories/${memory.id}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (navigateOnClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault()
      handleCardClick()
    }
  }

  return (
    <div
      className={`group rounded-lg border border-border bg-card/50 p-4 transition-colors hover:bg-card ${
        navigateOnClick ? "cursor-pointer" : ""
      }`}
      onClick={navigateOnClick ? handleCardClick : undefined}
      role={navigateOnClick ? "button" : undefined}
      tabIndex={navigateOnClick ? 0 : undefined}
      onKeyDown={navigateOnClick ? handleKeyDown : undefined}
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
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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

          {showExpandContent && memory.content && (
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

          {!showExpandContent && memory.content && (
            <div className="mt-2 rounded-md bg-muted/50 p-2">
              <p className="line-clamp-3 text-xs text-muted-foreground">
                {memory.content}
              </p>
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
