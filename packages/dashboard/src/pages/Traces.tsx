import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { DataTable } from "../components/ui/DataTable"
import type { Column } from "../components/ui/DataTable"
import { LegacyCard as Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { cn } from "@/lib/utils"

const GATEWAY_API_URL = "http://localhost:3001"
const POLLING_INTERVAL_MS = 2000

/**
 * Trace entry from the local Gateway HTTP API
 * Matches ToolCallTrace from gateway/src/types.ts
 */
export interface TraceEntry {
  /** Unique trace ID */
  traceId: string
  /** Request ID for correlation */
  requestId: string
  /** Aggregated tool name (e.g., server__tool) */
  aggregatedToolName: string
  /** MCP server name */
  serverName: string
  /** Original tool name */
  toolName: string
  /** Call arguments */
  arguments?: unknown
  /** Call result (on success) */
  result?: unknown
  /** Error message (on failure) */
  error?: string
  /** Call start timestamp (ISO string from JSON) */
  startedAt: string
  /** Call end timestamp (ISO string from JSON) */
  endedAt?: string
  /** Duration in milliseconds */
  durationMs?: number
  /** Status of the trace */
  status: "success" | "error"
}

interface TracesResponse {
  traces: TraceEntry[]
  total: number
  limit: number
  offset: number
}

interface FilterOptions {
  servers: string[]
  tools: string[]
}

export function Traces() {
  const navigate = useNavigate()
  const [traces, setTraces] = useState<TraceEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gatewayConnected, setGatewayConnected] = useState(true)

  // Filter state
  const [serverFilter, setServerFilter] = useState<string>("")
  const [toolFilter, setToolFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Filter options (populated from data)
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    servers: [],
    tools: [],
  })

  // Pagination state
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 20

  // Auto-refresh polling ref
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isInitialLoad = useRef(true)

  // Fetch traces from Gateway HTTP API
  const fetchTraces = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true)
        }
        setError(null)

        // Build query params for gateway API
        const params = new URLSearchParams()
        params.set("limit", pageSize.toString())
        params.set("offset", ((page - 1) * pageSize).toString())
        if (statusFilter) params.set("status", statusFilter)
        if (searchQuery) params.set("search", searchQuery)

        const response = await fetch(
          `${GATEWAY_API_URL}/api/traces?${params.toString()}`
        )

        if (!response.ok) {
          throw new Error(`Gateway API error: ${response.status}`)
        }

        const data: TracesResponse = await response.json()

        // Apply client-side filtering for server and tool (gateway only supports status and search)
        let filteredTraces = data.traces || []
        if (serverFilter) {
          filteredTraces = filteredTraces.filter(
            (t) => t.serverName === serverFilter
          )
        }
        if (toolFilter) {
          filteredTraces = filteredTraces.filter(
            (t) => t.aggregatedToolName === toolFilter
          )
        }

        setTraces(filteredTraces)
        setTotal(data.total || 0)
        setGatewayConnected(true)

        // Update filter options from data
        updateFilterOptions(data.traces || [])
      } catch (err) {
        // Check if it's a connection error (gateway not running)
        if (
          err instanceof TypeError &&
          err.message.includes("Failed to fetch")
        ) {
          setGatewayConnected(false)
          setError("Gateway not connected")
        } else {
          const errorMessage =
            err instanceof Error ? err.message : "Failed to fetch traces"
          setError(errorMessage)
        }
        setTraces([])
        setTotal(0)
      } finally {
        setLoading(false)
        isInitialLoad.current = false
      }
    },
    [page, statusFilter, searchQuery, serverFilter, toolFilter]
  )

  // Update filter options from traces data
  const updateFilterOptions = (data: TraceEntry[]) => {
    const servers = [...new Set(data.map((t) => t.serverName))]
    const tools = [...new Set(data.map((t) => t.aggregatedToolName))]
    setFilterOptions({ servers, tools })
  }

  // Fetch traces on mount and when filters/page change
  useEffect(() => {
    fetchTraces(isInitialLoad.current)
  }, [fetchTraces])

  // Setup auto-refresh polling
  useEffect(() => {
    // Start polling
    pollingRef.current = setInterval(() => {
      fetchTraces(false) // Don't show loading spinner on auto-refresh
    }, POLLING_INTERVAL_MS)

    // Cleanup on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [fetchTraces])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [serverFilter, toolFilter, statusFilter, searchQuery])

  // Format duration for display
  const formatDuration = (ms: number | undefined) => {
    if (ms === undefined) return "-"
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  // Format time for display (from ISO string)
  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  // Define table columns
  const columns: Column<TraceEntry>[] = [
    {
      accessor: "startedAt",
      header: "Time",
      cell: (value) => (
        <span className="font-mono text-sm">{formatTime(value as string)}</span>
      ),
    },
    {
      accessor: "aggregatedToolName",
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
          {formatDuration(value as number | undefined)}
        </span>
      ),
    },
    {
      accessor: (row) => row.traceId,
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
    setServerFilter("")
    setToolFilter("")
    setStatusFilter("")
    setSearchQuery("")
  }

  const hasActiveFilters =
    serverFilter || toolFilter || statusFilter || searchQuery

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Traces</h2>
            <p className="text-muted-foreground">
              Real-time tool call traces from the local gateway.
            </p>
          </div>
          {/* Connection status indicator */}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium",
              gatewayConnected
                ? "bg-success/10 text-success"
                : "bg-error/10 text-error"
            )}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                gatewayConnected ? "bg-success" : "bg-error"
              )}
            />
            {gatewayConnected ? "Gateway Connected" : "Gateway Disconnected"}
          </div>
        </div>
      </div>

      {/* Gateway not connected message */}
      {!gatewayConnected && (
        <Card className="mb-6">
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-error/10 mb-4">
              <svg
                className="w-6 h-6 text-error"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">Gateway Not Connected</h3>
            <p className="text-muted-foreground text-sm mb-4">
              The local gateway is not running or cannot be reached at{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                {GATEWAY_API_URL}
              </code>
            </p>
            <p className="text-muted-foreground text-sm">
              Start the gateway with{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                cd packages/gateway && bun run dev
              </code>
            </p>
          </div>
        </Card>
      )}

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-muted-foreground">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools, servers..."
              className="w-full p-2 bg-secondary border border-border rounded-md text-foreground text-sm placeholder:text-muted-foreground"
            />
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
        </div>
      </Card>

      {/* Error Message (non-connection errors) */}
      {error && gatewayConnected && (
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
          emptyMessage={
            gatewayConnected
              ? "No traces recorded yet. Traces will appear here once tool calls are made through the gateway."
              : "Connect to the gateway to view traces."
          }
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
        />
      </Card>
    </div>
  )
}
