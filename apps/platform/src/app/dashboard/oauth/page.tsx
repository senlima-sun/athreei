"use client"

import { useState, useEffect } from "react"
import {
  PageHeader,
  LoadingState,
  ErrorState,
} from "@/components/dashboard"
import { Plus, Loader2, Trash2, Shield } from "lucide-react"
import { API_URL } from "@/constants/api"

interface OAuthConnection {
  provider: string
  serverUrl: string
  createdAt: string
}

export default function OAuthPage() {
  const [connections, setConnections] = useState<OAuthConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDeletingProvider, setIsDeletingProvider] = useState<string | null>(
    null
  )

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

  const handleConnect = async () => {
    setIsConnecting(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/api/oauth/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })
      if (!response.ok) {
        throw new Error("Failed to initiate OAuth connection")
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
      setIsConnecting(false)
    }
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

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="OAuth Connections"
          description="Manage your OAuth provider connections"
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
          description="Manage your OAuth provider connections"
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

  return (
    <div>
      <PageHeader
        title="OAuth Connections"
        description="Manage your OAuth provider connections"
        actions={
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isConnecting && <Loader2 className="h-4 w-4 animate-spin" />}
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
            Connect your OAuth providers to manage authentication.
          </p>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isConnecting && <Loader2 className="h-4 w-4 animate-spin" />}
            {!isConnecting && <Plus className="h-4 w-4" />}
            Connect OAuth Provider
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
                    <h3 className="font-medium text-gray-900">
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
    </div>
  )
}
