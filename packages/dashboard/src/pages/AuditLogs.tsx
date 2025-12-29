import { useState, useEffect } from "react"
import type { AuditLogEntry, AuditStatus } from "@athreei/shared"
import { api } from "../lib/api"
import { DataTable } from "../components/ui/DataTable"
import type { Column } from "../components/ui/DataTable"
import { SearchInput } from "../components/ui/SearchInput"
import { LegacyCard as Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog"
import { cn } from "@/lib/utils"

interface AuditLogsResponse {
  data: AuditLogEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [toolFilter, setToolFilter] = useState<string>("")
  const [originFilter, setOriginFilter] = useState<string>("")

  // Pagination state
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  // Fetch logs from API
  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)

      // Build query params
      const params = new URLSearchParams()
      params.set("page", page.toString())
      params.set("limit", pageSize.toString())
      if (statusFilter) params.set("status", statusFilter)
      if (toolFilter) params.set("tool", toolFilter)
      if (originFilter) params.set("origin", originFilter)

      const response = await api.get<AuditLogsResponse>(
        `/api/audit?${params.toString()}`
      )

      setLogs(response.data || [])
      setTotal(response.pagination?.total || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch audit logs")
    } finally {
      setLoading(false)
    }
  }

  // Fetch logs on mount and when filters/page change
  useEffect(() => {
    fetchLogs()
  }, [page, statusFilter, toolFilter, originFilter])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [statusFilter, toolFilter, originFilter])

  // Get unique tools for filter dropdown
  const uniqueTools = Array.from(new Set(logs.map((log) => log.tool)))

  // Define table columns
  const columns: Column<AuditLogEntry>[] = [
    {
      accessor: "timestamp",
      header: "Timestamp",
      cell: (value) => new Date(value as number).toLocaleString(),
    },
    {
      accessor: "tool",
      header: "Tool",
      cell: (value) => <code className="text-sm">{value as string}</code>,
    },
    {
      accessor: "origin",
      header: "Origin",
      cell: (value) => (
        <span className="text-muted-foreground">{(value as string) || "N/A"}</span>
      ),
    },
    {
      accessor: "status",
      header: "Status",
      cell: (value) => {
        const status = value as AuditStatus
        const variant =
          status === "success"
            ? "bg-success/10 text-success"
            : status === "denied"
              ? "bg-warning/10 text-warning"
              : "bg-error/10 text-error"
        return (
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
              variant
            )}
          >
            {status}
          </span>
        )
      },
    },
    {
      accessor: (row) => row.id,
      header: "Actions",
      sortable: false,
      cell: (_value, row) => (
        <Button variant="secondary" size="sm" onClick={() => setSelectedLog(row)}>
          Details
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Audit Logs</h2>
        <p className="text-muted-foreground">
          Track all AI tool invocations and their outcomes for transparency and
          accountability.
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <h3 className="text-base font-medium mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block mb-1.5 text-sm font-medium text-muted-foreground">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 bg-secondary border border-border rounded-md text-foreground"
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="denied">Denied</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div>
            <label className="block mb-1.5 text-sm font-medium text-muted-foreground">
              Tool
            </label>
            <select
              value={toolFilter}
              onChange={(e) => setToolFilter(e.target.value)}
              className="w-full p-2 bg-secondary border border-border rounded-md text-foreground"
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
            <label className="block mb-1.5 text-sm font-medium text-muted-foreground">
              Origin
            </label>
            <SearchInput
              value={originFilter}
              onChange={setOriginFilter}
              placeholder="Filter by origin..."
            />
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="mb-6">
          <div className="text-error text-center">{error}</div>
        </Card>
      )}

      {/* Logs Table */}
      <Card>
        <DataTable
          columns={columns}
          data={logs}
          loading={loading}
          emptyMessage="No audit logs available yet. Logs will appear here once AI tools are invoked through the extension."
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
        />
      </Card>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              Full details of the tool invocation
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">ID</label>
                  <p className="text-sm font-mono break-all">{selectedLog.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                  <p className="text-sm">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tool</label>
                  <p className="text-sm"><code>{selectedLog.tool}</code></p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className="text-sm">
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                        selectedLog.status === "success"
                          ? "bg-success/10 text-success"
                          : selectedLog.status === "denied"
                            ? "bg-warning/10 text-warning"
                            : "bg-error/10 text-error"
                      )}
                    >
                      {selectedLog.status}
                    </span>
                  </p>
                </div>
                {selectedLog.aiApp && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">AI App</label>
                    <p className="text-sm">{selectedLog.aiApp}</p>
                  </div>
                )}
                {selectedLog.origin && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Origin</label>
                    <p className="text-sm">{selectedLog.origin}</p>
                  </div>
                )}
              </div>

              {/* Arguments */}
              {selectedLog.args && Object.keys(selectedLog.args).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Arguments</label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.args, null, 2)}
                  </pre>
                </div>
              )}

              {/* Result */}
              {selectedLog.result !== undefined && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Result</label>
                  <pre className="mt-1 p-3 bg-muted rounded-md text-xs overflow-x-auto">
                    {JSON.stringify(selectedLog.result, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
