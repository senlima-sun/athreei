"use client"

import { Search, Filter } from "lucide-react"

interface TraceFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  status: "all" | "success" | "error"
  onStatusChange: (value: "all" | "success" | "error") => void
}

export function TraceFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: TraceFiltersProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by tool name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="relative">
        <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <select
          value={status}
          onChange={(e) =>
            onStatusChange(e.target.value as "all" | "success" | "error")
          }
          className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    </div>
  )
}
