import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { LegacyCard as Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Spinner } from "../components/ui/Spinner"
import { EmptyState, SearchIcon } from "../components/ui/EmptyState"
import { cn } from "@/lib/utils"
import type { TraceEntry } from "./Traces"

const GATEWAY_API_URL = "http://localhost:3001"

export function TraceDetail() {
  const { uuid } = useParams<{ uuid: string }>()
  const navigate = useNavigate()

  const [trace, setTrace] = useState<TraceEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gatewayConnected, setGatewayConnected] = useState(true)

  // Fetch trace from Gateway HTTP API
  useEffect(() => {
    const fetchTrace = async () => {
      if (!uuid) return

      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`${GATEWAY_API_URL}/api/traces/${uuid}`)

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Trace not found")
          }
          throw new Error(`Gateway API error: ${response.status}`)
        }

        const data: TraceEntry = await response.json()
        setTrace(data)
        setGatewayConnected(true)
      } catch (err) {
        // Check if it's a connection error (gateway not running)
        if (
          err instanceof TypeError &&
          err.message.includes("Failed to fetch")
        ) {
          setGatewayConnected(false)
          setError("Gateway not connected")
        } else {
          setError(
            err instanceof Error ? err.message : "Failed to load trace details"
          )
        }
        setTrace(null)
      } finally {
        setLoading(false)
      }
    }

    fetchTrace()
  }, [uuid])

  // Format duration for display
  const formatDuration = (ms: number | undefined) => {
    if (ms === undefined) return "-"
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  // Format timestamp for display (from ISO string)
  const formatTimestamp = (isoString: string) => {
    return new Date(isoString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Spinner size="lg" />
        <p className="text-muted-foreground">Loading trace details...</p>
      </div>
    )
  }

  if (!trace) {
    // Gateway not connected
    if (!gatewayConnected) {
      return (
        <div>
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/traces")}
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Traces
            </Button>
          </div>
          <Card>
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
              <h3 className="text-lg font-medium mb-2">
                Gateway Not Connected
              </h3>
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
        </div>
      )
    }

    return (
      <EmptyState
        icon={<SearchIcon />}
        title={error ? "Unable to load trace" : "Trace not found"}
        description={
          error ||
          "The requested trace could not be found. It may have been deleted or the ID is incorrect."
        }
        action={{
          label: "Back to Traces",
          onClick: () => navigate("/traces"),
        }}
        className="h-64"
      />
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/traces")}
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </Button>
          </div>
          <h2 className="text-2xl font-semibold mb-1">Trace Details</h2>
          <p className="text-muted-foreground font-mono text-sm">
            {trace.traceId}
          </p>
        </div>
      </div>

      {/* Metadata */}
      <Card className="mb-6">
        <h3 className="text-lg font-medium mb-4">Metadata</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Aggregated Tool
            </label>
            <p className="mt-1">
              <code className="bg-muted px-2 py-1 rounded text-sm">
                {trace.aggregatedToolName}
              </code>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Original Tool
            </label>
            <p className="mt-1">
              <code className="bg-muted px-2 py-1 rounded text-sm">
                {trace.toolName}
              </code>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Server
            </label>
            <p className="mt-1 text-sm">{trace.serverName}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Status
            </label>
            <p className="mt-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                  trace.status === "success"
                    ? "bg-success/10 text-success"
                    : "bg-error/10 text-error"
                )}
              >
                {trace.status === "success" ? (
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
                {trace.status === "success" ? "Success" : "Error"}
              </span>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Duration
            </label>
            <p className="mt-1 font-mono text-sm">
              {formatDuration(trace.durationMs)}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Start Time
            </label>
            <p className="mt-1 text-sm">{formatTimestamp(trace.startedAt)}</p>
          </div>
          {trace.endedAt && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                End Time
              </label>
              <p className="mt-1 text-sm">{formatTimestamp(trace.endedAt)}</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Request ID
            </label>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {trace.requestId}
            </p>
          </div>
        </div>
      </Card>

      {/* Error Message (if failed) */}
      {trace.status === "error" && trace.error && (
        <Card className="mb-6">
          <h3 className="text-lg font-medium mb-4 text-error">Error Details</h3>
          <pre className="bg-error/5 border border-error/20 rounded-md p-4 text-sm overflow-x-auto text-error">
            {trace.error}
          </pre>
        </Card>
      )}

      {/* Request/Response Payload */}
      <Card>
        <h3 className="text-lg font-medium mb-4">Payload</h3>

        {!trace.arguments && !trace.result ? (
          <div className="text-muted-foreground text-center py-8">
            No payload data available for this trace.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Request Arguments */}
            {trace.arguments !== undefined && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Request Arguments
                </h4>
                <pre className="bg-muted rounded-md p-4 text-sm overflow-x-auto max-h-96">
                  {JSON.stringify(trace.arguments, null, 2)}
                </pre>
              </div>
            )}

            {/* Response Result */}
            {trace.result !== undefined && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Response Result
                </h4>
                <pre className="bg-muted rounded-md p-4 text-sm overflow-x-auto max-h-96">
                  {JSON.stringify(trace.result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
