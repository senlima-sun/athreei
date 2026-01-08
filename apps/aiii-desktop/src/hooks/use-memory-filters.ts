import { useState, useMemo, useCallback } from "react"
import type { Memory } from "@/lib/types"

export type DateRange = "today" | "yesterday" | "week" | "month" | "all"

export interface MemoryFilters {
  dateRange: DateRange
  source: string | null
  tags: string[]
}

const DEFAULT_FILTERS: MemoryFilters = {
  dateRange: "all",
  source: null,
  tags: [],
}

function getDateRangeStart(dateRange: DateRange): number | null {
  if (dateRange === "all") return null

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (dateRange) {
    case "today":
      return today.getTime() / 1000
    case "yesterday": {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      return yesterday.getTime() / 1000
    }
    case "week": {
      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return weekAgo.getTime() / 1000
    }
    case "month": {
      const monthAgo = new Date(today)
      monthAgo.setDate(monthAgo.getDate() - 30)
      return monthAgo.getTime() / 1000
    }
    default:
      return null
  }
}

function getDateRangeEnd(dateRange: DateRange): number | null {
  if (dateRange !== "yesterday") return null

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return today.getTime() / 1000
}

export function useMemoryFilters() {
  const [filters, setFilters] = useState<MemoryFilters>(DEFAULT_FILTERS)

  const filterMemories = useCallback(
    (memories: Memory[]): Memory[] => {
      return memories.filter((memory) => {
        // Date filter
        const rangeStart = getDateRangeStart(filters.dateRange)
        const rangeEnd = getDateRangeEnd(filters.dateRange)

        if (rangeStart !== null && memory.created_at < rangeStart) {
          return false
        }
        if (rangeEnd !== null && memory.created_at >= rangeEnd) {
          return false
        }

        // Source filter
        if (filters.source !== null && memory.source !== filters.source) {
          return false
        }

        // Tags filter (memory must have ALL selected tags)
        if (filters.tags.length > 0) {
          const hasAllTags = filters.tags.every((tag) =>
            memory.tags.includes(tag)
          )
          if (!hasAllTags) return false
        }

        return true
      })
    },
    [filters]
  )

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  const setDateRange = useCallback((dateRange: DateRange) => {
    setFilters((prev) => ({ ...prev, dateRange }))
  }, [])

  const setSource = useCallback((source: string | null) => {
    setFilters((prev) => ({ ...prev, source }))
  }, [])

  const setTags = useCallback((tags: string[]) => {
    setFilters((prev) => ({ ...prev, tags }))
  }, [])

  const toggleTag = useCallback((tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }))
  }, [])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.dateRange !== "all") count++
    if (filters.source !== null) count++
    count += filters.tags.length
    return count
  }, [filters])

  const hasActiveFilters = activeFilterCount > 0

  return {
    filters,
    setFilters,
    filterMemories,
    clearFilters,
    setDateRange,
    setSource,
    setTags,
    toggleTag,
    activeFilterCount,
    hasActiveFilters,
  }
}

export const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Last 7 days" },
  { value: "month", label: "Last 30 days" },
]
