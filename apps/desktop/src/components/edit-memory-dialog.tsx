import { useEffect, useRef, useState } from "react"
import { X, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RichTextEditor } from "@/components/editor"
import { useUpdateMemory, useSpaces } from "@/hooks"
import type { Memory } from "@/lib/types"

interface EditMemoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memory: Memory | null
}

export function EditMemoryDialog({
  open,
  onOpenChange,
  memory,
}: EditMemoryDialogProps): React.ReactElement | null {
  const titleRef = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [spaceId, setSpaceId] = useState<string | null>(null)

  const { data: spaces = [] } = useSpaces()
  const updateMemory = useUpdateMemory()

  // Initialize form when memory changes
  useEffect(() => {
    if (memory && open) {
      setTitle(memory.title ?? "")
      setContent(memory.content ?? "")
      setSpaceId(memory.space_id ?? null)
      setTimeout(() => titleRef.current?.focus(), 0)
    }
  }, [memory, open])

  // Close on escape
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault()
        handleClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open])

  const handleClose = (): void => {
    onOpenChange(false)
    updateMemory.reset()
  }

  const handleSave = async (): Promise<void> => {
    if (!memory) return

    try {
      await updateMemory.mutateAsync({
        id: memory.id,
        title: title || undefined,
        content: content || undefined,
        space_id: spaceId,
      })
      handleClose()
    } catch (error) {
      console.error("Failed to update memory:", error)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSave()
    }
  }

  if (!open || !memory) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-[15%] w-full max-w-lg -translate-x-1/2 px-4">
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-lg font-semibold">Edit Memory</h2>
            <button
              onClick={handleClose}
              className="rounded-md p-1 hover:bg-accent"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Form */}
          <div className="p-4 space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <label
                htmlFor="edit-title"
                className="text-sm font-medium text-muted-foreground"
              >
                Title
              </label>
              <Input
                id="edit-title"
                ref={titleRef}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Memory title"
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Content
              </label>
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder="Memory content..."
              />
            </div>

            {/* Space */}
            <div className="space-y-2">
              <label
                htmlFor="edit-space"
                className="text-sm font-medium text-muted-foreground"
              >
                Space
              </label>
              <Select
                value={spaceId ?? ""}
                onValueChange={(value) => setSpaceId(value || null)}
                items={{
                  "": "No space",
                  ...Object.fromEntries(
                    spaces.map((s) => [
                      s.id,
                      `${s.icon ? s.icon + " " : ""}${s.name}`,
                    ])
                  ),
                }}
              >
                <SelectTrigger variant="outline">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No space</SelectItem>
                  {spaces.map((space) => (
                    <SelectItem key={space.id} value={space.id}>
                      {space.icon && `${space.icon} `}
                      {space.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Error */}
            {updateMemory.error && (
              <p className="text-sm text-destructive">
                {updateMemory.error instanceof Error
                  ? updateMemory.error.message
                  : "Failed to update memory"}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="text-xs text-muted-foreground">
              <kbd className="rounded border border-border bg-muted px-1">
                Cmd
              </kbd>
              +
              <kbd className="rounded border border-border bg-muted px-1">
                Enter
              </kbd>
              {" to save"}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateMemory.isPending}>
                {updateMemory.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
