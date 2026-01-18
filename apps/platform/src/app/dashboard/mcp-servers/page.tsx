"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/dashboard"
import { McpServerCardGrid, JsonImportModal } from "@/components/mcp"
import { useActiveOrganization } from "@/lib/auth-client"
import { Plus, Server, FileJson } from "lucide-react"
import type { ParsedMcpServer } from "@/lib/mcp-config-parser"
import { API_URL } from "@/constants"
import type { McpServer } from "@/types"
import { toFrontendFormat } from "@/utils"

export default function McpServersPage() {
  const router = useRouter()
  const { data: activeOrg, isPending: isOrgPending } = useActiveOrganization()
  const [servers, setServers] = useState<McpServer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showJsonImport, setShowJsonImport] = useState(false)

  const handleImport = (parsedServers: ParsedMcpServer[]) => {
    // Redirect to new page with first server pre-filled
    // Full implementation would batch-create all servers
    const server = parsedServers[0]
    if (!server) {
      setShowJsonImport(false)
      return
    }
    const params = new URLSearchParams({
      name: server.name,
      transport: server.transport,
      ...(server.command && { command: server.command }),
      ...(server.args?.length && { args: server.args.join(" ") }),
      ...(server.url && { url: server.url }),
    })
    router.push(`/dashboard/mcp-servers/new?${params.toString()}`)
    setShowJsonImport(false)
  }

  useEffect(() => {
    const loadServers = async () => {
      if (!activeOrg?.id) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(
          `${API_URL}/api/mcp-servers?organizationId=${activeOrg.id}`,
          { credentials: "include" }
        )

        if (!response.ok) {
          throw new Error("Failed to fetch MCP servers")
        }

        const data = await response.json()
        const transformedServers = (data.data || []).map(toFrontendFormat)
        setServers(transformedServers)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load servers")
      } finally {
        setIsLoading(false)
      }
    }

    if (!isOrgPending) {
      loadServers()
    }
  }, [activeOrg?.id, isOrgPending])

  if (isOrgPending || isLoading) {
    return (
      <div>
        <PageHeader
          title="My MCP Servers"
          description="Manage your custom MCP server configurations"
        />
        <LoadingState />
      </div>
    )
  }

  if (!activeOrg) {
    return (
      <div>
        <PageHeader
          title="My MCP Servers"
          description="Manage your custom MCP server configurations"
        />
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-sm text-yellow-700">
            Please select an organization to view MCP servers.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="My MCP Servers"
          description="Manage your custom MCP server configurations"
        />
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="My MCP Servers"
        description="Manage your custom MCP server configurations"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowJsonImport(true)}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FileJson className="h-4 w-4" />
              Import JSON
            </button>
            <Link
              href="/dashboard/mcp-servers/new"
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              New MCP Server
            </Link>
          </div>
        }
      />

      {servers.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No MCP servers yet"
          description="Create your first MCP server to connect AI apps to your tools."
          action={{
            label: "Create MCP server",
            href: "/dashboard/mcp-servers/new",
            icon: Plus,
          }}
        />
      ) : (
        <McpServerCardGrid
          servers={servers}
          baseHref="/dashboard/mcp-servers"
          showActions={true}
        />
      )}

      {showJsonImport && (
        <JsonImportModal
          onClose={() => setShowJsonImport(false)}
          onImport={handleImport}
        />
      )}
    </div>
  )
}
