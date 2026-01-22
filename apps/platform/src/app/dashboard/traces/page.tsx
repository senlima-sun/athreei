"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { z } from "zod"
import {
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/dashboard"
import {
  TraceFilters,
  type TraceFiltersState,
} from "@/components/traces/trace-filters"
import { useActiveOrganization } from "@/lib/auth-client"
import { Activity, CheckCircle, XCircle, Clock } from "lucide-react"
import type { Trace } from "@/types"
import { formatDuration, formatTime } from "@/utils"

const traceFiltersSchema = z.object({
  search: z.string().catch(""),
  status: z.enum(["all", "success", "error"]).catch("all"),
  startDate: z.string().catch(""),
  endDate: z.string().catch(""),
  minDuration: z.string().catch(""),
  maxDuration: z.string().catch(""),
  serverIds: z.array(z.string()).catch([]),
})

function parseFiltersFromUrl(searchParams: URLSearchParams): TraceFiltersState {
  return traceFiltersSchema.parse({
    search: searchParams.get("search"),
    status: searchParams.get("status"),
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
    minDuration: searchParams.get("minDuration"),
    maxDuration: searchParams.get("maxDuration"),
    serverIds: searchParams.get("serverIds")?.split(",").filter(Boolean),
  })
}

function serializeFiltersToUrl(filters: TraceFiltersState): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.search) params.set("search", filters.search)
  if (filters.status !== "all") params.set("status", filters.status)
  if (filters.startDate) params.set("startDate", filters.startDate)
  if (filters.endDate) params.set("endDate", filters.endDate)
  if (filters.minDuration) params.set("minDuration", filters.minDuration)
  if (filters.maxDuration) params.set("maxDuration", filters.maxDuration)
  if (filters.serverIds.length > 0)
    params.set("serverIds", filters.serverIds.join(","))

  return params
}

export default function TracesPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { data: activeOrg, isPending: isOrgPending } = useActiveOrganization()
  const [traces, setTraces] = useState<Trace[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<TraceFiltersState>(() =>
    parseFiltersFromUrl(searchParams)
  )

  useEffect(() => {
    const nextFilters = parseFiltersFromUrl(searchParams)
    setFilters((current) => {
      const areEqual =
        current.search === nextFilters.search &&
        current.status === nextFilters.status &&
        current.startDate === nextFilters.startDate &&
        current.endDate === nextFilters.endDate &&
        current.minDuration === nextFilters.minDuration &&
        current.maxDuration === nextFilters.maxDuration &&
        current.serverIds.join(",") === nextFilters.serverIds.join(",")
      return areEqual ? current : nextFilters
    })
  }, [searchParams])

  const updateUrl = useCallback(
    (newFilters: TraceFiltersState) => {
      const params = serializeFiltersToUrl(newFilters)
      const queryString = params.toString()
      const newUrl = queryString ? `${pathname}?${queryString}` : pathname
      router.replace(newUrl, { scroll: false })
    },
    [pathname, router]
  )

  const handleFiltersChange = useCallback(
    (newFilters: TraceFiltersState) => {
      setFilters(newFilters)
      updateUrl(newFilters)
    },
    [updateUrl]
  )

  useEffect(() => {
    if (isOrgPending || !activeOrg?.id) {
      setIsLoading(false)
      return
    }

    const fetchTraces = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          organizationId: activeOrg.id,
        })

        if (filters.search) params.set("search", filters.search)
        if (filters.status !== "all") params.set("status", filters.status)
        if (filters.startDate) params.set("startDate", filters.startDate)
        if (filters.endDate) params.set("endDate", filters.endDate)
        if (filters.minDuration) params.set("minDuration", filters.minDuration)
        if (filters.maxDuration) params.set("maxDuration", filters.maxDuration)
        if (filters.serverIds.length > 0)
          params.set("serverIds", filters.serverIds.join(","))

        const response = await fetch(`/api/traces?${params.toString()}`)
        if (!response.ok) {
          throw new Error("Failed to fetch traces")
        }
        const data = await response.json()
        setTraces(data.traces || [])
        setTotal(data.total || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load traces")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTraces()
  }, [activeOrg?.id, isOrgPending, filters])

  if (isOrgPending || isLoading) {
    return (
      <div>
        <PageHeader
          title="Traces"
          description="View tool calls and their results"
        />
        <LoadingState />
      </div>
    )
  }

  if (!activeOrg) {
    return (
      <div>
        <PageHeader
          title="Traces"
          description="View tool calls and their results"
        />
        <EmptyState
          icon={Activity}
          title="No organization selected"
          description="Select an organization to view its traces."
        />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Traces"
          description="View tool calls and their results"
        />
        <ErrorState message={error} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Traces"
        description="View tool calls and their results"
      />

      <TraceFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        organizationId={activeOrg.id}
      />

      {traces.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No traces found"
          description={
            filters.search ||
            filters.status !== "all" ||
            filters.startDate ||
            filters.endDate ||
            filters.minDuration ||
            filters.maxDuration ||
            filters.serverIds.length > 0
              ? "Try adjusting your filters to see more results."
              : "Traces will appear here when your AI apps make tool calls through athreei."
          }
        />
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-500">
            Showing {traces.length} of {total} traces
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Tool
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {traces.map((trace) => (
                  <tr key={trace.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3">
                      {trace.status === "success" ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/traces/${trace.id}`}
                        className="font-medium text-gray-900 hover:text-blue-600"
                      >
                        {trace.name}
                      </Link>
                      {trace.attributes?.serverName && (
                        <p className="text-xs text-gray-500">
                          {trace.attributes.serverName}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDuration(trace.durationMs)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {formatTime(trace.startTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
