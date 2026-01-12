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
          className="ml-1 rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
    <span className="group inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand-light px-2.5 py-1 text-[11px] text-brand-dark transition-all duration-150 hover:border-brand/30 hover:shadow-sm">
      <span className="text-brand">{icon}</span>
      <span className="font-medium">{label}</span>
      <button
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 text-brand/60 transition-colors hover:bg-brand/10 hover:text-brand"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}
