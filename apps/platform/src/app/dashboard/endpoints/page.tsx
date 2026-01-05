"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/dashboard/page-header"
import { EndpointCard } from "@/components/endpoints/endpoint-card"
import { useActiveOrganization } from "@/lib/auth-client"
import { Server, Plus, Loader2 } from "lucide-react"

import { Endpoint } from "@/components/endpoints/endpoint-card"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { data: activeOrg } = useActiveOrganization()

  useEffect(() => {
    const fetchEndpoints = async () => {
      if (!activeOrg) {
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(
          `${API_URL}/api/endpoints?organizationId=${activeOrg.id}`,
          { credentials: "include" }
        )
        if (!response.ok) {
          throw new Error("Failed to fetch endpoints")
        }
        const data = await response.json()
        setEndpoints(data.endpoints || [])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load endpoints"
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchEndpoints()
  }, [activeOrg])

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Endpoints"
          description="Manage your MCP endpoints and API keys"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Endpoints"
          description="Manage your MCP endpoints and API keys"
        />
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 text-sm font-medium text-red-700 hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Endpoints"
        description="Manage your MCP endpoints and API keys"
        actions={
          <Link
            href="/dashboard/endpoints/new"
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            New endpoint
          </Link>
        }
      />

      {endpoints.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <Server className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No endpoints yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Create your first endpoint to connect AI apps to your MCP servers.
          </p>
          <Link
            href="/dashboard/endpoints/new"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Create endpoint
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {endpoints.map((endpoint) => (
            <EndpointCard key={endpoint.id} endpoint={endpoint} />
          ))}
        </div>
      )}
    </div>
  )
}
