import { useMemo, useRef, useEffect, useCallback, useState } from "react"
import { Clock } from "lucide-react"
import { format } from "date-fns"
import {
  useOldestMemoryDate,
  useMemoriesByDate,
  useMemoryCountByDate,
} from "@/hooks"
import {
  PageLoading,
  LoadingSpinner,
} from "@/components/common/loading-spinner"
import { ErrorDisplay } from "@/components/common/error-display"
import { EmptyState } from "@/components/common/empty-state"
import { MemoryListItem } from "@/components/memory-list-item"
import { DateSlider } from "@/components/date-slider"
import { useLayoutHeader } from "@/components/layout/layout"
import type { Memory } from "@/lib/types"

export function HomePage(): React.ReactElement {
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  const { data: oldestDate } = useOldestMemoryDate()
  const { data: memoryCount } = useMemoryCountByDate(selectedDate)

  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMemoriesByDate(selectedDate)

  const headerConfig = useMemo(
    () => ({
      title: (
        <DateSlider
          value={selectedDate}
          onChange={setSelectedDate}
          minDate={oldestDate ?? undefined}
          maxDate={new Date()}
        />
      ),
    }),
    [selectedDate, oldestDate]
  )

  useLayoutHeader(headerConfig)

  const loadMoreRef = useRef<HTMLDivElement>(null)

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          handleLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [handleLoadMore])

  const memories = useMemo(() => {
    if (!data?.pages) return []
    return data.pages.flatMap((page) => page.memories)
  }, [data])

  if (isLoading) {
    return <PageLoading message="Loading memories..." />
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={refetch} />
  }

  if (memories.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No memories"
        description={`No memories found for ${format(selectedDate, "MMMM d, yyyy")}`}
      />
    )
  }

  return (
    <div>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-3 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <span className="text-xs text-muted-foreground">
          {format(selectedDate, "EEEE, MMMM d")}
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {memoryCount ?? 0} {memoryCount === 1 ? "memory" : "memories"}
        </span>
      </div>

      <div className="divide-y divide-border">
        {memories.map((memory: Memory) => (
          <MemoryListItem key={memory.id} memory={memory} />
        ))}

        <div ref={loadMoreRef} className="flex justify-center py-3">
          {isFetchingNextPage ? (
            <LoadingSpinner />
          ) : hasNextPage ? (
            <span className="text-[10px] text-muted-foreground">
              Scroll to load more
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
