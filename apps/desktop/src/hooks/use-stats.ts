import { useMemo } from "react"
import { useMemories, useMemoryCount, useSpaces } from "@/hooks"
import { aggregateMemoriesByDay } from "@/components/activity-chart"
import type { Memory, Space } from "@/lib/types"

interface Stats {
  totalMemories: number
  memoriesToday: number
  memoriesThisWeek: number
  mostActiveSpace: Space | null
}

interface UseStatsResult {
  stats: Stats
  weeklyData: ReturnType<typeof aggregateMemoriesByDay>
  isLoading: boolean
  error: Error | null
}

/**
 * Get the start of today as a Unix timestamp (seconds)
 */
function getTodayStart(): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.floor(now.getTime() / 1000)
}

/**
 * Get the start of the week (7 days ago) as a Unix timestamp (seconds)
 */
function getWeekStart(): number {
  const now = new Date()
  now.setDate(now.getDate() - 6)
  now.setHours(0, 0, 0, 0)
  return Math.floor(now.getTime() / 1000)
}

/**
 * Find the most active space from a list of memories
 */
function findMostActiveSpace(
  memories: Memory[],
  spaces: Space[]
): Space | null {
  if (memories.length === 0 || spaces.length === 0) return null

  // Count memories per space
  const spaceCounts = new Map<string, number>()
  for (const memory of memories) {
    if (memory.space_id) {
      const count = spaceCounts.get(memory.space_id) ?? 0
      spaceCounts.set(memory.space_id, count + 1)
    }
  }

  if (spaceCounts.size === 0) return null

  // Find the space with most memories
  let maxSpaceId = ""
  let maxCount = 0
  for (const [spaceId, count] of spaceCounts) {
    if (count > maxCount) {
      maxCount = count
      maxSpaceId = spaceId
    }
  }

  return spaces.find((s) => s.id === maxSpaceId) ?? null
}

/**
 * Hook to compute activity statistics from existing memory data
 */
export function useStats(): UseStatsResult {
  const { data: totalCount = 0, isLoading: isLoadingCount } = useMemoryCount()
  const { data: memories = [], isLoading: isLoadingMemories } = useMemories(
    undefined,
    500
  )
  const { data: spaces = [], isLoading: isLoadingSpaces } = useSpaces()

  const todayStart = useMemo(() => getTodayStart(), [])
  const weekStart = useMemo(() => getWeekStart(), [])

  const memoriesToday = useMemo(
    () => memories.filter((m) => m.created_at >= todayStart).length,
    [memories, todayStart]
  )

  const memoriesThisWeek = useMemo(
    () => memories.filter((m) => m.created_at >= weekStart).length,
    [memories, weekStart]
  )

  const mostActiveSpace = useMemo(
    () => findMostActiveSpace(memories, spaces),
    [memories, spaces]
  )

  const weeklyData = useMemo(
    () => aggregateMemoriesByDay(memories.map((m) => m.created_at)),
    [memories]
  )

  const isLoading = isLoadingCount || isLoadingMemories || isLoadingSpaces

  return {
    stats: {
      totalMemories: totalCount,
      memoriesToday,
      memoriesThisWeek,
      mostActiveSpace,
    },
    weeklyData,
    isLoading,
    error: null,
  }
}
