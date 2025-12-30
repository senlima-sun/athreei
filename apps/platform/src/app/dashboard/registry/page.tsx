"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { McpServerCard, McpServer } from "@/components/mcp";
import { Search, Filter, Server, ExternalLink } from "lucide-react";

// Mock data for the public registry
// In a real implementation, this would come from an API
const mockRegistryServers: McpServer[] = [
  {
    id: "1",
    name: "Browser Tools",
    description:
      "Expose browser capabilities to AI apps via Native Messaging. Navigate, click, screenshot, and more.",
    transportType: "stdio",
    status: "active",
    command: "npx",
    args: ["@athreei/mcp-server"],
  },
  {
    id: "2",
    name: "GitHub Integration",
    description:
      "Access GitHub repositories, issues, pull requests, and code search directly from your AI assistant.",
    transportType: "http",
    status: "active",
    url: "https://mcp.github.io/api",
  },
  {
    id: "3",
    name: "Slack Connector",
    description:
      "Send messages, read channels, and manage Slack workspaces through MCP.",
    transportType: "sse",
    status: "active",
    url: "https://slack-mcp.example.com/sse",
  },
  {
    id: "4",
    name: "Database Query",
    description:
      "Execute SQL queries against PostgreSQL, MySQL, and SQLite databases securely.",
    transportType: "stdio",
    status: "active",
    command: "npx",
    args: ["@mcp/database-server", "--type", "postgres"],
  },
  {
    id: "5",
    name: "File System",
    description:
      "Safe file system operations with configurable access controls and sandboxing.",
    transportType: "stdio",
    status: "active",
    command: "npx",
    args: ["@mcp/filesystem-server"],
  },
  {
    id: "6",
    name: "Web Search",
    description:
      "Search the web using multiple providers including Google, Bing, and DuckDuckGo.",
    transportType: "http",
    status: "active",
    url: "https://search-mcp.example.com/api",
  },
];

type FilterType = "all" | "stdio" | "sse" | "http";

export default function RegistryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredServers = useMemo(() => {
    return mockRegistryServers.filter((server) => {
      // Filter by transport type
      if (filter !== "all" && server.transportType !== filter) {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          server.name.toLowerCase().includes(query) ||
          server.description?.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [searchQuery, filter]);

  return (
    <div>
      <PageHeader
        title="MCP Registry"
        description="Browse and discover available MCP servers from the public registry"
      />

      {/* Search and filter bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search MCP servers..."
            className="w-full rounded-md border border-gray-300 py-2 pl-10 pr-4 text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <div className="flex rounded-md border border-gray-200">
            {(["all", "stdio", "sse", "http"] as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
                  filter === type
                    ? "bg-gray-900 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {type === "all" ? "All" : type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-gray-500">
        {filteredServers.length} server{filteredServers.length !== 1 ? "s" : ""} found
      </p>

      {/* Server list */}
      {filteredServers.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <Server className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No servers found
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {searchQuery || filter !== "all"
              ? "Try adjusting your search or filter criteria."
              : "The registry is empty."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredServers.map((server) => (
            <div
              key={server.id}
              className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300"
            >
              <McpServerCard
                server={server}
                showActions={false}
              />
              <div className="mt-3 flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <Link
                  href={`/dashboard/registry/${server.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
