import { h } from "preact"
import { useState, useEffect } from "preact/hooks"
import type { AuditLogEntry, AuditStatus } from "@athreei/shared"
import { api } from "../lib/api"
import { DataTable, Column } from "../components/ui/DataTable"
import { SearchInput } from "../components/ui/SearchInput"
import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"

interface AuditLogsResponse {
  logs: AuditLogEntry[]
  total: number
  page: number
  pageSize: number
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      params.set("pageSize", pageSize.toString())
      if (statusFilter) params.set("status", statusFilter)
      if (toolFilter) params.set("tool", toolFilter)
      if (originFilter) params.set("origin", originFilter)

      const response = await api.get<AuditLogsResponse>(
        `/api/audit?${params.toString()}`
      )

      setLogs(response.logs)
      setTotal(response.total)
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
      cell: (value) => new Date(value).toLocaleString(),
    },
    {
      accessor: "tool",
      header: "Tool",
      cell: (value) => <code>{value}</code>,
    },
    {
      accessor: "origin",
      header: "Origin",
      cell: (value) => <span className="text-muted">{value || "N/A"}</span>,
    },
    {
      accessor: "status",
      header: "Status",
      cell: (value: AuditStatus) => {
        const variant =
          value === "success"
            ? "success"
            : value === "denied"
              ? "warning"
              : "error"
        return (
          <span className={`badge badge-${variant}`}>
            {value}
          </span>
        )
      },
    },
    {
      accessor: (row) => row.id,
      header: "Actions",
      sortable: false,
      cell: (_, row) => (
        <Button variant="secondary" size="sm">
          Details
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: "var(--spacing-xl)" }}>
        <h2>Audit Logs</h2>
        <p className="text-muted">
          Track all AI tool invocations and their outcomes for transparency and
          accountability.
        </p>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: "var(--spacing-lg)" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "var(--spacing-md)" }}>
          Filters
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "var(--spacing-md)",
          }}
        >
          <div className="form-group">
            <label>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.currentTarget.value)}
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="denied">Denied</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div className="form-group">
            <label>Tool</label>
            <select
              value={toolFilter}
              onChange={(e) => setToolFilter(e.currentTarget.value)}
            >
              <option value="">All Tools</option>
              {uniqueTools.map((tool) => (
                <option key={tool} value={tool}>
                  {tool}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Origin</label>
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
        <Card style={{ marginBottom: "var(--spacing-lg)" }}>
          <div style={{ color: "var(--error)", textAlign: "center" }}>
            {error}
          </div>
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
    </div>
  )
}
