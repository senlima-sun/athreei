import { useState, useEffect, useCallback } from "react"
import { LegacyCard as Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"

const GATEWAY_API_URL = "http://localhost:3001"

interface ServerTool {
  name: string
  description?: string
}

interface Server {
  name: string
  sanitizedName: string
  transport: string
  command?: string
  args?: string
  url?: string
  status: string
  tools: ServerTool[]
  toolCount: number
}

interface ServersResponse {
  servers: Server[]
  total: number
}

interface TestResult {
  success: boolean
  server: string
  durationMs?: number
  tools?: number
  error?: string
  message: string
}

export function Servers() {
  const [servers, setServers] = useState<Server[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gatewayConnected, setGatewayConnected] = useState(false)
  const [testingServer, setTestingServer] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({})
  const [expandedServer, setExpandedServer] = useState<string | null>(null)

  const fetchServers = useCallback(async () => {
    try {
      const response = await fetch(`${GATEWAY_API_URL}/api/servers`)
      if (!response.ok) {
        throw new Error("Failed to fetch servers")
      }
      const data: ServersResponse = await response.json()
      setServers(data.servers)
      setGatewayConnected(true)
      setError(null)
    } catch (err) {
      setGatewayConnected(false)
      setError(
        err instanceof Error ? err.message : "Failed to connect to gateway"
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchServers()
    // Refresh every 10 seconds
    const interval = setInterval(fetchServers, 10000)
    return () => clearInterval(interval)
  }, [fetchServers])

  const testServer = async (serverName: string) => {
    setTestingServer(serverName)
    try {
      const response = await fetch(
        `${GATEWAY_API_URL}/api/servers/${serverName}/test`
      )
      const result: TestResult = await response.json()
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

  if (!gatewayConnected && !loading) {
    return (
      <div>
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Connected Servers</h2>
          <p className="text-muted-foreground">
            View and test MCP servers connected to the gateway.
          </p>
        </div>

        <Card className="p-8 text-center">
          <div className="text-error mb-4">
            <svg
              className="w-12 h-12 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Gateway Not Connected
          </div>
          <p className="text-muted-foreground mb-4">
            The gateway is not running or not accessible at {GATEWAY_API_URL}
          </p>
          <p className="text-sm text-muted-foreground">
            Start the gateway with: <code>athreei-gateway --local</code>
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Connected Servers</h2>
          <p className="text-muted-foreground">
            View and test MCP servers connected to the gateway.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
              gatewayConnected
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {gatewayConnected ? "● Gateway Connected" : "● Disconnected"}
          </span>
          <Button variant="secondary" size="sm" onClick={fetchServers}>
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="mb-6 p-4">
          <div className="text-error">{error}</div>
        </Card>
      )}

      {loading ? (
        <Card className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading servers...</p>
        </Card>
      ) : servers.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            No MCP servers connected to the gateway.
          </p>
          <p className="text-sm text-muted-foreground">
            Add servers to your <code>~/.athreei/config.json</code> file.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {servers.map((server) => {
            const testResult = testResults[server.sanitizedName]
            const isExpanded = expandedServer === server.sanitizedName

            return (
              <Card key={server.sanitizedName} className="overflow-hidden">
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-medium">{server.name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            server.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {server.status}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                          {server.transport}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {server.transport === "stdio" ? (
                          <code>
                            {server.command} {server.args}
                          </code>
                        ) : (
                          <code>{server.url}</code>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {server.toolCount} tool{server.toolCount !== 1 && "s"}{" "}
                        available
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setExpandedServer(
                            isExpanded ? null : server.sanitizedName
                          )
                        }
                      >
                        {isExpanded ? "Hide Tools" : "Show Tools"}
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => testServer(server.sanitizedName)}
                        disabled={testingServer === server.sanitizedName}
                      >
                        {testingServer === server.sanitizedName
                          ? "Testing..."
                          : "Test Connection"}
                      </Button>
                    </div>
                  </div>

                  {testResult && (
                    <div
                      className={`mt-3 p-2 rounded text-sm ${
                        testResult.success
                          ? "bg-green-50 text-green-800"
                          : "bg-red-50 text-red-800"
                      }`}
                    >
                      {testResult.success ? (
                        <>
                          ✓ {testResult.message} ({testResult.durationMs}ms,{" "}
                          {testResult.tools} tools)
                        </>
                      ) : (
                        <>✗ {testResult.error}</>
                      )}
                    </div>
                  )}
                </div>

                {isExpanded && server.tools.length > 0 && (
                  <div className="border-t bg-gray-50 p-4">
                    <h4 className="text-sm font-medium mb-2">
                      Available Tools
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {server.tools.map((tool) => (
                        <div
                          key={tool.name}
                          className="bg-white p-2 rounded border text-sm"
                        >
                          <code className="font-medium">
                            {server.sanitizedName}__{tool.name}
                          </code>
                          {tool.description && (
                            <p className="text-muted-foreground text-xs mt-1">
                              {tool.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
