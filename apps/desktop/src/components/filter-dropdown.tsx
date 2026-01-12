import { useState } from "react"
import { SlidersHorizontal, Check } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { useTags } from "@/hooks"
import { DATE_RANGE_OPTIONS, type DateRange } from "@/hooks/use-memory-filters"
import { cn } from "@/lib/utils"

interface FilterDropdownProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  selectedTags: string[]
  onTagToggle: (tag: string) => void
  selectedSource: string | null
  onSourceChange: (source: string | null) => void
  availableSources?: string[]
  activeFilterCount?: number
}

export function FilterDropdown({
  dateRange,
  onDateRangeChange,
  selectedTags,
  onTagToggle,
  selectedSource,
  onSourceChange,
  availableSources = [],
  activeFilterCount = 0,
}: FilterDropdownProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const { data: tags } = useTags()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex h-8 items-center justify-center gap-1.5 rounded-md border bg-background px-2.5 text-xs shadow-xs transition-all",
          "hover:bg-accent hover:text-accent-foreground",
          "outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Filters</span>
        {activeFilterCount > 0 && (
          <Badge
            variant="secondary"
            className="ml-0.5 h-4 min-w-4 px-1 text-[10px]"
          >
            {activeFilterCount}
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="divide-y divide-border">
          <div className="p-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              Date Range
            </div>
            <div className="flex flex-wrap gap-1">
              {DATE_RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onDateRangeChange(option.value)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs transition-colors",
                    dateRange === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-accent"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {tags && tags.length > 0 && (
            <div className="p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Tags
              </div>
              <div className="max-h-32 overflow-y-auto">
                <div className="flex flex-wrap gap-1">
                  {tags.slice(0, 20).map((tag) => {
                    const isSelected = selectedTags.includes(tag.name)
                    return (
                      <button
                        key={tag.name}
                        onClick={() => onTagToggle(tag.name)}
                        className={cn(
                          "flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-accent"
                        )}
                      >
                        {isSelected && <Check className="h-2.5 w-2.5" />}
                        <span>{tag.name}</span>
                        <span className="text-[10px] opacity-60">
                          {tag.count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {availableSources.length > 0 && (
            <div className="p-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Source
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => onSourceChange(null)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs transition-colors",
                    selectedSource === null
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-accent"
                  )}
                >
                  All
                </button>
                {availableSources.map((source) => (
                  <button
                    key={source}
                    onClick={() => onSourceChange(source)}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs transition-colors",
                      selectedSource === source
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-accent"
                    )}
                  >
                    {source}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
