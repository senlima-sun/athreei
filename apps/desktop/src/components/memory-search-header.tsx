import { SearchInput } from "./search-input"
import { FilterDropdown } from "./filter-dropdown"
import type { DateRange } from "@/hooks/use-memory-filters"

interface MemorySearchHeaderProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  onTagSelect: (tag: string) => void
  recentSearches: string[]
  onSelectRecent: (query: string) => void
  isSearching: boolean
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  selectedTags: string[]
  onTagToggle: (tag: string) => void
  selectedSource: string | null
  onSourceChange: (source: string | null) => void
  availableSources: string[]
  activeFilterCount: number
}

export function MemorySearchHeader({
  searchQuery,
  onSearchChange,
  onTagSelect,
  recentSearches,
  onSelectRecent,
  isSearching,
  dateRange,
  onDateRangeChange,
  selectedTags,
  onTagToggle,
  selectedSource,
  onSourceChange,
  availableSources,
  activeFilterCount,
}: MemorySearchHeaderProps): React.ReactElement {
  return (
    <div className="flex items-center gap-2">
      <SearchInput
        value={searchQuery}
        onChange={onSearchChange}
        onTagSelect={onTagSelect}
        recentSearches={recentSearches}
        onSelectRecent={onSelectRecent}
        isLoading={isSearching}
        className="flex-1"
      />
      <FilterDropdown
        dateRange={dateRange}
        onDateRangeChange={onDateRangeChange}
        selectedTags={selectedTags}
        onTagToggle={onTagToggle}
        selectedSource={selectedSource}
        onSourceChange={onSourceChange}
        availableSources={availableSources}
        activeFilterCount={activeFilterCount}
      />
    </div>
  )
}
