"use client"

import { useState, useEffect } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useDebounce } from "@/hooks/use-debounce"
import { cn } from "@/lib/utils"

interface MarketplaceSearchProps {
  value: string
  onChange: (value: string) => void
  resultCount?: number
  isLoading?: boolean
  className?: string
}

export function MarketplaceSearch({
  value,
  onChange,
  resultCount,
  isLoading = false,
  className,
}: MarketplaceSearchProps) {
  const [localValue, setLocalValue] = useState(value)
  const debouncedValue = useDebounce(localValue, 300)

  useEffect(() => {
    onChange(debouncedValue)
  }, [debouncedValue, onChange])

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleClear = () => {
    setLocalValue("")
    onChange("")
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder="Search plugins by name or description..."
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          className="h-10 pl-10 pr-10"
        />
        {localValue && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {resultCount !== undefined && !isLoading && (
        <p className="text-sm text-gray-500">
          {resultCount === 0
            ? "No plugins found"
            : `${resultCount} plugin${resultCount === 1 ? "" : "s"} found`}
        </p>
      )}
      {isLoading && <p className="text-sm text-gray-500">Searching...</p>}
    </div>
  )
}
