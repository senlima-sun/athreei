"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { McpServerCardGrid, McpServer, McpTransportType } from "@/components/mcp";
import { useActiveOrganization } from "@/lib/auth-client";
import { Plus, Loader2, Server } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// API response types
interface ApiMcpServer {
  id: string;
  name: string;
  description?: string | null;
  transport: "stdio" | "sse" | "streamable-http";
  status: "active" | "inactive" | "pending";
  command?: string | null;
  args?: string | null;
  url?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Transform API response to frontend format
function toFrontendFormat(server: ApiMcpServer): McpServer {
  return {
    id: server.id,
    name: server.name,
    description: server.description || undefined,
    transportType: (server.transport === "streamable-http" ? "http" : server.transport) as McpTransportType,
    status: server.status === "pending" ? "inactive" : server.status,
    command: server.command || undefined,
    args: server.args ? JSON.parse(server.args) : undefined,
    url: server.url || undefined,
    createdAt: new Date(server.createdAt),
    updatedAt: new Date(server.updatedAt),
  };
}

export default function McpServersPage() {
  const { data: activeOrg, isPending: isOrgPending } = useActiveOrganization();
  const [servers, setServers] = useState<McpServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadServers = async () => {
      if (!activeOrg?.id) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/mcp-servers?organizationId=${activeOrg.id}`,
          { credentials: "include" }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch MCP servers");
        }

        const data = await response.json();
        const transformedServers = (data.data || []).map(toFrontendFormat);
        setServers(transformedServers);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load servers");
      } finally {
        setIsLoading(false);
      }
    };

    if (!isOrgPending) {
      loadServers();
    }
  }, [activeOrg?.id, isOrgPending]);

  if (isOrgPending || isLoading) {
    return (
      <div>
        <PageHeader
          title="My MCP Servers"
          description="Manage your custom MCP server configurations"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
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
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="My MCP Servers"
          description="Manage your custom MCP server configurations"
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
    );
  }

  return (
    <div>
      <PageHeader
        title="My MCP Servers"
        description="Manage your custom MCP server configurations"
        actions={
          <Link
            href="/dashboard/mcp-servers/new"
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            New MCP Server
          </Link>
        }
      />

      {servers.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <Server className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No MCP servers yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Create your first MCP server to connect AI apps to your tools.
          </p>
          <Link
            href="/dashboard/mcp-servers/new"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Create MCP server
          </Link>
        </div>
      ) : (
        <McpServerCardGrid
          servers={servers}
          baseHref="/dashboard/mcp-servers"
          showActions={true}
        />
      )}
    </div>
  );
}
