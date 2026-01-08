import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Calendar,
  Tag,
  Globe,
  X,
  ChevronDown,
  Check,
  Filter,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type MemoryFilters as MemoryFiltersType,
  type DateRange,
  DATE_RANGE_OPTIONS,
} from "@/hooks/use-memory-filters"
import type { Memory, TagWithCount } from "@/lib/types"

interface MemoryFiltersProps {
  filters: MemoryFiltersType
  memories: Memory[]
  tags: TagWithCount[]
  onDateRangeChange: (dateRange: DateRange) => void
  onSourceChange: (source: string | null) => void
  onTagToggle: (tag: string) => void
  onClearAll: () => void
  activeFilterCount: number
}

export function MemoryFilters({
  filters,
  memories,
  tags,
  onDateRangeChange,
  onSourceChange,
  onTagToggle,
  onClearAll,
  activeFilterCount,
}: MemoryFiltersProps): React.ReactElement {
  // Extract unique sources from memories
  const sources = useMemo(() => {
    const sourceSet = new Set(memories.map((m) => m.source))
    return Array.from(sourceSet).sort()
  }, [memories])

  return (
    <div className="space-y-3">
      {/* Filter header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filters</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onClearAll}
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Date filter */}
        <FilterDropdown
          icon={Calendar}
          label="Date"
          value={
            DATE_RANGE_OPTIONS.find((o) => o.value === filters.dateRange)
              ?.label ?? "All time"
          }
          isActive={filters.dateRange !== "all"}
        >
          <div className="min-w-[140px] p-1">
            {DATE_RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                  filters.dateRange === option.value && "bg-accent"
                )}
                onClick={() => onDateRangeChange(option.value)}
              >
                {filters.dateRange === option.value && (
                  <Check className="h-3 w-3" />
                )}
                <span
                  className={cn(filters.dateRange !== option.value && "ml-5")}
                >
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        </FilterDropdown>

        {/* Source filter */}
        <FilterDropdown
          icon={Globe}
          label="Source"
          value={filters.source ?? "All"}
          isActive={filters.source !== null}
        >
          <div className="min-w-[140px] p-1">
            <button
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                filters.source === null && "bg-accent"
              )}
              onClick={() => onSourceChange(null)}
            >
              {filters.source === null && <Check className="h-3 w-3" />}
              <span className={cn(filters.source !== null && "ml-5")}>
                All sources
              </span>
            </button>
            {sources.map((source) => (
              <button
                key={source}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                  filters.source === source && "bg-accent"
                )}
                onClick={() => onSourceChange(source)}
              >
                {filters.source === source && <Check className="h-3 w-3" />}
                <span className={cn(filters.source !== source && "ml-5")}>
                  {source}
                </span>
              </button>
            ))}
          </div>
        </FilterDropdown>

        {/* Tags filter */}
        <FilterDropdown
          icon={Tag}
          label="Tags"
          value={
            filters.tags.length > 0 ? `${filters.tags.length} selected` : "All"
          }
          isActive={filters.tags.length > 0}
        >
          <div className="max-h-[200px] min-w-[160px] overflow-y-auto p-1">
            {tags.length === 0 ? (
              <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                No tags found
              </div>
            ) : (
              tags.map((tag) => (
                <button
                  key={tag.name}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                    filters.tags.includes(tag.name) && "bg-accent"
                  )}
                  onClick={() => onTagToggle(tag.name)}
                >
                  {filters.tags.includes(tag.name) ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <span className="h-3 w-3" />
                  )}
                  <span className="flex-1 text-left">{tag.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {tag.count}
                  </span>
                </button>
              ))
            )}
          </div>
        </FilterDropdown>
      </div>

      {/* Active filters badges */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {filters.dateRange !== "all" && (
            <ActiveFilterBadge
              label={
                DATE_RANGE_OPTIONS.find((o) => o.value === filters.dateRange)
                  ?.label ?? filters.dateRange
              }
              onRemove={() => onDateRangeChange("all")}
            />
          )}
          {filters.source !== null && (
            <ActiveFilterBadge
              label={filters.source}
              onRemove={() => onSourceChange(null)}
            />
          )}
          {filters.tags.map((tag) => (
            <ActiveFilterBadge
              key={tag}
              label={tag}
              onRemove={() => onTagToggle(tag)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface FilterDropdownProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  isActive: boolean
  children: React.ReactNode
}

function FilterDropdown({
  icon: Icon,
  label,
  value,
  isActive,
  children,
}: FilterDropdownProps): React.ReactElement {
  return (
    <div className="group relative">
      <Button
        variant="outline"
        size="sm"
        className={cn(
          "h-8 gap-1.5 text-xs",
          isActive && "border-primary/50 bg-primary/5"
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{label}:</span>
        <span className="max-w-[80px] truncate font-medium">{value}</span>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </Button>
      <div className="invisible absolute left-0 top-full z-50 mt-1 rounded-md border bg-popover shadow-md opacity-0 transition-all group-hover:visible group-hover:opacity-100">
        {children}
      </div>
    </div>
  )
}

interface ActiveFilterBadgeProps {
  label: string
  onRemove: () => void
}

function ActiveFilterBadge({
  label,
  onRemove,
}: ActiveFilterBadgeProps): React.ReactElement {
  return (
    <Badge
      variant="secondary"
      className="cursor-pointer gap-1 pr-1 text-xs hover:bg-secondary/80"
      onClick={onRemove}
    >
      {label}
      <X className="h-3 w-3" />
    </Badge>
  )
}
