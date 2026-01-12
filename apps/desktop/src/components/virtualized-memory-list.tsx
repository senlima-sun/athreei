import { useRef, useMemo, useEffect, useCallback } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { startOfDay } from "date-fns"
import { MemoryListItem } from "./memory-list-item"
import { DateGroupHeader } from "./date-group-header"
import { LoadingSpinner } from "./common/loading-spinner"
import type { Memory } from "@/lib/types"

type VirtualItem =
  | { type: "date-header"; date: Date; key: string }
  | { type: "memory"; memory: Memory; key: string }

interface VirtualizedMemoryListProps {
  memories: Memory[]
  onLoadMore?: () => void
  hasMore?: boolean
  isLoading?: boolean
  showDateGroups?: boolean
}

function groupMemoriesByDate(memories: Memory[]): VirtualItem[] {
  const items: VirtualItem[] = []
  let currentDateKey: string | null = null

  for (const memory of memories) {
    const memoryDate = new Date(memory.created_at * 1000)
    const dayStart = startOfDay(memoryDate)
    const dateKey = dayStart.toISOString()

    if (dateKey !== currentDateKey) {
      currentDateKey = dateKey
      items.push({
        type: "date-header",
        date: dayStart,
        key: `header-${dateKey}`,
      })
    }

    items.push({
      type: "memory",
      memory,
      key: memory.id,
    })
  }

  return items
}

function flattenMemories(memories: Memory[]): VirtualItem[] {
  return memories.map((memory) => ({
    type: "memory" as const,
    memory,
    key: memory.id,
  }))
}

const DATE_HEADER_HEIGHT = 32
const MEMORY_ITEM_HEIGHT = 28

export function VirtualizedMemoryList({
  memories,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  showDateGroups = true,
}: VirtualizedMemoryListProps): React.ReactElement {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualItems = useMemo(
    () =>
      showDateGroups
        ? groupMemoriesByDate(memories)
        : flattenMemories(memories),
    [memories, showDateGroups]
  )

  const estimateSize = useCallback(
    (index: number) => {
      const item = virtualItems[index]
      if (!item) return MEMORY_ITEM_HEIGHT
      return item.type === "date-header"
        ? DATE_HEADER_HEIGHT
        : MEMORY_ITEM_HEIGHT
    },
    [virtualItems]
  )

  const virtualizer = useVirtualizer({
    count: virtualItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize,
    overscan: 10,
    getItemKey: (index) => virtualItems[index]?.key ?? index,
  })

  const items = virtualizer.getVirtualItems()

  useEffect(() => {
    const lastItem = items[items.length - 1]
    if (!lastItem) return

    const isNearEnd = lastItem.index >= virtualItems.length - 5
    if (isNearEnd && hasMore && !isLoading && onLoadMore) {
      onLoadMore()
    }
  }, [items, virtualItems.length, hasMore, isLoading, onLoadMore])

  if (virtualItems.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground" />
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {items.map((virtualItem) => {
          const item = virtualItems[virtualItem.index]
          if (!item) return null

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full"
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {item.type === "date-header" ? (
                <DateGroupHeader
                  date={item.date}
                  className="sticky top-0 z-10 flex items-center border-b border-border bg-background/95 px-3 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-background/60"
                />
              ) : (
                <MemoryListItem memory={item.memory} />
              )}
            </div>
          )
        })}
      </div>

      {isLoading && (
        <div className="flex justify-center py-3">
          <LoadingSpinner />
        </div>
      )}

      {!isLoading && hasMore && (
        <div className="py-3 text-center text-[10px] text-muted-foreground">
          Scroll to load more
        </div>
      )}
    </div>
  )
}
