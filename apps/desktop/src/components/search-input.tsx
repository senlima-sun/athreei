import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
} from "react"
import { Search, X, Clock, Tag, Loader2 } from "lucide-react"
import { useTagSuggestions } from "@/hooks/use-tag-suggestions"
import { cn } from "@/lib/utils"

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onTagSelect?: (tag: string) => void
  recentSearches?: string[]
  onSelectRecent?: (query: string) => void
  isLoading?: boolean
  placeholder?: string
  className?: string
}

interface AutocompleteItem {
  type: "recent" | "tag"
  value: string
  count?: number
}

export function SearchInput({
  value,
  onChange,
  onTagSelect,
  recentSearches = [],
  onSelectRecent,
  isLoading = false,
  placeholder = "Search memories...",
  className,
}: SearchInputProps): React.ReactElement {
  const [isFocused, setIsFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { suggestions: tagSuggestions } = useTagSuggestions(value)

  const autocompleteItems: AutocompleteItem[] = []

  if (!value.trim() && recentSearches.length > 0) {
    recentSearches.slice(0, 5).forEach((query) => {
      autocompleteItems.push({ type: "recent", value: query })
    })
  }

  if (value.trim()) {
    tagSuggestions.forEach((tag) => {
      autocompleteItems.push({ type: "tag", value: tag.name, count: tag.count })
    })
  }

  const showDropdown = isFocused && autocompleteItems.length > 0

  useEffect(() => {
    setSelectedIndex(-1)
  }, [value, isFocused])

  const handleSelect = useCallback(
    (item: AutocompleteItem) => {
      if (item.type === "recent") {
        onChange(item.value)
        onSelectRecent?.(item.value)
      } else if (item.type === "tag") {
        onTagSelect?.(item.value)
        onChange("")
      }
      inputRef.current?.blur()
    },
    [onChange, onSelectRecent, onTagSelect]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown) {
        if (e.key === "Escape" && value) {
          e.preventDefault()
          onChange("")
        }
        return
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < autocompleteItems.length - 1 ? prev + 1 : prev
          )
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
          break
        case "Enter":
          e.preventDefault()
          if (selectedIndex >= 0 && autocompleteItems[selectedIndex]) {
            handleSelect(autocompleteItems[selectedIndex])
          }
          break
        case "Escape":
          e.preventDefault()
          inputRef.current?.blur()
          break
      }
    },
    [
      showDropdown,
      selectedIndex,
      autocompleteItems,
      handleSelect,
      onChange,
      value,
    ]
  )

  const handleClear = useCallback(() => {
    onChange("")
    inputRef.current?.focus()
  }, [onChange])

  return (
    <div className={cn("relative", className)}>
      <div className="relative flex items-center">
        <Search className="absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setTimeout(() => setIsFocused(false), 150)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-8 w-full rounded-md border border-input bg-background pl-7 pr-7 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {isLoading ? (
          <Loader2 className="absolute right-2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : value ? (
          <button
            onClick={handleClear}
            className="absolute right-2 rounded-sm p-0.5 hover:bg-accent"
            aria-label="Clear search"
          >
            <X className="h-3 w-3 text-muted-foreground" />
          </button>
        ) : null}
      </div>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-md"
        >
          {!value.trim() && recentSearches.length > 0 && (
            <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground">
              Recent
            </div>
          )}
          {value.trim() && tagSuggestions.length > 0 && (
            <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground">
              Tags
            </div>
          )}
          {autocompleteItems.map((item, index) => (
            <button
              key={`${item.type}-${item.value}`}
              className={cn(
                "flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs transition-colors",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
              onMouseDown={(e) => {
                e.preventDefault()
                handleSelect(item)
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              {item.type === "recent" ? (
                <Clock className="h-3 w-3 shrink-0 text-muted-foreground" />
              ) : (
                <Tag className="h-3 w-3 shrink-0 text-muted-foreground" />
              )}
              <span className="flex-1 truncate">{item.value}</span>
              {item.type === "tag" && item.count !== undefined && (
                <span className="text-[10px] text-muted-foreground">
                  {item.count}
                </span>
              )}
            </button>
          ))}
          {value.trim() && (
            <div className="border-t border-border px-2 py-1.5 text-[10px] text-muted-foreground">
              Press Enter to search
            </div>
          )}
        </div>
      )}
    </div>
  )
}
