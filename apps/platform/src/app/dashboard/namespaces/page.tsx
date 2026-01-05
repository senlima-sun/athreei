"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/dashboard"
import { NamespaceCard, type Namespace } from "@/components/namespaces"
import { useActiveOrganization } from "@/lib/auth-client"
import { Boxes, Plus } from "lucide-react"
import { API_URL } from "@/constants"

export default function NamespacesPage() {
  const { data: activeOrg, isPending: isOrgPending } = useActiveOrganization()
  const [namespaces, setNamespaces] = useState<Namespace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadNamespaces = async () => {
      if (!activeOrg?.id) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `${API_URL}/api/namespaces?organizationId=${activeOrg.id}`,
          { credentials: "include" }
        )

        if (!response.ok) {
          throw new Error("Failed to fetch namespaces")
        }

        const data = await response.json()
        // Transform API response to match Namespace type
        const transformedNamespaces: Namespace[] = (data.namespaces || []).map(
          (ns: {
            id: string
            name: string
            description?: string | null
            serverCount: number
            createdAt: string
          }) => ({
            id: ns.id,
            name: ns.name,
            description: ns.description,
            serverCount: ns.serverCount,
            createdAt: new Date(ns.createdAt),
          })
        )
        setNamespaces(transformedNamespaces)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load namespaces"
        )
      } finally {
        setIsLoading(false)
      }
    }

    if (!isOrgPending) {
      loadNamespaces()
    }
  }, [activeOrg?.id, isOrgPending])

  if (isOrgPending || isLoading) {
    return (
      <div>
        <PageHeader
          title="Namespaces"
          description="Organize your MCP servers into environments"
        />
        <LoadingState />
      </div>
    )
  }

  if (!activeOrg) {
    return (
      <div>
        <PageHeader
          title="Namespaces"
          description="Organize your MCP servers into environments"
        />
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-sm text-yellow-700">
            Please select an organization to view namespaces.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Namespaces"
          description="Organize your MCP servers into environments"
        />
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Namespaces"
        description="Organize your MCP servers into environments"
        actions={
          <Link
            href="/dashboard/namespaces/new"
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            New namespace
          </Link>
        }
      />

      {namespaces.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No namespaces yet"
          description="Create your first namespace to organize your MCP servers into logical groups."
          action={{
            label: "Create namespace",
            href: "/dashboard/namespaces/new",
            icon: Plus,
          }}
        />
      ) : (
        <div className="space-y-4">
          {namespaces.map((namespace) => (
            <NamespaceCard key={namespace.id} namespace={namespace} />
          ))}
        </div>
      )}
    </div>
  )
}
