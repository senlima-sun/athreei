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

import { h } from "preact"
import { useState, useEffect, useRef } from "preact/hooks"
import { StatusIndicator } from "./ui/StatusIndicator"
import { getSystemStatus, getMcpStatus, getExtensionStatus } from "../lib/api"
import type { SystemStatus, McpStatus, ExtensionStatus } from "../lib/api"

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
    <div style={{ position: "relative" }} ref={dropdownRef}>
      {/* Status indicator button */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--spacing-sm)",
          padding: "var(--spacing-xs) var(--spacing-md)",
          background: "transparent",
          border: "1px solid var(--border-color)",
          borderRadius: "var(--radius-md)",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--bg-tertiary)"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent"
        }}
      >
        <StatusIndicator status={statusType} />
        <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
          {statusLabel}
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
          {showDetails ? "▲" : "▼"}
        </span>
      </button>

      {/* Details dropdown */}
      {showDetails && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + var(--spacing-sm))",
            right: 0,
            minWidth: "320px",
            backgroundColor: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            padding: "var(--spacing-md)",
            zIndex: 1000,
          }}
        >
          {error ? (
            <div>
              <h4 style={{ margin: "0 0 var(--spacing-sm) 0", color: "var(--error)" }}>
                Connection Error
              </h4>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-tertiary)" }}>
                {error}
              </p>
            </div>
          ) : (
            <>
              {/* MCP Server Status */}
              <div style={{ marginBottom: "var(--spacing-md)" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--spacing-sm)",
                    marginBottom: "var(--spacing-xs)",
                  }}
                >
                  <StatusIndicator
                    status={mcpStatus?.running ? "online" : "offline"}
                    size="sm"
                  />
                  <h4 style={{ margin: 0, fontSize: "0.875rem" }}>MCP Server</h4>
                </div>
                {mcpStatus && (
                  <div
                    style={{
                      marginLeft: "20px",
                      fontSize: "0.75rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    <div>Version: {mcpStatus.version}</div>
                    <div>Uptime: {formatUptime(mcpStatus.uptime)}</div>
                    <div>Connected clients: {mcpStatus.connectedClients}</div>
                    <div>Tools: {mcpStatus.tools.length}</div>
                  </div>
                )}
              </div>

              {/* Extension Status */}
              <div style={{ marginBottom: "var(--spacing-md)" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--spacing-sm)",
                    marginBottom: "var(--spacing-xs)",
                  }}
                >
                  <StatusIndicator
                    status={extensionStatus?.installed ? "online" : "offline"}
                    size="sm"
                  />
                  <h4 style={{ margin: 0, fontSize: "0.875rem" }}>Chrome Extension</h4>
                </div>
                {extensionStatus && (
                  <div
                    style={{
                      marginLeft: "20px",
                      fontSize: "0.75rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
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
                <h4
                  style={{
                    margin: "0 0 var(--spacing-xs) 0",
                    fontSize: "0.875rem",
                  }}
                >
                  Connected AI Apps
                </h4>
                {systemStatus?.aiApps && systemStatus.aiApps.length > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "var(--spacing-xs)",
                      marginTop: "var(--spacing-xs)",
                    }}
                  >
                    {systemStatus.aiApps.map((app) => (
                      <span
                        key={app}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "var(--bg-tertiary)",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "0.75rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {app}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.75rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    No AI apps connected
                  </p>
                )}
              </div>

              {/* System Info */}
              {systemStatus?.version && (
                <div
                  style={{
                    marginTop: "var(--spacing-md)",
                    paddingTop: "var(--spacing-md)",
                    borderTop: "1px solid var(--border-color)",
                    fontSize: "0.75rem",
                    color: "var(--text-tertiary)",
                  }}
                >
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
