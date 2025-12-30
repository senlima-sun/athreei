"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { McpServerCardGrid, McpServer } from "@/components/mcp";
import { Plus } from "lucide-react";

// Mock data for user's custom MCP servers
// In a real implementation, this would come from an API
const mockUserServers: McpServer[] = [
  {
    id: "user-1",
    name: "Local Development Server",
    description: "My local MCP server for development and testing",
    transportType: "stdio",
    status: "active",
    command: "node",
    args: ["/path/to/my-mcp-server/index.js"],
  },
  {
    id: "user-2",
    name: "Production API Gateway",
    description: "Production MCP server connecting to our internal APIs",
    transportType: "http",
    status: "active",
    url: "https://mcp.mycompany.com/api",
  },
  {
    id: "user-3",
    name: "Staging Environment",
    description: "Staging server for testing new features",
    transportType: "sse",
    status: "inactive",
    url: "https://staging-mcp.mycompany.com/sse",
  },
];

export default function McpServersPage() {
  // In a real implementation, this would use a query hook
  const [servers] = useState<McpServer[]>(mockUserServers);
  const [isLoading] = useState(false);

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="My MCP Servers"
          description="Manage your custom MCP server configurations"
        />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600" />
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

      <McpServerCardGrid
        servers={servers}
        baseHref="/dashboard/mcp-servers"
        showActions={true}
      />

      {servers.length === 0 && (
        <div className="mt-4">
          <Link
            href="/dashboard/mcp-servers/new"
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Create your first MCP server
          </Link>
        </div>
      )}
    </div>
  );
}
