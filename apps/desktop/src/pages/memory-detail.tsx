import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { useParams, useNavigate, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ArrowLeft,
  Globe,
  Trash2,
  Calendar,
  Clock,
  Folder,
  Tag,
} from "lucide-react"
import { useMemory, useDeleteMemory, useSpaces, useUpdateMemory } from "@/hooks"
import { useLayoutHeader } from "@/components/layout"
import { PageLoading } from "@/components/loading-spinner"
import { ErrorDisplay } from "@/components/error-display"
import { MemoryContentViewer, RichTextEditor } from "@/components/editor"

interface EditableTitleProps {
  initialValue: string
  onSave: (value: string) => void
}

function EditableTitle({
  initialValue,
  onSave,
}: EditableTitleProps): React.ReactElement {
  const [value, setValue] = useState(initialValue)
  const lastSavedRef = useRef(initialValue)

  useEffect(() => {
    if (initialValue !== lastSavedRef.current) {
      setValue(initialValue)
      lastSavedRef.current = initialValue
    }
  }, [initialValue])

  const handleBlur = (): void => {
    if (value !== lastSavedRef.current) {
      lastSavedRef.current = value
      onSave(value)
    }
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur()
        }
      }}
      placeholder="Untitled"
      className="min-w-0 flex-1 truncate bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
    />
  )
}

export function MemoryDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [isEditingContent, setIsEditingContent] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const [content, setContent] = useState("")
  const [spaceId, setSpaceId] = useState<string | null>(null)

  const { data: memory, isLoading, error, refetch } = useMemory(id ?? "")
  const { data: spaces = [] } = useSpaces()
  const deleteMemory = useDeleteMemory()
  const updateMemory = useUpdateMemory()

  useEffect(() => {
    if (memory) {
      setContent(memory.content ?? "")
      setSpaceId(memory.space_id ?? null)
    }
  }, [memory])

  const handleDelete = async (): Promise<void> => {
    if (!id) return
    await deleteMemory.mutateAsync(id)
    navigate(-1)
  }

  const saveTitle = useCallback(
    async (newTitle: string): Promise<void> => {
      if (!memory) return
      try {
        await updateMemory.mutateAsync({
          id: memory.id,
          title: newTitle || undefined,
        })
      } catch (err) {
        console.error("Failed to update title:", err)
      }
    },
    [memory?.id]
  )

  const lastSavedContentRef = useRef<string>("")
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (memory) {
      lastSavedContentRef.current = memory.content ?? ""
    }
  }, [memory])

  const saveContentImmediate = useCallback(
    async (newContent: string): Promise<void> => {
      if (!memory || newContent === lastSavedContentRef.current) return
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
    [memory?.id, updateMemory]
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

  const saveSpace = async (newSpaceId: string | null): Promise<void> => {
    if (!memory || newSpaceId === memory.space_id) return
    setSpaceId(newSpaceId)
    try {
      await updateMemory.mutateAsync({
        id: memory.id,
        space_id: newSpaceId,
      })
    } catch (err) {
      console.error("Failed to update space:", err)
      setSpaceId(memory.space_id ?? null)
    }
  }

  const spaceName = useMemo(() => {
    if (!spaceId) return null
    const space = spaces.find((s) => s.id === spaceId)
    return space?.name ?? null
  }, [spaceId, spaces])

  const headerConfig = useMemo(() => {
    if (!memory) return null

    return {
      title: (
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <EditableTitle initialValue={memory.title ?? ""} onSave={saveTitle} />
          <Badge variant="outline" className="shrink-0">
            {memory.source}
          </Badge>
          {spaceName && (
            <Link to={`/spaces/${spaceId}`} className="shrink-0">
              <Badge variant="secondary" className="gap-0.5">
                <Folder className="h-2.5 w-2.5" />
                {spaceName}
              </Badge>
            </Link>
          )}
        </div>
      ),
      actions: (
        <Button
          variant={confirmDelete ? "destructive" : "secondary"}
          size="sm"
          className="h-6 gap-1 px-2 text-xs"
          onClick={() => {
            if (confirmDelete) {
              handleDelete()
            } else {
              setConfirmDelete(true)
            }
          }}
          onMouseLeave={() => setConfirmDelete(false)}
          loading={deleteMemory.isPending}
        >
          <Trash2 className="h-3 w-3" />
          {confirmDelete ? "Confirm" : "Delete"}
        </Button>
      ),
    }
  }, [
    memory,
    spaceName,
    spaceId,
    confirmDelete,
    deleteMemory.isPending,
    navigate,
  ])

  useLayoutHeader(headerConfig)

  if (isLoading) {
    return <PageLoading message="Loading memory..." />
  }

  if (error || !memory) {
    return (
      <ErrorDisplay
        error={error ?? new Error("Memory not found")}
        onRetry={refetch}
      />
    )
  }

  const createdAt = new Date(memory.created_at * 1000)
  const dateString = createdAt.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  })
  const timeString = createdAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="space-y-4">
      {memory.tags.length > 0 && (
        <section>
          <h3 className="mb-1.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <Tag className="h-2.5 w-2.5" />
            Tags
          </h3>
          <div className="flex flex-wrap gap-1">
            {memory.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {dateString}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeString}
        </span>
      </div>

      {updateMemory.error && (
        <p className="text-sm text-destructive">
          {updateMemory.error instanceof Error
            ? updateMemory.error.message
            : "Failed to update memory"}
        </p>
      )}

      {memory.summary && (
        <section>
          <h3 className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Summary
          </h3>
          <p className="text-xs text-foreground">{memory.summary}</p>
        </section>
      )}

      <section>
        <h3 className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Content
        </h3>
        {isEditingContent ? (
          <RichTextEditor
            value={content}
            onChange={handleContentChange}
            placeholder="Write something..."
            variant="borderless"
            showToolbar
            stickyToolbar
            onEscape={() => setIsEditingContent(false)}
            onBlur={handleContentBlur}
          />
        ) : (
          <div
            className="min-h-[100px] cursor-text"
            onClick={() => setIsEditingContent(true)}
          >
            {content ? (
              <MemoryContentViewer content={content} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Click to add content...
              </p>
            )}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Space
        </h3>
        <select
          value={spaceId ?? ""}
          onChange={(e) => saveSpace(e.target.value || null)}
          className="w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">No space</option>
          {spaces.map((space) => (
            <option key={space.id} value={space.id}>
              {space.icon && `${space.icon} `}
              {space.name}
            </option>
          ))}
        </select>
      </section>
    </div>
  )
}
