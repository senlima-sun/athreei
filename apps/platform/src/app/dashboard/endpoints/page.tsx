"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/dashboard"
import { EndpointCard } from "@/components/endpoints/endpoint-card"
import { useActiveOrganization } from "@/lib/auth-client"
import { Server, Plus } from "lucide-react"
import { API_URL } from "@/constants"

import { Endpoint } from "@/components/endpoints/endpoint-card"

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
        <LoadingState />
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
        <ErrorState message={error} onRetry={() => window.location.reload()} />
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
        <EmptyState
          icon={Server}
          title="No endpoints yet"
          description="Create your first endpoint to connect AI apps to your MCP servers."
          action={{
            label: "Create endpoint",
            href: "/dashboard/endpoints/new",
            icon: Plus,
          }}
        />
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
