"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/dashboard/page-header"
import { TraceFilters } from "@/components/traces/trace-filters"
import { useActiveOrganization } from "@/lib/auth-client"
import { Activity, Loader2, CheckCircle, XCircle, Clock } from "lucide-react"

interface Trace {
  id: string
  traceId: string
  name: string
  status: "success" | "error"
  statusMessage?: string
  durationMs?: number
  startTime: string
  endTime?: string
  attributes?: {
    toolName?: string
    serverName?: string
    aggregatedToolName?: string
  }
}

function formatDuration(ms?: number): string {
  if (!ms) return "-"
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

export default function TracesPage() {
  const { data: activeOrg, isPending: isOrgPending } = useActiveOrganization()
  const [traces, setTraces] = useState<Trace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">(
    "all"
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
        if (search) {
          params.set("search", search)
        }
        if (statusFilter !== "all") {
          params.set("status", statusFilter)
        }
        const response = await fetch(`/api/traces?${params.toString()}`)
        if (!response.ok) {
          throw new Error("Failed to fetch traces")
        }
        const data = await response.json()
        setTraces(data.traces || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load traces")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTraces()
  }, [activeOrg?.id, isOrgPending, search, statusFilter])

  if (isOrgPending || isLoading) {
    return (
      <div>
        <PageHeader
          title="Traces"
          description="View tool calls and their results"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
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
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <Activity className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No organization selected
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Select an organization to view its traces.
          </p>
        </div>
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
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
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
        search={search}
        onSearchChange={setSearch}
        status={statusFilter}
        onStatusChange={setStatusFilter}
      />

      {traces.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <Activity className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No traces yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Traces will appear here when your AI apps make tool calls through
            athreei.
          </p>
        </div>
      ) : (
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
      )}
    </div>
  )
}
