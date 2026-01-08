"use client"

import { useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { cn } from "../lib/utils"

export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  debounceMs?: number
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  debounceMs = 300,
  className,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value)
  const timeoutRef = useRef<number | null>(null)

  // Sync local value when external value changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounced onChange
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = window.setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue)
      }
    }, debounceMs)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [localValue, debounceMs, onChange, value])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.currentTarget.value)
  }

  const handleClear = () => {
    setLocalValue("")
    onChange("")
  }

  return (
    <div className={cn("relative inline-flex items-center w-full", className)}>
      {/* Search icon */}
      <span className="absolute left-3 text-muted-foreground pointer-events-none">
        <Search className="h-4 w-4" />
      </span>

      <input
        type="text"
        value={localValue}
        onChange={handleInput}
        placeholder={placeholder}
        className={cn(
          "w-full py-2 px-9 bg-secondary border border-border rounded-md",
          "text-foreground text-sm outline-none transition-colors",
          "focus:border-primary focus:ring-1 focus:ring-primary"
        )}
      />

      {/* Clear button */}
      {localValue && (
        <button
          onClick={handleClear}
          className={cn(
            "absolute right-2 bg-transparent border-none text-muted-foreground",
            "cursor-pointer p-1 flex items-center justify-center rounded",
            "hover:text-foreground transition-colors"
          )}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
