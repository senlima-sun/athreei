"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { PageHeader, LoadingState, ErrorState } from "@/components/dashboard"
import { ConnectionConfig } from "@/components/endpoints/connection-config"
import { ApiKeyList, ApiKey } from "@/components/endpoints/api-key-list"
import { CreateApiKeyModal } from "@/components/endpoints/create-api-key-modal"
import { ApiKeyCreatedModal } from "@/components/endpoints/api-key-created-modal"
import { Plus, Loader2, Trash2, AlertTriangle, ArrowLeft } from "lucide-react"

interface Endpoint {
  id: string
  name: string
  slug: string
  status: "active" | "inactive"
  namespace?: {
    id: string
    name: string
  }
  createdAt: Date
}

export default function EndpointDetailPage() {
  const params = useParams()
  const router = useRouter()
  const endpointId = params.id as string

  const [endpoint, setEndpoint] = useState<Endpoint | null>(null)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showCreateKeyModal, setShowCreateKeyModal] = useState(false)
  const [showKeyCreatedModal, setShowKeyCreatedModal] = useState(false)
  const [createdKey, setCreatedKey] = useState<{
    key: string
    name: string
  } | null>(null)

  // Delete states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchEndpoint = useCallback(async () => {
    try {
      const response = await fetch(`/api/endpoints/${endpointId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch endpoint")
      }
      const data = await response.json()
      setEndpoint(data.endpoint)
      setApiKeys(data.apiKeys || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load endpoint")
    } finally {
      setIsLoading(false)
    }
  }, [endpointId])

  useEffect(() => {
    fetchEndpoint()
  }, [fetchEndpoint])

  const handleCreateApiKey = async (
    name: string
  ): Promise<{ key?: string; error?: string }> => {
    try {
      const response = await fetch(`/api/endpoints/${endpointId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      if (!response.ok) {
        const data = await response.json()
        return { error: data.error || "Failed to create API key" }
      }

      const data = await response.json()
      setCreatedKey({ key: data.key, name })
      setShowKeyCreatedModal(true)

      // Refresh the API keys list
      await fetchEndpoint()

      return { key: data.key }
    } catch (err) {
      return { error: "An unexpected error occurred" }
    }
  }

  const handleRevokeApiKey = async (keyId: string) => {
    try {
      const response = await fetch(
        `/api/endpoints/${endpointId}/api-keys/${keyId}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) {
        throw new Error("Failed to revoke API key")
      }

      // Refresh the API keys list
      await fetchEndpoint()
    } catch (err) {
      console.error("Failed to revoke API key:", err)
    }
  }

  const handleDeleteEndpoint = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/endpoints/${endpointId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete endpoint")
      }

      router.push("/dashboard/endpoints")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete endpoint")
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Endpoint Details" />
        <LoadingState />
      </div>
    )
  }

  if (error || !endpoint) {
    return (
      <div>
        <PageHeader title="Endpoint not found" />
        <div className="space-y-4">
          <ErrorState
            message={
              error ||
              "This endpoint doesn't exist or you don't have access to it."
            }
          />
          <div className="text-center">
            <Link
              href="/dashboard/endpoints"
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to endpoints
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={endpoint.name}
        description={
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                endpoint.status === "active"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {endpoint.status === "active" ? "Active" : "Inactive"}
            </span>
            {endpoint.namespace && (
              <span className="text-sm text-gray-500">
                in {endpoint.namespace.name}
              </span>
            )}
          </div>
        }
        actions={
          <Link
            href="/dashboard/endpoints"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        }
      />

      <div className="space-y-8">
        {/* Connection Configuration */}
        <ConnectionConfig
          endpointName={endpoint.name}
          endpointSlug={endpoint.slug}
        />

        {/* API Keys Section */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div>
              <h3 className="text-lg font-medium text-gray-900">API Keys</h3>
              <p className="mt-1 text-sm text-gray-500">
                Manage authentication keys for this endpoint.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateKeyModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              Create API key
            </button>
          </div>
          <div className="p-4">
            <ApiKeyList apiKeys={apiKeys} onRevoke={handleRevokeApiKey} />
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-lg border border-red-200 bg-white p-6">
          <h2 className="text-lg font-medium text-red-600">Danger zone</h2>
          <p className="mt-1 text-sm text-gray-500">
            Irreversible actions that affect this endpoint.
          </p>

          <div className="mt-6">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete endpoint
              </button>
            ) : (
              <div className="rounded-md border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Are you sure you want to delete this endpoint?
                    </p>
                    <p className="mt-1 text-sm text-red-600">
                      This action cannot be undone. All API keys will be revoked
                      and connections will stop working.
                    </p>
                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={handleDeleteEndpoint}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleting && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Yes, delete endpoint
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateApiKeyModal
        isOpen={showCreateKeyModal}
        onClose={() => setShowCreateKeyModal(false)}
        onCreate={handleCreateApiKey}
      />

      {createdKey && (
        <ApiKeyCreatedModal
          isOpen={showKeyCreatedModal}
          onClose={() => {
            setShowKeyCreatedModal(false)
            setCreatedKey(null)
          }}
          apiKey={createdKey.key}
          keyName={createdKey.name}
        />
      )}
    </div>
  )
}
