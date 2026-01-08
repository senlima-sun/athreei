"use client"

import { useState, useEffect, useCallback } from "react"
import {
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/dashboard"
import { useActiveOrganizationSafe } from "@/lib/auth-client"
import { isLocalMode } from "@/lib/mode"
import { fetchApi } from "@/lib/api"
import {
  Server,
  ServerCog,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plug,
} from "lucide-react"
import type { Server as ServerType, ServersResponse, TestResult } from "@/types"

export default function ServersPage() {
  const { data: org, isPending: isOrgPending } = useActiveOrganizationSafe()
  const [servers, setServers] = useState<ServerType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gatewayConnected, setGatewayConnected] = useState(false)
  const [testingServer, setTestingServer] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [expandedServer, setExpandedServer] = useState<string | null>(null)

  const fetchServers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const data = await fetchApi<ServersResponse>("/api/servers", {
        organizationId: org?.id,
      })

      setServers(data.servers || [])
      setGatewayConnected(true)
    } catch (err) {
      setGatewayConnected(false)
      setError(
        err instanceof Error ? err.message : "Failed to connect to gateway"
      )
    } finally {
      setIsLoading(false)
    }
  }, [org?.id])

  useEffect(() => {
    if (isOrgPending) return
    fetchServers()
    // Refresh every 10 seconds
    const interval = setInterval(fetchServers, 10000)
    return () => clearInterval(interval)
  }, [fetchServers, isOrgPending])

  const testServer = async (serverName: string) => {
    setTestingServer(serverName)
    try {
      const result = await fetchApi<TestResult>(
        `/api/servers/${serverName}/test`,
        {
          organizationId: org?.id,
        }
      )
      setTestResults((prev) => ({ ...prev, [serverName]: result }))
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [serverName]: {
          success: false,
          server: serverName,
          error: err instanceof Error ? err.message : "Test failed",
          message: "Connection test failed",
        },
      }))
    } finally {
      setTestingServer(null)
    }
  }

  if (isOrgPending || isLoading) {
    return (
      <div>
        <PageHeader
          title="Connected Servers"
          description="View and test MCP servers connected to the gateway."
        />
        <LoadingState />
      </div>
    )
  }

  if (!gatewayConnected && !isLoading) {
    return (
      <div>
        <PageHeader
          title="Connected Servers"
          description="View and test MCP servers connected to the gateway."
        />
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <div className="mb-4 text-red-500">
            <AlertTriangle className="mx-auto mb-2 h-12 w-12" />
            <span className="text-lg font-medium">Gateway Not Connected</span>
          </div>
          <p className="mb-4 text-gray-600">
            The gateway is not running or not accessible.
          </p>
          {isLocalMode() && (
            <p className="text-sm text-gray-500">
              Start the gateway with:{" "}
              <code className="rounded bg-gray-100 px-2 py-1">
                athreei-gateway --local
              </code>
            </p>
          )}
        </div>
      </div>
    )
  }

  if (error && gatewayConnected) {
    return (
      <div>
        <PageHeader
          title="Connected Servers"
          description="View and test MCP servers connected to the gateway."
        />
        <ErrorState message={error} />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <PageHeader
          title="Connected Servers"
          description="View and test MCP servers connected to the gateway."
        />
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${
              gatewayConnected
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {gatewayConnected ? "Gateway Connected" : "Disconnected"}
          </span>
          <button
            onClick={fetchServers}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {servers.length === 0 ? (
        <EmptyState
          icon={ServerCog}
          title="No servers connected"
          description={
            isLocalMode()
              ? "Add servers to your ~/.athreei/config.json file."
              : "No MCP servers are connected to this organization."
          }
        />
      ) : (
        <div className="space-y-4">
          {servers.map((server) => {
            const testResult = testResults[server.sanitizedName]
            const isExpanded = expandedServer === server.sanitizedName

            return (
              <div
                key={server.sanitizedName}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <Server className="h-5 w-5 text-gray-400" />
                        <h3 className="text-lg font-medium text-gray-900">
                          {server.name}
                        </h3>
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            server.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {server.status}
                        </span>
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                          {server.transport}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {server.transport === "stdio" ? (
                          <code className="rounded bg-gray-100 px-1">
                            {server.command} {server.args}
                          </code>
                        ) : (
                          <code className="rounded bg-gray-100 px-1">
                            {server.url}
                          </code>
                        )}
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {server.toolCount} tool{server.toolCount !== 1 && "s"}{" "}
                        available
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setExpandedServer(
                            isExpanded ? null : server.sanitizedName
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Hide Tools
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            Show Tools
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => testServer(server.sanitizedName)}
                        disabled={testingServer === server.sanitizedName}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Plug className="h-4 w-4" />
                        {testingServer === server.sanitizedName
                          ? "Testing..."
                          : "Test Connection"}
                      </button>
                    </div>
                  </div>

                  {testResult && (
                    <div
                      className={`mt-3 rounded p-2 text-sm ${
                        testResult.success
                          ? "bg-green-50 text-green-800"
                          : "bg-red-50 text-red-800"
                      }`}
                    >
                      {testResult.success ? (
                        <>
                          {testResult.message} ({testResult.durationMs}ms,{" "}
                          {testResult.tools} tools)
                        </>
                      ) : (
                        <>{testResult.error}</>
                      )}
                    </div>
                  )}
                </div>

                {isExpanded && server.tools.length > 0 && (
                  <div className="border-t bg-gray-50 p-4">
                    <h4 className="mb-2 text-sm font-medium text-gray-700">
                      Available Tools
                    </h4>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {server.tools.map((tool) => (
                        <div
                          key={tool.name}
                          className="rounded border bg-white p-2 text-sm"
                        >
                          <code className="font-medium text-gray-900">
                            {server.sanitizedName}__{tool.name}
                          </code>
                          {tool.description && (
                            <p className="mt-1 text-xs text-gray-500">
                              {tool.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
