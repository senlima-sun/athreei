"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, X, Check, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { PluginCategory, PluginSortOption } from "@/types/marketplace"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface MarketplaceFiltersProps {
  categories?: PluginCategory[]
  selectedCategory: string | null
  onCategoryChange: (category: string | null) => void
  verifiedOnly: boolean
  onVerifiedChange: (verified: boolean) => void
  sort: PluginSortOption
  onSortChange: (sort: PluginSortOption) => void
  onClearFilters: () => void
  className?: string
}

const DEFAULT_CATEGORIES: PluginCategory[] = [
  { name: "Development Workflows", slug: "development-workflows", count: 0 },
  { name: "External Integrations", slug: "external-integrations", count: 0 },
  { name: "Code Intelligence", slug: "code-intelligence", count: 0 },
  { name: "Output Styles", slug: "output-styles", count: 0 },
  { name: "Utilities", slug: "utilities", count: 0 },
]

const SORT_OPTIONS: { value: PluginSortOption; label: string }[] = [
  { value: "popularity", label: "Most Popular" },
  { value: "recent", label: "Recently Added" },
  { value: "name", label: "Name (A-Z)" },
]

export function MarketplaceFilters({
  categories = DEFAULT_CATEGORIES,
  selectedCategory,
  onCategoryChange,
  verifiedOnly,
  onVerifiedChange,
  sort,
  onSortChange,
  onClearFilters,
  className,
}: MarketplaceFiltersProps) {
  const [categoriesExpanded, setCategoriesExpanded] = useState(true)

  const hasActiveFilters = selectedCategory !== null || verifiedOnly

  const displayCategories =
    categories.length > 0 ? categories : DEFAULT_CATEGORIES

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="xs"
            onClick={onClearFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-3 w-3" data-icon="inline-start" />
            Clear all
          </Button>
        )}
      </div>

      <div>
        <Select
          value={sort}
          onValueChange={(value) => {
            if (value) onSortChange(value as PluginSortOption)
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setCategoriesExpanded(!categoriesExpanded)}
          className="flex w-full items-center justify-between text-sm font-medium text-gray-900"
        >
          Categories
          {categoriesExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>
        {categoriesExpanded && (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => onCategoryChange(null)}
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
                selectedCategory === null
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <span>All categories</span>
              {selectedCategory === null && <Check className="h-4 w-4" />}
            </button>
            {displayCategories.map((category) => (
              <button
                key={category.slug}
                type="button"
                onClick={() => onCategoryChange(category.slug)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
                  selectedCategory === category.slug
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <span>{category.name}</span>
                <div className="flex items-center gap-2">
                  {category.count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {category.count}
                    </Badge>
                  )}
                  {selectedCategory === category.slug && (
                    <Check className="h-4 w-4" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <span className="text-sm font-medium text-gray-900">Quality</span>
        <button
          type="button"
          onClick={() => onVerifiedChange(!verifiedOnly)}
          className={cn(
            "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors",
            verifiedOnly
              ? "bg-primary/10 text-primary font-medium"
              : "text-gray-600 hover:bg-gray-100"
          )}
        >
          <span>Verified only</span>
          {verifiedOnly && <Check className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

export function MarketplaceFiltersMobile({
  categories = DEFAULT_CATEGORIES,
  selectedCategory,
  onCategoryChange,
  verifiedOnly,
  onVerifiedChange,
  sort,
  onSortChange,
  onClearFilters,
  className,
}: MarketplaceFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const hasActiveFilters = selectedCategory !== null || verifiedOnly
  const activeFilterCount = (selectedCategory ? 1 : 0) + (verifiedOnly ? 1 : 0)

  return (
    <div className={cn("lg:hidden", className)}>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1"
        >
          <Filter className="h-4 w-4" data-icon="inline-start" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="default" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        <Select
          value={sort}
          onValueChange={(value) => {
            if (value) onSortChange(value as PluginSortOption)
          }}
        >
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isOpen && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-900">Filters</span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="xs"
                onClick={onClearFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-3 w-3" data-icon="inline-start" />
                Clear all
              </Button>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">
                Category
              </span>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={selectedCategory === null ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => onCategoryChange(null)}
                >
                  All
                </Badge>
                {categories.map((category) => (
                  <Badge
                    key={category.slug}
                    variant={
                      selectedCategory === category.slug ? "default" : "outline"
                    }
                    className="cursor-pointer"
                    onClick={() => onCategoryChange(category.slug)}
                  >
                    {category.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-gray-700">Quality</span>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={verifiedOnly ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => onVerifiedChange(!verifiedOnly)}
                >
                  Verified only
                </Badge>
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="mt-4 w-full"
          >
            Apply filters
          </Button>
        </div>
      )}
    </div>
  )
}
