/**
 * ConnectionStatus component
 *
 * Displays the connection status of the athreei system including:
 * - MCP server status
 * - Extension status
 * - Connected AI apps
 *
 * Polls the status endpoint every 10 seconds
 * Shows dropdown with details when clicked
 */

import { useState, useEffect, useRef } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { StatusIndicator } from "./ui/StatusIndicator"
import { getSystemStatus, getMcpStatus, getExtensionStatus } from "../lib/api"
import type { SystemStatus, McpStatus, ExtensionStatus } from "../lib/api"
import { cn } from "@/lib/utils"

const STATUS_POLLING_INTERVAL_MS = 10000 // 10 seconds

export function ConnectionStatus() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [mcpStatus, setMcpStatus] = useState<McpStatus | null>(null)
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch all status data
  const fetchStatus = async () => {
    try {
      const [system, mcp, ext] = await Promise.all([
        getSystemStatus(),
        getMcpStatus(),
        getExtensionStatus(),
      ])
      setSystemStatus(system)
      setMcpStatus(mcp)
      setExtensionStatus(ext)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status")
      console.error("Failed to fetch status:", err)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and polling
  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, STATUS_POLLING_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDetails(false)
      }
    }

    if (showDetails) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showDetails])

  // Determine overall status
  const isConnected = systemStatus?.mcpServer && systemStatus?.extension
  const statusType = loading
    ? "warning"
    : error
      ? "error"
      : isConnected
        ? "online"
        : "offline"

  const statusLabel = loading
    ? "Connecting..."
    : error
      ? "Error"
      : isConnected
        ? "Connected"
        : "Disconnected"

  // Format uptime
  const formatUptime = (ms: number | undefined) => {
    if (!ms) return "N/A"
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Status indicator button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={cn(
          "flex items-center gap-2 px-4 py-1.5",
          "bg-transparent border border-border rounded-md",
          "cursor-pointer transition-colors",
          "hover:bg-accent"
        )}
      >
        <StatusIndicator status={statusType} />
        <span className="text-sm text-muted-foreground">{statusLabel}</span>
        {showDetails ? (
          <ChevronUp className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        )}
      </button>

      {/* Details dropdown */}
      {showDetails && (
        <div
          className={cn(
            "absolute top-full right-0 mt-2 min-w-80",
            "bg-card border border-border rounded-md shadow-lg p-4 z-50"
          )}
        >
          {error ? (
            <div>
              <h4 className="m-0 mb-2 text-error">Connection Error</h4>
              <p className="m-0 text-sm text-muted-foreground">{error}</p>
            </div>
          ) : (
            <>
              {/* MCP Server Status */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <StatusIndicator status={mcpStatus?.running ? "online" : "offline"} size="sm" />
                  <h4 className="m-0 text-sm font-medium">MCP Server</h4>
                </div>
                {mcpStatus && (
                  <div className="ml-5 text-xs text-muted-foreground space-y-0.5">
                    <div>Version: {mcpStatus.version}</div>
                    <div>Uptime: {formatUptime(mcpStatus.uptime)}</div>
                    <div>Connected clients: {mcpStatus.connectedClients}</div>
                    <div>Tools: {mcpStatus.tools.length}</div>
                  </div>
                )}
              </div>

              {/* Extension Status */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <StatusIndicator
                    status={extensionStatus?.installed ? "online" : "offline"}
                    size="sm"
                  />
                  <h4 className="m-0 text-sm font-medium">Chrome Extension</h4>
                </div>
                {extensionStatus && (
                  <div className="ml-5 text-xs text-muted-foreground space-y-0.5">
                    <div>Version: {extensionStatus.version}</div>
                    <div>Active tabs: {extensionStatus.activeTabs}</div>
                    <div>
                      Native host:{" "}
                      {extensionStatus.nativeHost.connected ? "Connected" : "Disconnected"}
                    </div>
                  </div>
                )}
              </div>

              {/* Connected AI Apps */}
              <div>
                <h4 className="m-0 mb-1 text-sm font-medium">Connected AI Apps</h4>
                {systemStatus?.aiApps && systemStatus.aiApps.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {systemStatus.aiApps.map((app) => (
                      <span
                        key={app}
                        className="px-2 py-1 bg-secondary rounded text-xs text-muted-foreground"
                      >
                        {app}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="m-0 text-xs text-muted-foreground">No AI apps connected</p>
                )}
              </div>

              {/* System Info */}
              {systemStatus?.version && (
                <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
                  <div>System version: {systemStatus.version}</div>
                  {systemStatus.uptime && (
                    <div>System uptime: {formatUptime(systemStatus.uptime)}</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
