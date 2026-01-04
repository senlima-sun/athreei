import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../lib/api"
import { DataTable } from "../components/ui/DataTable"
import type { Column } from "../components/ui/DataTable"
import { LegacyCard as Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { cn } from "@/lib/utils"

/**
 * Trace entry from the API
 * Contains both metadata (unencrypted) and encrypted payload
 */
export interface TraceEntry {
  id: string
  traceId: string
  /** Tool name (e.g., browser__screenshot) */
  toolName: string
  /** MCP server name */
  serverName: string
  /** Endpoint ID this trace belongs to */
  endpointId?: string
  /** Status: success or error */
  status: "success" | "error"
  /** Duration in milliseconds */
  durationMs: number
  /** Start timestamp */
  startTime: number
  /** End timestamp */
  endTime?: number
  /**
   * Encrypted request/response payload (base64-encoded JSON)
   * Contains: { nonce, ciphertext, keyVersion, algorithm }
   */
  encryptedPayload?: string
  /** Key version used for encryption (also embedded in encryptedPayload) */
  keyVersion?: number
  /** Error message if status is error */
  errorMessage?: string
}

interface TracesResponse {
  data: TraceEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface FilterOptions {
  endpoints: string[]
  servers: string[]
  tools: string[]
}

export function Traces() {
  const navigate = useNavigate()
  const [traces, setTraces] = useState<TraceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [endpointFilter, setEndpointFilter] = useState<string>("")
  const [serverFilter, setServerFilter] = useState<string>("")
  const [toolFilter, setToolFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")

  // Filter options (populated from data)
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    endpoints: [],
    servers: [],
    tools: [],
  })

  // Pagination state
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  // Fetch traces from API
  const fetchTraces = async () => {
    try {
      setLoading(true)
      setError(null)

      // Build query params
      const params = new URLSearchParams()
      params.set("page", page.toString())
      params.set("limit", pageSize.toString())
      if (endpointFilter) params.set("endpoint", endpointFilter)
      if (serverFilter) params.set("server", serverFilter)
      if (toolFilter) params.set("tool", toolFilter)
      if (statusFilter) params.set("status", statusFilter)
      if (dateFrom)
        params.set("dateFrom", new Date(dateFrom).getTime().toString())
      if (dateTo) params.set("dateTo", new Date(dateTo).getTime().toString())

      const response = await api.get<TracesResponse>(
        `/api/traces?${params.toString()}`
      )

      setTraces(response.data || [])
      setTotal(response.pagination?.total || 0)

      // Update filter options from data
      updateFilterOptions(response.data || [])
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch traces"
      setError(errorMessage)
      setTraces([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  // Update filter options from traces data
  const updateFilterOptions = (data: TraceEntry[]) => {
    const endpoints = [
      ...new Set(data.filter((t) => t.endpointId).map((t) => t.endpointId!)),
    ]
    const servers = [...new Set(data.map((t) => t.serverName))]
    const tools = [...new Set(data.map((t) => t.toolName))]
    setFilterOptions({ endpoints, servers, tools })
  }

  // Fetch traces on mount and when filters/page change
  useEffect(() => {
    fetchTraces()
  }, [
    page,
    endpointFilter,
    serverFilter,
    toolFilter,
    statusFilter,
    dateFrom,
    dateTo,
  ])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [endpointFilter, serverFilter, toolFilter, statusFilter, dateFrom, dateTo])

  // Format duration for display
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  // Format time for display
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  // Define table columns
  const columns: Column<TraceEntry>[] = [
    {
      accessor: "startTime",
      header: "Time",
      cell: (value) => (
        <span className="font-mono text-sm">{formatTime(value as number)}</span>
      ),
    },
    {
      accessor: "toolName",
      header: "Tool",
      cell: (value) => (
        <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
          {value as string}
        </code>
      ),
    },
    {
      accessor: "serverName",
      header: "Server",
      cell: (value) => (
        <span className="text-muted-foreground text-sm">{value as string}</span>
      ),
    },
    {
      accessor: "status",
      header: "Status",
      cell: (value) => {
        const status = value as "success" | "error"
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              status === "success"
                ? "bg-success/10 text-success"
                : "bg-error/10 text-error"
            )}
          >
            {status === "success" ? (
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                className="w-3 h-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
            {status === "success" ? "Success" : "Error"}
          </span>
        )
      },
    },
    {
      accessor: "durationMs",
      header: "Duration",
      cell: (value) => (
        <span className="font-mono text-sm text-muted-foreground">
          {formatDuration(value as number)}
        </span>
      ),
    },
    {
      accessor: (row) => row.id,
      header: "Action",
      sortable: false,
      cell: (_value, row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/traces/${row.traceId}`)}
        >
          View
        </Button>
      ),
    },
  ]

  // Clear all filters
  const clearFilters = () => {
    setEndpointFilter("")
    setServerFilter("")
    setToolFilter("")
    setStatusFilter("")
    setDateFrom("")
    setDateTo("")
  }

  const hasActiveFilters =
    endpointFilter ||
    serverFilter ||
    toolFilter ||
    statusFilter ||
    dateFrom ||
    dateTo

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Traces</h2>
        <p className="text-muted-foreground">
          View and analyze tool call traces with end-to-end encrypted payloads.
          Request and response data is decrypted client-side.
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium">Filters</h3>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Endpoint Filter */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-muted-foreground">
              Endpoint
            </label>
            <select
              value={endpointFilter}
              onChange={(e) => setEndpointFilter(e.target.value)}
              className="w-full p-2 bg-secondary border border-border rounded-md text-foreground text-sm"
            >
              <option value="">All Endpoints</option>
              {filterOptions.endpoints.map((endpoint) => (
                <option key={endpoint} value={endpoint}>
                  {endpoint}
                </option>
              ))}
            </select>
          </div>

          {/* Server Filter */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-muted-foreground">
              MCP Server
            </label>
            <select
              value={serverFilter}
              onChange={(e) => setServerFilter(e.target.value)}
              className="w-full p-2 bg-secondary border border-border rounded-md text-foreground text-sm"
            >
              <option value="">All Servers</option>
              {filterOptions.servers.map((server) => (
                <option key={server} value={server}>
                  {server}
                </option>
              ))}
            </select>
          </div>

          {/* Tool Filter */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-muted-foreground">
              Tool
            </label>
            <select
              value={toolFilter}
              onChange={(e) => setToolFilter(e.target.value)}
              className="w-full p-2 bg-secondary border border-border rounded-md text-foreground text-sm"
            >
              <option value="">All Tools</option>
              {filterOptions.tools.map((tool) => (
                <option key={tool} value={tool}>
                  {tool}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-muted-foreground">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 bg-secondary border border-border rounded-md text-foreground text-sm"
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-muted-foreground">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full p-2 bg-secondary border border-border rounded-md text-foreground text-sm"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-muted-foreground">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full p-2 bg-secondary border border-border rounded-md text-foreground text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="mb-6">
          <div className="text-warning text-center text-sm">{error}</div>
        </Card>
      )}

      {/* Traces Table */}
      <Card>
        <DataTable
          columns={columns}
          data={traces}
          loading={loading}
          emptyMessage="No traces recorded yet. Traces will appear here once tool calls are made through the gateway."
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
        />
      </Card>
    </div>
  )
}
