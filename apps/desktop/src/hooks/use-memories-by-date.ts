import { useQuery, useInfiniteQuery } from "@tanstack/react-query"
import { startOfDay, endOfDay } from "date-fns"
import * as api from "@/lib/api"

const PAGE_SIZE = 20

function getDateRange(date: Date): { start: number; end: number } {
  return {
    start: Math.floor(startOfDay(date).getTime() / 1000),
    end: Math.floor(endOfDay(date).getTime() / 1000),
  }
}

export function useOldestMemoryDate(spaceId?: string) {
  return useQuery({
    queryKey: ["memories", "oldest-date", { spaceId }],
    queryFn: async () => {
      const timestamp = await api.getOldestMemoryDate(spaceId)
      return timestamp ? new Date(timestamp * 1000) : null
    },
    staleTime: 60000,
  })
}

export function useMemoriesByDate(date: Date, spaceId?: string) {
  const { start, end } = getDateRange(date)

  return useInfiniteQuery({
    queryKey: ["memories", "by-date", { date: start, spaceId }],
    queryFn: async ({ pageParam = 0 }) => {
      const memories = await api.listMemoriesByDate(
        start,
        end,
        spaceId,
        PAGE_SIZE,
        pageParam
      )
      return {
        memories,
        nextOffset:
          memories.length === PAGE_SIZE ? pageParam + PAGE_SIZE : undefined,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    initialPageParam: 0,
    refetchInterval: 10000,
  })
}

export function useMemoryCountByDate(date: Date, spaceId?: string) {
  const { start, end } = getDateRange(date)

  return useQuery({
    queryKey: ["memories", "count-by-date", { date: start, spaceId }],
    queryFn: () => api.countMemoriesByDate(start, end, spaceId),
    staleTime: 5000,
  })
}
