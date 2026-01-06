"use client"

import { useState, useEffect } from "react"
import { PageHeader, LoadingState, ErrorState } from "@/components/dashboard"
import { Plus, Loader2, Trash2, Shield, X } from "lucide-react"
import { API_URL } from "@/constants/api"

// =============================================================================
// Types
// =============================================================================

interface OAuthConnection {
  provider: string
  serverUrl: string
  createdAt: string
}

interface OAuthProvider {
  id: string
  name: string
  description: string
  serverUrl: string
  icon?: string
}

// =============================================================================
// Constants
// =============================================================================

const KNOWN_PROVIDERS: OAuthProvider[] = [
  {
    id: "sentry",
    name: "Sentry",
    description: "Error tracking and performance monitoring",
    serverUrl: "https://mcp.sentry.dev/sse",
  },
  {
    id: "linear",
    name: "Linear",
    description: "Issue tracking and project management",
    serverUrl: "https://mcp.linear.app/sse",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Code hosting and collaboration",
    serverUrl: "https://api.github.com/mcp/sse",
  },
]

// =============================================================================
// Component
// =============================================================================

export default function OAuthPage() {
  const [connections, setConnections] = useState<OAuthConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const [isDeletingProvider, setIsDeletingProvider] = useState<string | null>(
    null
  )
  const [showProviderModal, setShowProviderModal] = useState(false)
  const [customServerUrl, setCustomServerUrl] = useState("")

  useEffect(() => {
    fetchConnections()
  }, [])

  const fetchConnections = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`${API_URL}/api/oauth/connections`, {
        credentials: "include",
      })
      if (!response.ok) {
        throw new Error("Failed to fetch OAuth connections")
      }
      const data = await response.json()
      setConnections(data.connections || [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load OAuth connections"
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async (serverUrl: string, providerId?: string) => {
    setIsConnecting(providerId || serverUrl)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/api/oauth/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          serverUrl,
          provider: providerId,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to initiate OAuth connection")
      }

      const data = await response.json()
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to initiate OAuth connection"
      )
    } finally {
      setIsConnecting(null)
      setShowProviderModal(false)
    }
  }

  const handleCustomConnect = () => {
    if (!customServerUrl.trim()) {
      setError("Please enter a valid server URL")
      return
    }
    try {
      new URL(customServerUrl)
    } catch {
      setError("Please enter a valid URL")
      return
    }
    handleConnect(customServerUrl)
    setCustomServerUrl("")
  }

  const handleDisconnect = async (serverUrl: string) => {
    setIsDeletingProvider(serverUrl)
    try {
      const response = await fetch(
        `${API_URL}/api/oauth/token?serverUrl=${encodeURIComponent(serverUrl)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      )
      if (!response.ok) {
        throw new Error("Failed to disconnect OAuth connection")
      }
      await fetchConnections()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to disconnect OAuth connection"
      )
    } finally {
      setIsDeletingProvider(null)
    }
  }

  const getConnectedServerUrls = () =>
    new Set(connections.map((c) => c.serverUrl))

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="OAuth Connections"
          description="Connect to MCP servers that require OAuth authentication"
        />
        <LoadingState />
      </div>
    )
  }

  if (error && connections.length === 0) {
    return (
      <div>
        <PageHeader
          title="OAuth Connections"
          description="Connect to MCP servers that require OAuth authentication"
        />
        <ErrorState
          message={error}
          onRetry={() => {
            setError(null)
            fetchConnections()
          }}
        />
      </div>
    )
  }

  const connectedUrls = getConnectedServerUrls()

  return (
    <div>
      <PageHeader
        title="OAuth Connections"
        description="Connect to MCP servers that require OAuth authentication"
        actions={
          <button
            onClick={() => setShowProviderModal(true)}
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Connect Provider
          </button>
        }
      />

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {connections.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <Shield className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No OAuth connections yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Connect to MCP servers like Sentry, Linear, or GitHub to use them
            through athreei.
          </p>
          <button
            onClick={() => setShowProviderModal(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Connect Provider
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {connections.map((connection) => (
            <div
              key={connection.serverUrl}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <Shield className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-medium capitalize text-gray-900">
                      {connection.provider}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {connection.serverUrl}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Connected{" "}
                      {new Date(connection.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDisconnect(connection.serverUrl)}
                  disabled={isDeletingProvider === connection.serverUrl}
                  className="inline-flex items-center gap-1.5 rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeletingProvider === connection.serverUrl && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {isDeletingProvider !== connection.serverUrl && (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Disconnect
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Provider Selection Modal */}
      {showProviderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Connect OAuth Provider
              </h2>
              <button
                onClick={() => setShowProviderModal(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-4 text-sm text-gray-500">
              Select a provider to connect, or enter a custom MCP server URL.
            </p>

            {/* Known Providers */}
            <div className="space-y-2">
              {KNOWN_PROVIDERS.map((provider) => {
                const isConnected = connectedUrls.has(provider.serverUrl)
                const isLoading = isConnecting === provider.id

                return (
                  <button
                    key={provider.id}
                    onClick={() =>
                      !isConnected &&
                      handleConnect(provider.serverUrl, provider.id)
                    }
                    disabled={isConnected || isLoading}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      isConnected
                        ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                      <Shield className="h-5 w-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {provider.name}
                        </span>
                        {isConnected && (
                          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
                            Connected
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {provider.description}
                      </p>
                    </div>
                    {isLoading && (
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Custom Server URL */}
            <div className="mt-4 border-t pt-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Custom MCP Server URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={customServerUrl}
                  onChange={(e) => setCustomServerUrl(e.target.value)}
                  placeholder="https://example.com/mcp/sse"
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                />
                <button
                  onClick={handleCustomConnect}
                  disabled={isConnecting === customServerUrl}
                  className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isConnecting === customServerUrl ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Connect"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
