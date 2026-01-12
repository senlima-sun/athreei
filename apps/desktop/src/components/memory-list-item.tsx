import { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Globe,
  Trash2,
  MessageSquare,
  Bot,
  FileText,
  ChevronDown,
  Pencil,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { EditableTitle } from "@/components/common"
import { RichTextEditor, MemoryContentViewer } from "@/components/editor"
import { useUpdateMemory, useDeleteMemory } from "@/hooks"
import { cn } from "@/lib/utils"
import type { Memory } from "@/lib/types"

interface MemoryListItemProps {
  memory: Memory
}

type ViewState = "collapsed" | "expanded" | "editing"

const SOURCE_CONFIG: Record<
  string,
  { icon: typeof Globe; color: string; bg: string }
> = {
  browser: {
    icon: Globe,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  claude: {
    icon: Bot,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
  chat: {
    icon: MessageSquare,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  default: {
    icon: FileText,
    color: "text-muted-foreground",
    bg: "bg-muted/50",
  },
}

function getSourceConfig(source: string) {
  return SOURCE_CONFIG[source.toLowerCase()] ?? SOURCE_CONFIG.default
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
  const [viewState, setViewState] = useState<ViewState>("collapsed")
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

  const handleRowClick = (): void => {
    if (viewState === "collapsed") {
      setViewState("expanded")
    }
  }

  const handleToggleExpand = (e: React.MouseEvent): void => {
    e.stopPropagation()
    if (viewState === "collapsed") {
      setViewState("expanded")
    } else {
      setViewState("collapsed")
    }
  }

  const handleContentClick = (): void => {
    if (viewState === "expanded") {
      setViewState("editing")
    }
  }

  const handleEditorEscape = (): void => {
    setViewState("expanded")
  }

  const time = new Date(memory.created_at * 1000)
  const timeString = time.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  const previewText = useMemo(() => {
    if (memory.title) return memory.title
    if (memory.summary) return memory.summary
    if (content) return stripMarkdown(content).slice(0, 60)
    return null
  }, [memory.title, memory.summary, content])

  const sourceConfig = getSourceConfig(memory.source)
  const SourceIcon = sourceConfig.icon

  const isExpanded = viewState !== "collapsed"
  const isEditing = viewState === "editing"

  return (
    <div
      className={cn(
        "group rounded-lg px-3 py-2.5 transition-all duration-150",
        isExpanded
          ? "bg-card shadow-sm ring-1 ring-border/50"
          : "cursor-pointer hover:bg-accent/40"
      )}
      onClick={handleRowClick}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-150",
            !isExpanded && "group-hover:scale-105",
            sourceConfig.bg
          )}
        >
          <SourceIcon className={cn("h-4 w-4", sourceConfig.color)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {previewText ? (
              <span className="flex-1 truncate text-[13px] font-medium text-foreground/90">
                {previewText}
              </span>
            ) : (
              <span className="flex-1 truncate text-[13px] italic text-muted-foreground/50">
                No content
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">{timeString}</span>
            <span className="text-border">·</span>
            <span className="capitalize">{memory.source}</span>
            {memory.tags.length > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="truncate">
                  {memory.tags.slice(0, 2).join(", ")}
                  {memory.tags.length > 2 && ` +${memory.tags.length - 2}`}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn(
              "text-muted-foreground/60 transition-all duration-150",
              !isExpanded && "opacity-0 group-hover:opacity-100"
            )}
            onClick={handleToggleExpand}
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-150",
                isExpanded && "rotate-180"
              )}
            />
          </Button>

          <Button
            variant={confirmDelete ? "destructive" : "ghost"}
            size="icon-sm"
            className={cn(
              "text-muted-foreground/60 transition-all duration-150",
              !isExpanded && "opacity-0 group-hover:opacity-100",
              confirmDelete && "opacity-100"
            )}
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
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div
          className="mt-3 animate-fade-in border-t border-border/50 pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          {isEditing ? (
            <>
              <div className="mb-2">
                <EditableTitle
                  initialValue={memory.title ?? ""}
                  onSave={saveTitle}
                  placeholder="Add title..."
                  className="text-sm font-medium"
                />
              </div>
              <RichTextEditor
                value={content}
                onChange={handleContentChange}
                placeholder="Write something..."
                variant="borderless"
                showToolbar
                stickyToolbar
                onEscape={handleEditorEscape}
                onBlur={handleContentBlur}
              />
            </>
          ) : (
            <div
              className="group/content cursor-pointer rounded-md p-2 transition-colors hover:bg-accent/30"
              onClick={handleContentClick}
            >
              {memory.title && (
                <h3 className="mb-2 text-sm font-medium text-foreground">
                  {memory.title}
                </h3>
              )}
              {content ? (
                <MemoryContentViewer
                  content={content}
                  className="text-[13px] leading-relaxed text-foreground/80"
                />
              ) : (
                <p className="text-[13px] italic text-muted-foreground/50">
                  No content yet. Click to add...
                </p>
              )}
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground/50 opacity-0 transition-opacity group-hover/content:opacity-100">
                <Pencil className="h-3 w-3" />
                <span>Click to edit</span>
              </div>
            </div>
          )}

          {memory.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {memory.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="rounded-md px-2 py-0.5 text-[11px]"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
