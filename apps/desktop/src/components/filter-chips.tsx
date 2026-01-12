import { X, Calendar, Tag, Globe } from "lucide-react"
import { DATE_RANGE_OPTIONS, type DateRange } from "@/hooks/use-memory-filters"
import { cn } from "@/lib/utils"

interface FilterChipsProps {
  dateRange: DateRange
  onRemoveDateRange: () => void
  selectedTags: string[]
  onRemoveTag: (tag: string) => void
  selectedSource: string | null
  onRemoveSource: () => void
  onClearAll?: () => void
  className?: string
}

function getDateRangeLabel(range: DateRange): string {
  return DATE_RANGE_OPTIONS.find((opt) => opt.value === range)?.label ?? range
}

export function FilterChips({
  dateRange,
  onRemoveDateRange,
  selectedTags,
  onRemoveTag,
  selectedSource,
  onRemoveSource,
  onClearAll,
  className,
}: FilterChipsProps): React.ReactElement | null {
  const hasDateFilter = dateRange !== "all"
  const hasTagFilter = selectedTags.length > 0
  const hasSourceFilter = selectedSource !== null
  const hasAnyFilter = hasDateFilter || hasTagFilter || hasSourceFilter
  const chipCount =
    (hasDateFilter ? 1 : 0) + selectedTags.length + (hasSourceFilter ? 1 : 0)

  if (!hasAnyFilter) return null

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {hasDateFilter && (
        <FilterChip
          icon={<Calendar className="h-2.5 w-2.5" />}
          label={getDateRangeLabel(dateRange)}
          onRemove={onRemoveDateRange}
        />
      )}

      {selectedTags.map((tag) => (
        <FilterChip
          key={tag}
          icon={<Tag className="h-2.5 w-2.5" />}
          label={tag}
          onRemove={() => onRemoveTag(tag)}
        />
      ))}

      {hasSourceFilter && (
        <FilterChip
          icon={<Globe className="h-2.5 w-2.5" />}
          label={selectedSource}
          onRemove={onRemoveSource}
        />
      )}

      {chipCount > 1 && onClearAll && (
        <button
          onClick={onClearAll}
          className="text-[10px] text-muted-foreground hover:text-foreground"
        >
          Clear all
        </button>
      )}
    </div>
  )
}

interface FilterChipProps {
  icon: React.ReactNode
  label: string
  onRemove: () => void
}

function FilterChip({
  icon,
  label,
  onRemove,
}: FilterChipProps): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px]">
      {icon}
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-accent"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  )
}
