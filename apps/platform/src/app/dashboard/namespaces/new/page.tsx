"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PageHeader, LoadingState } from "@/components/dashboard"
import { NamespaceForm } from "@/components/namespaces"
import { useActiveOrganization } from "@/lib/auth-client"
import { API_URL } from "@/constants"

export default function NewNamespacePage() {
  const router = useRouter()
  const { data: activeOrg, isPending: isOrgPending } = useActiveOrganization()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: { name: string; description?: string }) => {
    if (!activeOrg?.id) {
      setError("No organization selected")
      return
    }

    setError(null)

    try {
      const response = await fetch(
        `${API_URL}/api/namespaces?organizationId=${activeOrg.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: data.name,
            description: data.description || undefined,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch((e) => {
          console.error("Failed to parse error response:", e)
          return null
        })
        throw new Error(errorData?.message || "Failed to create namespace")
      }

      // Navigate to namespaces list on success
      router.push("/dashboard/namespaces")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create namespace"
      )
      throw err // Re-throw so form shows error state
    }
  }

  if (isOrgPending) {
    return (
      <div>
        <PageHeader
          title="Create namespace"
          description="Set up a new namespace to organize your MCP servers"
        />
        <LoadingState message="Loading organization..." />
      </div>
    )
  }

  if (!activeOrg) {
    return (
      <div>
        <PageHeader
          title="Create namespace"
          description="Set up a new namespace to organize your MCP servers"
        />
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-sm text-yellow-700">
            Please select an organization to create a namespace.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Create namespace"
        description="Set up a new namespace to organize your MCP servers"
      />

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <NamespaceForm onSubmit={handleSubmit} submitLabel="Create namespace" />
    </div>
  )
}
