"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { McpServerForm, McpServerFormData, McpServer } from "@/components/mcp";
import { Server, ArrowLeft, Trash2, AlertTriangle, Loader2 } from "lucide-react";

// Mock data - same as mcp-servers page
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

export default function EditMcpServerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const server = useMemo(() => {
    return mockUserServers.find((s) => s.id === id);
  }, [id]);

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

  const handleSubmit = async (data: McpServerFormData) => {
    // In a real implementation, this would call an API to update the server
    console.log("Updating MCP server:", id, data);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Redirect to the servers list
    router.push("/dashboard/mcp-servers");
  };

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);

    try {
      // In a real implementation, this would call an API to delete the server
      console.log("Deleting MCP server:", id);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      router.push("/dashboard/mcp-servers");
    } catch (err) {
      setError("Failed to delete MCP server");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

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

        {/* Danger zone */}
        <div className="rounded-lg border border-red-200 bg-white p-6">
          <h2 className="text-lg font-medium text-red-600">Danger Zone</h2>
          <p className="mt-1 text-sm text-gray-500">
            Permanently delete this MCP server configuration.
          </p>

          {error && (
            <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

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
