"use client"

import { useState, useEffect, useCallback } from "react"
import {
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/dashboard"
import { useActiveOrganizationSafe } from "@/lib/auth-client"
import { fetchApi } from "@/lib/api"
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"
import type { AuditLogEntry, AuditLogsResponse, AuditStatus } from "@/types"

export default function LogsPage() {
  const { data: org, isPending: isOrgPending } = useActiveOrganizationSafe()
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)

  const [statusFilter, setStatusFilter] = useState<string>("")
  const [toolFilter, setToolFilter] = useState<string>("")
  const [originFilter, setOriginFilter] = useState<string>("")

  // Pagination state
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const pageSize = 20

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.set("page", page.toString())
      params.set("limit", pageSize.toString())
      if (statusFilter) params.set("status", statusFilter)
      if (toolFilter) params.set("tool", toolFilter)
      if (originFilter) params.set("origin", originFilter)

      const response = await fetchApi<AuditLogsResponse>(
        `/api/audit?${params.toString()}`,
        { organizationId: org?.id }
      )

      setLogs(response.data || [])
      setTotal(response.pagination?.total || 0)
      setTotalPages(response.pagination?.totalPages || 0)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch audit logs"
      )
    } finally {
      setIsLoading(false)
    }
  }, [org?.id, page, statusFilter, toolFilter, originFilter])

  useEffect(() => {
    if (isOrgPending) return
    fetchLogs()
  }, [fetchLogs, isOrgPending])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, toolFilter, originFilter])

  const uniqueTools = Array.from(new Set(logs.map((log) => log.tool)))

  const getStatusBadge = (status: AuditStatus) => {
    const styles = {
      success: "bg-green-100 text-green-800",
      denied: "bg-yellow-100 text-yellow-800",
      error: "bg-red-100 text-red-800",
    }
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
      >
        {status}
      </span>
    )
  }

  if (isOrgPending || isLoading) {
    return (
      <div>
        <PageHeader
          title="Audit Logs"
          description="Track all AI tool invocations and their outcomes for transparency and accountability."
        />
        <LoadingState />
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Audit Logs"
          description="Track all AI tool invocations and their outcomes for transparency and accountability."
        />
        <ErrorState message={error} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Track all AI tool invocations and their outcomes for transparency and accountability."
      />

      {/* Filters */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-4 text-base font-medium text-gray-900">Filters</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="denied">Denied</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600">
              Tool
            </label>
            <select
              value={toolFilter}
              onChange={(e) => setToolFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Tools</option>
              {uniqueTools.map((tool) => (
                <option key={tool} value={tool}>
                  {tool}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-600">
              Origin
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={originFilter}
                onChange={(e) => setOriginFilter(e.target.value)}
                placeholder="Filter by origin..."
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {logs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No audit logs yet"
          description="Logs will appear here once AI tools are invoked through the gateway."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tool
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Origin
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-gray-100 px-1 text-sm">
                      {log.tool}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {log.origin || "N/A"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {getStatusBadge(log.status)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
              <div className="text-sm text-gray-500">
                Showing {(page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, total)} of {total} results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Audit Log Details
                </h2>
                <p className="text-sm text-gray-500">
                  Full details of the tool invocation
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    ID
                  </label>
                  <p className="mt-1 break-all font-mono text-sm">
                    {selectedLog.id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Timestamp
                  </label>
                  <p className="mt-1 text-sm">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Tool
                  </label>
                  <p className="mt-1 text-sm">
                    <code className="rounded bg-gray-100 px-1">
                      {selectedLog.tool}
                    </code>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Status
                  </label>
                  <p className="mt-1">{getStatusBadge(selectedLog.status)}</p>
                </div>
                {selectedLog.aiApp && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      AI App
                    </label>
                    <p className="mt-1 text-sm">{selectedLog.aiApp}</p>
                  </div>
                )}
                {selectedLog.origin && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Origin
                    </label>
                    <p className="mt-1 text-sm">{selectedLog.origin}</p>
                  </div>
                )}
              </div>

              {/* Arguments */}
              {selectedLog.args &&
                Object.keys(selectedLog.args).length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Arguments
                    </label>
                    <pre className="mt-1 overflow-x-auto rounded-md bg-gray-100 p-3 text-xs">
                      {JSON.stringify(selectedLog.args, null, 2)}
                    </pre>
                  </div>
                )}

              {/* Result */}
              {selectedLog.result !== undefined && (
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Result
                  </label>
                  <pre className="mt-1 overflow-x-auto rounded-md bg-gray-100 p-3 text-xs">
                    {JSON.stringify(selectedLog.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
