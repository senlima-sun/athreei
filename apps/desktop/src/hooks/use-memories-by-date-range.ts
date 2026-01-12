import { useInfiniteQuery } from "@tanstack/react-query"
import * as api from "@/lib/api"

const PAGE_SIZE = 20

export function useMemoriesByDateRange(
  startTimestamp: number,
  endTimestamp: number,
  spaceId?: string
) {
  return useInfiniteQuery({
    queryKey: [
      "memories",
      "by-date-range",
      { start: startTimestamp, end: endTimestamp, spaceId },
    ],
    queryFn: async ({ pageParam = 0 }) => {
      const memories = await api.listMemoriesByDate(
        startTimestamp,
        endTimestamp,
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
