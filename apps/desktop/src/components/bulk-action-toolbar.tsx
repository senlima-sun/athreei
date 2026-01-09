import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Trash2,
  FolderInput,
  Tag,
  X,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import { useSpaces } from "@/hooks"

interface BulkActionToolbarProps {
  selectedCount: number
  onDelete: () => Promise<void>
  onMove: (targetSpaceId: string | null) => Promise<void>
  onTag: (tags: string[]) => Promise<void>
  onClear: () => void
  isProcessing: boolean
}

export function BulkActionToolbar({
  selectedCount,
  onDelete,
  onMove,
  onTag,
  onClear,
  isProcessing,
}: BulkActionToolbarProps): React.ReactElement | null {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const [showTagInput, setShowTagInput] = useState(false)
  const [tagInput, setTagInput] = useState("")

  const { data: spaces = [] } = useSpaces()

  if (selectedCount === 0) {
    return null
  }

  const handleDelete = async () => {
    await onDelete()
    setShowDeleteConfirm(false)
  }

  const handleMove = async (spaceId: string | null) => {
    await onMove(spaceId)
    setShowMoveMenu(false)
  }

  const handleAddTags = async () => {
    const tags = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
    if (tags.length > 0) {
      await onTag(tags)
      setTagInput("")
      setShowTagInput(false)
    }
  }

  if (showDeleteConfirm) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-destructive/50 bg-background p-4 shadow-lg">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <span className="text-sm">
          Delete {selectedCount} {selectedCount === 1 ? "memory" : "memories"}?
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDeleteConfirm(false)}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Delete"
          )}
        </Button>
      </div>
    )
  }

  if (showMoveMenu) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2 rounded-lg border bg-background p-4 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium">Move to space</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowMoveMenu(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMove(null)}
            disabled={isProcessing}
          >
            No Space
          </Button>
          {spaces.map((space) => (
            <Button
              key={space.id}
              variant="outline"
              size="sm"
              onClick={() => handleMove(space.id)}
              disabled={isProcessing}
            >
              {space.icon} {space.name}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  if (showTagInput) {
    return (
      <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border bg-background p-4 shadow-lg">
        <input
          type="text"
          className="rounded border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          placeholder="Enter tags (comma separated)"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleAddTags()
            } else if (e.key === "Escape") {
              setShowTagInput(false)
              setTagInput("")
            }
          }}
          autoFocus
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowTagInput(false)
            setTagInput("")
          }}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleAddTags}
          disabled={isProcessing || tagInput.trim().length === 0}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Add Tags"
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border bg-background p-3 shadow-lg">
      <Badge variant="secondary" className="text-sm">
        {selectedCount} selected
      </Badge>

      <div className="mx-2 h-6 w-px bg-border" />

      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => setShowMoveMenu(true)}
        disabled={isProcessing}
      >
        <FolderInput className="h-4 w-4" />
        Move
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={() => setShowTagInput(true)}
        disabled={isProcessing}
      >
        <Tag className="h-4 w-4" />
        Tag
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="gap-2 text-destructive hover:text-destructive"
        onClick={() => setShowDeleteConfirm(true)}
        disabled={isProcessing}
      >
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>

      <div className="mx-2 h-6 w-px bg-border" />

      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        onClick={onClear}
        disabled={isProcessing}
      >
        <X className="h-4 w-4" />
        Clear
      </Button>
    </div>
  )
}
