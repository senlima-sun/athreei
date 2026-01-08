"use client"

import { useState } from "react"
import Link from "next/link"
import { Server, Settings, Activity, Loader2 } from "lucide-react"
import { McpTransportType } from "./mcp-type-selector"
import { TRANSPORT_ICONS, TRANSPORT_LABELS, STATUS_STYLES } from "@/constants"
import { fetchApi } from "@/lib/api"

export type McpServerStatus = "active" | "inactive" | "error"

export interface McpServer {
  id: string
  name: string
  description?: string
  transportType: McpTransportType
  status: McpServerStatus
  // STDIO config
  command?: string
  args?: string[]
  // SSE/HTTP config
  url?: string
  envKeys?: string[]
  lastSeenAt?: string
  createdAt?: Date
  updatedAt?: Date
}

interface HealthStatus {
  status: "healthy" | "unhealthy"
  latency?: number
  lastSeen?: string
  error?: string
}

interface McpServerCardProps {
  server: McpServer
  href?: string
  showActions?: boolean
  organizationId?: string
}

export function McpServerCard({
  server,
  href,
  showActions = true,
  organizationId,
}: McpServerCardProps) {
  const TransportIcon = TRANSPORT_ICONS[server.transportType]
  const statusStyle = STATUS_STYLES[server.status]
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [isCheckingHealth, setIsCheckingHealth] = useState(false)

  const checkHealth = async () => {
    if (server.transportType === "stdio") return // Can't check STDIO remotely
    setIsCheckingHealth(true)
    try {
      const result = await fetchApi<HealthStatus>(
        `/api/mcp-servers/${server.id}/health`,
        { organizationId }
      )
      setHealthStatus(result)
    } catch {
      setHealthStatus({ status: "unhealthy", error: "Health check failed" })
    } finally {
      setIsCheckingHealth(false)
    }
  }

  const formatLastSeen = (dateStr?: string) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString()
  }

  const CardContent = () => (
    <>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
            <Server className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{server.name}</h3>
            {server.description && (
              <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">
                {server.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
            {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
          </span>

          {/* Transport type badge */}
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            <TransportIcon className="h-3 w-3" />
            {TRANSPORT_LABELS[server.transportType]}
          </span>
        </div>
      </div>

      {/* Connection info */}
      <div className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs font-mono text-gray-600">
        {server.transportType === "stdio" ? (
          <span>
            {server.command}
            {server.args &&
              server.args.length > 0 &&
              ` ${server.args.join(" ")}`}
          </span>
        ) : (
          <span>{server.url}</span>
        )}
      </div>

      {/* Health status section */}
      {server.transportType !== "stdio" && (
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2">
            {healthStatus ? (
              <span
                className={`inline-flex items-center gap-1 text-xs ${
                  healthStatus.status === "healthy"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    healthStatus.status === "healthy"
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                />
                {healthStatus.status === "healthy" ? "Healthy" : "Unhealthy"}
                {healthStatus.latency && (
                  <span className="text-gray-400">
                    ({healthStatus.latency}ms)
                  </span>
                )}
              </span>
            ) : server.lastSeenAt ? (
              <span className="text-xs text-gray-500">
                Last seen: {formatLastSeen(server.lastSeenAt)}
              </span>
            ) : (
              <span className="text-xs text-gray-400">
                Health status unknown
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={checkHealth}
            disabled={isCheckingHealth}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            title="Check health"
          >
            {isCheckingHealth ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Activity className="h-3 w-3" />
            )}
            Check
          </button>
        </div>
      )}

      {showActions && (
        <div className="mt-3 flex items-center justify-end gap-2">
          {href && (
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <Settings className="h-4 w-4" />
              Configure
            </Link>
          )}
        </div>
      )}
    </>
  )

  if (href && !showActions) {
    return (
      <Link
        href={href}
        className="block rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 hover:bg-gray-50"
      >
        <CardContent />
      </Link>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <CardContent />
    </div>
  )
}

interface McpServerCardGridProps {
  servers: McpServer[]
  baseHref?: string
  showActions?: boolean
  organizationId?: string
}

export function McpServerCardGrid({
  servers,
  baseHref,
  showActions = true,
  organizationId,
}: McpServerCardGridProps) {
  if (servers.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
        <Server className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No MCP servers
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Get started by adding your first MCP server.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {servers.map((server) => (
        <McpServerCard
          key={server.id}
          server={server}
          href={baseHref ? `${baseHref}/${server.id}` : undefined}
          showActions={showActions}
          organizationId={organizationId}
        />
      ))}
    </div>
  )
}
