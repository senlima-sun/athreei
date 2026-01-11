import { useInfiniteQuery } from "@tanstack/react-query"
import * as api from "@/lib/api"

const PAGE_SIZE = 20

export function useInfiniteMemories(spaceId?: string) {
  return useInfiniteQuery({
    queryKey: ["memories", "infinite", { spaceId }],
    queryFn: async ({ pageParam = 0 }) => {
      const memories = await api.listMemories(spaceId, PAGE_SIZE, pageParam)
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
