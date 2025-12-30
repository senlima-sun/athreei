"use client";

import Link from "next/link";
import { Server, Terminal, Radio, Globe, Settings, ExternalLink } from "lucide-react";
import { McpTransportType } from "./mcp-type-selector";

export type McpServerStatus = "active" | "inactive" | "error";

export interface McpServer {
  id: string;
  name: string;
  description?: string;
  transportType: McpTransportType;
  status: McpServerStatus;
  // STDIO config
  command?: string;
  args?: string[];
  // SSE/HTTP config
  url?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface McpServerCardProps {
  server: McpServer;
  href?: string;
  showActions?: boolean;
}

const transportIcons: Record<McpTransportType, React.ComponentType<{ className?: string }>> = {
  stdio: Terminal,
  sse: Radio,
  http: Globe,
};

const transportLabels: Record<McpTransportType, string> = {
  stdio: "STDIO",
  sse: "SSE",
  http: "HTTP",
};

const statusStyles: Record<McpServerStatus, { bg: string; text: string; dot: string }> = {
  active: {
    bg: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  inactive: {
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
  },
  error: {
    bg: "bg-red-100",
    text: "text-red-700",
    dot: "bg-red-500",
  },
};

export function McpServerCard({ server, href, showActions = true }: McpServerCardProps) {
  const TransportIcon = transportIcons[server.transportType];
  const statusStyle = statusStyles[server.status];

  const CardContent = () => (
    <>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
            <Server className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{server.name}</h3>
            {server.description && (
              <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">
                {server.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
            {server.status.charAt(0).toUpperCase() + server.status.slice(1)}
          </span>

          {/* Transport type badge */}
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            <TransportIcon className="h-3 w-3" />
            {transportLabels[server.transportType]}
          </span>
        </div>
      </div>

      {/* Connection info */}
      <div className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs font-mono text-gray-600">
        {server.transportType === "stdio" ? (
          <span>
            {server.command}
            {server.args && server.args.length > 0 && ` ${server.args.join(" ")}`}
          </span>
        ) : (
          <span>{server.url}</span>
        )}
      </div>

      {showActions && (
        <div className="mt-3 flex items-center justify-end gap-2">
          {href && (
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <Settings className="h-4 w-4" />
              Configure
            </Link>
          )}
        </div>
      )}
    </>
  );

  if (href && !showActions) {
    return (
      <Link
        href={href}
        className="block rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 hover:bg-gray-50"
      >
        <CardContent />
      </Link>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <CardContent />
    </div>
  );
}

interface McpServerCardGridProps {
  servers: McpServer[];
  baseHref?: string;
  showActions?: boolean;
}

export function McpServerCardGrid({
  servers,
  baseHref,
  showActions = true,
}: McpServerCardGridProps) {
  if (servers.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
        <Server className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No MCP servers</h3>
        <p className="mt-2 text-sm text-gray-500">
          Get started by adding your first MCP server.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {servers.map((server) => (
        <McpServerCard
          key={server.id}
          server={server}
          href={baseHref ? `${baseHref}/${server.id}` : undefined}
          showActions={showActions}
        />
      ))}
    </div>
  );
}
