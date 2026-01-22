"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Filter,
  Calendar,
  Clock,
  Server,
  ChevronDown,
  X,
  Download,
  Loader2,
} from "lucide-react"
import { fetchApi } from "@/lib/api"

export interface TraceFiltersState {
  search: string
  status: "all" | "success" | "error"
  startDate: string
  endDate: string
  minDuration: string
  maxDuration: string
  serverIds: string[]
}

interface McpServer {
  id: string
  name: string
}

interface TraceFiltersProps {
  filters: TraceFiltersState
  onFiltersChange: (filters: TraceFiltersState) => void
  organizationId: string
}

const DATE_PRESETS = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 days", value: "7days" },
  { label: "Last 30 days", value: "30days" },
  { label: "Custom", value: "custom" },
] as const

const DURATION_PRESETS = [
  { label: "All", min: "", max: "" },
  { label: "< 1s", min: "", max: "1000" },
  { label: "1-5s", min: "1000", max: "5000" },
  { label: "5-30s", min: "5000", max: "30000" },
  { label: "> 30s", min: "30000", max: "" },
] as const

function getDatePresetValue(preset: string): { startDate: string; endDate: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)

  switch (preset) {
    case "today":
      return {
        startDate: today.toISOString(),
        endDate: endOfToday.toISOString(),
      }
    case "yesterday": {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const endOfYesterday = new Date(today.getTime() - 1)
      return {
        startDate: yesterday.toISOString(),
        endDate: endOfYesterday.toISOString(),
      }
    }
    case "7days": {
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      return {
        startDate: sevenDaysAgo.toISOString(),
        endDate: endOfToday.toISOString(),
      }
    }
    case "30days": {
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      return {
        startDate: thirtyDaysAgo.toISOString(),
        endDate: endOfToday.toISOString(),
      }
    }
    default:
      return { startDate: "", endDate: "" }
  }
}

export function TraceFilters({
  filters,
  onFiltersChange,
  organizationId,
}: TraceFiltersProps) {
  const [servers, setServers] = useState<McpServer[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [datePreset, setDatePreset] = useState<string>("")
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (organizationId) {
      fetchApi<{ servers: McpServer[] }>(
        `/api/traces/servers?organizationId=${organizationId}`
      )
        .then((data) => setServers(data.servers || []))
        .catch(() => setServers([]))
    }
  }, [organizationId])

  const hasAdvancedFilters =
    filters.startDate ||
    filters.endDate ||
    filters.minDuration ||
    filters.maxDuration ||
    filters.serverIds.length > 0

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset)
    if (preset === "custom") {
      return
    }
    const { startDate, endDate } = getDatePresetValue(preset)
    onFiltersChange({ ...filters, startDate, endDate })
  }

  const clearAllFilters = () => {
    setDatePreset("")
    onFiltersChange({
      search: "",
      status: "all",
      startDate: "",
      endDate: "",
      minDuration: "",
      maxDuration: "",
      serverIds: [],
    })
  }

  const activeFilterCount = [
    filters.status !== "all",
    filters.startDate || filters.endDate,
    filters.minDuration || filters.maxDuration,
    filters.serverIds.length > 0,
  ].filter(Boolean).length

  const handleExport = async (format: "json" | "csv") => {
    if (!organizationId) return

    setIsExporting(true)
    try {
      const params = new URLSearchParams({ organizationId, format })

      if (filters.search) params.set("search", filters.search)
      if (filters.status !== "all") params.set("status", filters.status)
      if (filters.startDate) params.set("startDate", filters.startDate)
      if (filters.endDate) params.set("endDate", filters.endDate)
      if (filters.minDuration) params.set("minDuration", filters.minDuration)
      if (filters.maxDuration) params.set("maxDuration", filters.maxDuration)
      if (filters.serverIds.length > 0)
        params.set("serverIds", filters.serverIds.join(","))

      const response = await fetch(`/api/traces/export?${params.toString()}`)
      if (!response.ok) {
        throw new Error("Export failed")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `traces-${new Date().toISOString().split("T")[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("[trace-filters] Export failed", { error, format })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by tool name..."
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={filters.status}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                status: e.target.value as "all" | "success" | "error",
              })
            }
            className="appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
            showAdvanced || hasAdvancedFilters
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          Advanced
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {hasAdvancedFilters && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
            Clear all
          </button>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleExport("csv")}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            CSV
          </button>
          <button
            type="button"
            onClick={() => handleExport("json")}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            JSON
          </button>
        </div>
      </div>

      {showAdvanced && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-700">
                <Calendar className="h-3 w-3" />
                Date Range
              </label>
              <select
                value={datePreset}
                onChange={(e) => handleDatePresetChange(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All time</option>
                {DATE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
              {datePreset === "custom" && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="datetime-local"
                    value={filters.startDate ? filters.startDate.slice(0, 16) : ""}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        startDate: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : "",
                      })
                    }
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="datetime-local"
                    value={filters.endDate ? filters.endDate.slice(0, 16) : ""}
                    onChange={(e) =>
                      onFiltersChange({
                        ...filters,
                        endDate: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : "",
                      })
                    }
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-700">
                <Clock className="h-3 w-3" />
                Duration
              </label>
              <div className="flex flex-wrap gap-1">
                {DURATION_PRESETS.map((preset) => {
                  const isActive =
                    filters.minDuration === preset.min &&
                    filters.maxDuration === preset.max
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        onFiltersChange({
                          ...filters,
                          minDuration: preset.min,
                          maxDuration: preset.max,
                        })
                      }
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-blue-500 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {preset.label}
                    </button>
                  )
                })}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min (ms)"
                  value={filters.minDuration}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, minDuration: e.target.value })
                  }
                  className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-gray-500">to</span>
                <input
                  type="number"
                  placeholder="Max (ms)"
                  value={filters.maxDuration}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, maxDuration: e.target.value })
                  }
                  className="w-24 rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-700">
                <Server className="h-3 w-3" />
                Servers
              </label>
              {servers.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {servers.map((server) => {
                    const isSelected = filters.serverIds.includes(server.id)
                    return (
                      <button
                        key={server.id}
                        type="button"
                        onClick={() => {
                          const newServerIds = isSelected
                            ? filters.serverIds.filter((id) => id !== server.id)
                            : [...filters.serverIds, server.id]
                          onFiltersChange({ ...filters, serverIds: newServerIds })
                        }}
                        className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                          isSelected
                            ? "bg-blue-500 text-white"
                            : "bg-white text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {server.name}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No servers available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const defaultFilters: TraceFiltersState = {
  search: "",
  status: "all",
  startDate: "",
  endDate: "",
  minDuration: "",
  maxDuration: "",
  serverIds: [],
}
