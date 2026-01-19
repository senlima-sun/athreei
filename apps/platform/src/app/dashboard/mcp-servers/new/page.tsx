"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PageHeader } from "@/components/dashboard/page-header"
import {
  McpServerForm,
  McpServerFormData,
  McpServer,
  McpTransportType,
} from "@/components/mcp"
import { useActiveOrganization } from "@/lib/auth-client"
import { Loader2 } from "lucide-react"
import { API_URL } from "@/constants"

function toApiFormat(data: McpServerFormData) {
  return {
    name: data.name,
    description: data.description || undefined,
    transport:
      data.transportType === "http" ? "streamable-http" : data.transportType,
    status: data.status,
    command: data.command || undefined,
    args: data.args?.length ? JSON.stringify(data.args) : undefined,
    url: data.url || undefined,
  }
}

export default function NewMcpServerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: activeOrg, isPending: isOrgPending } = useActiveOrganization()
  const [error, setError] = useState<string | null>(null)

  // Build initial server from query params (from JSON import)
  const initialServer: McpServer | undefined = searchParams.get("name")
    ? {
        id: "",
        name: searchParams.get("name") || "",
        description: searchParams.get("description") || undefined,
        transportType: (searchParams.get("transport") ||
          "stdio") as McpTransportType,
        status: "active",
        command: searchParams.get("command") || undefined,
        args: searchParams.get("args")?.split(" ").filter(Boolean) || undefined,
        url: searchParams.get("url") || undefined,
      }
    : undefined

  const handleSubmit = async (data: McpServerFormData) => {
    if (!activeOrg?.id) {
      setError("No organization selected")
      return
    }

    setError(null)

    try {
      const response = await fetch(
        `${API_URL}/api/mcp-servers?organizationId=${activeOrg.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(toApiFormat(data)),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch((e) => {
          console.error("Failed to parse error response:", e)
          return null
        })
        throw new Error(errorData?.message || "Failed to create MCP server")
      }

      router.push("/dashboard/mcp-servers")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create MCP server"
      )
      throw err // Re-throw so form shows error state
    }
  }

  if (isOrgPending) {
    return (
      <div>
        <PageHeader
          title="Create MCP Server"
          description="Add a new MCP server configuration"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (!activeOrg) {
    return (
      <div>
        <PageHeader
          title="Create MCP Server"
          description="Add a new MCP server configuration"
        />
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-sm text-yellow-700">
            Please select an organization to create an MCP server.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Create MCP Server"
        description="Add a new MCP server configuration"
      />

      {error && (
        <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <McpServerForm
            server={initialServer}
            onSubmit={handleSubmit}
            cancelHref="/dashboard/mcp-servers"
            submitLabel="Create MCP Server"
          />
        </div>
      </div>
    </div>
  )
}
