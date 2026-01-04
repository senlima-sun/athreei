"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { McpServerForm, McpServerFormData, McpServer, McpTransportType, ToolList } from "@/components/mcp";
import { useActiveOrganization } from "@/lib/auth-client";
import { Server, ArrowLeft, Trash2, AlertTriangle, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// API response type
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

// Transform frontend form data to API format
function toApiFormat(data: McpServerFormData) {
  return {
    name: data.name,
    description: data.description || undefined,
    transport: data.transportType === "http" ? "streamable-http" : data.transportType,
    status: data.status,
    command: data.command || undefined,
    args: data.args?.length ? JSON.stringify(data.args) : undefined,
    url: data.url || undefined,
  };
}

export default function EditMcpServerPage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params.id as string;
  const { data: activeOrg, isPending: isOrgPending } = useActiveOrganization();

  const [server, setServer] = useState<McpServer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load server data
  const loadServer = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/mcp-servers/${serverId}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        if (response.status === 404) {
          setServer(null);
          return;
        }
        throw new Error("Failed to fetch MCP server");
      }

      const data = await response.json();
      setServer(toFrontendFormat(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load server");
    } finally {
      setIsLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    if (!isOrgPending) {
      loadServer();
    }
  }, [isOrgPending, loadServer]);

  const handleSubmit = async (data: McpServerFormData) => {
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/mcp-servers/${serverId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(toApiFormat(data)),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to update MCP server");
      }

      router.push("/dashboard/mcp-servers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update MCP server");
      throw err;
    }
  };

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);

    try {
      const response = await fetch(
        `${API_URL}/api/mcp-servers/${serverId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to delete MCP server");
      }

      router.push("/dashboard/mcp-servers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete MCP server");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isOrgPending || isLoading) {
    return (
      <div>
        <PageHeader title="Edit MCP Server" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!activeOrg) {
    return (
      <div>
        <PageHeader title="Edit MCP Server" />
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-sm text-yellow-700">
            Please select an organization to view MCP server details.
          </p>
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div>
        <PageHeader title="Server not found" />
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <Server className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-500">
            This MCP server doesn&apos;t exist or you don&apos;t have access to it.
          </p>
          <Link
            href="/dashboard/mcp-servers"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to MCP servers
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Edit ${server.name}`}
        description="Update your MCP server configuration"
        actions={
          <Link
            href="/dashboard/mcp-servers"
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to servers
          </Link>
        }
      />

      {error && (
        <div className="mx-auto mb-6 max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="mx-auto max-w-2xl space-y-6">
        {/* Edit form */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <McpServerForm
            server={server}
            onSubmit={handleSubmit}
            cancelHref="/dashboard/mcp-servers"
            submitLabel="Save Changes"
          />
        </div>

        {/* Tools section */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Tools</h2>
          <ToolList serverId={server.id} />
        </div>

        {/* Danger zone */}
        <div className="rounded-lg border border-red-200 bg-white p-6">
          <h2 className="text-lg font-medium text-red-600">Danger Zone</h2>
          <p className="mt-1 text-sm text-gray-500">
            Permanently delete this MCP server configuration.
          </p>

          <div className="mt-6">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete MCP server
              </button>
            ) : (
              <div className="rounded-md border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Are you sure you want to delete this MCP server?
                    </p>
                    <p className="mt-1 text-sm text-red-600">
                      This action cannot be undone. Any connected AI apps will lose
                      access to this server.
                    </p>
                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                        Yes, delete server
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
