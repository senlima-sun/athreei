import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Globe, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableTitle } from "@/components/common"
import { RichTextEditor } from "@/components/editor"
import { useUpdateMemory, useDeleteMemory } from "@/hooks"
import { cn } from "@/lib/utils"
import type { Memory } from "@/lib/types"

interface MemoryListItemProps {
  memory: Memory
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/^>\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim()
}

export function MemoryListItem({
  memory,
}: MemoryListItemProps): React.ReactElement {
  const [isExpanded, setIsExpanded] = useState(false)
  const [content, setContent] = useState(memory.content ?? "")
  const [confirmDelete, setConfirmDelete] = useState(false)

  const updateMemory = useUpdateMemory()
  const deleteMemory = useDeleteMemory()

  const lastSavedContentRef = useRef<string>(memory.content ?? "")
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setContent(memory.content ?? "")
    lastSavedContentRef.current = memory.content ?? ""
  }, [memory.content])

  const saveTitle = useCallback(
    async (newTitle: string): Promise<void> => {
      try {
        await updateMemory.mutateAsync({
          id: memory.id,
          title: newTitle || undefined,
        })
      } catch (err) {
        console.error("Failed to update title:", err)
      }
    },
    [memory.id, updateMemory]
  )

  const saveContentImmediate = useCallback(
    async (newContent: string): Promise<void> => {
      if (newContent === lastSavedContentRef.current) return
      lastSavedContentRef.current = newContent
      try {
        await updateMemory.mutateAsync({
          id: memory.id,
          content: newContent || undefined,
        })
      } catch (err) {
        console.error("Failed to update content:", err)
      }
    },
    [memory.id, updateMemory]
  )

  const handleContentChange = useCallback(
    (newContent: string): void => {
      setContent(newContent)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        saveContentImmediate(newContent)
      }, 1000)
    },
    [saveContentImmediate]
  )

  const handleContentBlur = useCallback((): void => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    saveContentImmediate(content)
  }, [content, saveContentImmediate])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const handleDelete = async (): Promise<void> => {
    await deleteMemory.mutateAsync(memory.id)
  }

  const time = new Date(memory.created_at * 1000)
  const timeString = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  const previewText = useMemo(() => {
    const parts: string[] = []
    if (memory.title) parts.push(memory.title)
    if (memory.summary) parts.push(memory.summary)
    if (content) parts.push(stripMarkdown(content))
    return parts.join(" — ") || null
  }, [memory.title, memory.summary, content])

  return (
    <div
      className={cn(
        "group py-1.5 px-2 transition-colors cursor-pointer",
        isExpanded && "bg-muted/30"
      )}
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Globe className="h-3 w-3 shrink-0 text-muted-foreground/50" />

        <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground/60">
          {timeString}
        </span>

        <Badge variant="outline" className="shrink-0 h-4 px-1 text-[9px]">
          {memory.source}
        </Badge>

        {previewText ? (
          <span className="flex-1 min-w-0 truncate text-[11px] text-foreground/80">
            {previewText}
          </span>
        ) : (
          <span className="flex-1 min-w-0 truncate text-[11px] italic text-muted-foreground/40">
            No content
          </span>
        )}

        <Button
          variant={confirmDelete ? "destructive" : "ghost"}
          size="sm"
          className="h-4 w-4 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation()
            if (confirmDelete) {
              handleDelete()
            } else {
              setConfirmDelete(true)
            }
          }}
          onMouseLeave={() => setConfirmDelete(false)}
        >
          <Trash2 className="h-2.5 w-2.5" />
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-1.5 pl-4" onClick={(e) => e.stopPropagation()}>
          <div className="mb-1.5">
            <EditableTitle
              initialValue={memory.title ?? ""}
              onSave={saveTitle}
              placeholder="Add title..."
              className="text-xs font-medium"
            />
          </div>
          <RichTextEditor
            value={content}
            onChange={handleContentChange}
            placeholder="Write something..."
            variant="borderless"
            showToolbar
            stickyToolbar
            onEscape={() => setIsExpanded(false)}
            onBlur={handleContentBlur}
          />
          <div className="flex items-center gap-1 mt-1.5">
            {memory.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="h-4 px-1 text-[9px]"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
