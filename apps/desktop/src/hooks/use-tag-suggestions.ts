import { useMemo } from "react"
import { useTags } from "./use-memories"
import type { TagWithCount } from "@/lib/types"

export function useTagSuggestions(prefix: string): {
  suggestions: TagWithCount[]
  isLoading: boolean
} {
  const { data: tags, isLoading } = useTags()

  const suggestions = useMemo(() => {
    if (!tags || !prefix.trim()) return []

    const normalizedPrefix = prefix.toLowerCase().trim()
    return tags
      .filter((tag) => tag.name.toLowerCase().startsWith(normalizedPrefix))
      .slice(0, 5)
  }, [tags, prefix])

  return { suggestions, isLoading }
}
