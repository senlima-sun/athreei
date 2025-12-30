"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  NamespaceServerList,
  ServerPickerModal,
  type NamespaceServer,
  type McpServer,
} from "@/components/namespaces";
import { useActiveOrganization } from "@/lib/auth-client";
import {
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface NamespaceDetails {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  isDefault: boolean;
  createdAt: string;
  serverCount: number;
}

interface ApiServer {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  transport: string;
  mappingId: string;
  addedAt: string;
}

export default function NamespaceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const namespaceId = params.id as string;
  const { data: activeOrg, isPending: isOrgPending } = useActiveOrganization();

  const [namespace, setNamespace] = useState<NamespaceDetails | null>(null);
  const [servers, setServers] = useState<NamespaceServer[]>([]);
  const [availableServers, setAvailableServers] = useState<McpServer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load namespace details
  const loadNamespace = useCallback(async () => {
    if (!activeOrg?.id) return;

    try {
      const response = await fetch(
        `${API_URL}/api/namespaces/${namespaceId}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        if (response.status === 404) {
          setNamespace(null);
          return;
        }
        throw new Error("Failed to fetch namespace");
      }

      const data = await response.json();
      setNamespace(data.namespace);

      // Transform servers to match NamespaceServer type
      const transformedServers: NamespaceServer[] = (data.servers || []).map(
        (server: ApiServer) => ({
          id: server.mappingId,
          serverId: server.id,
          name: server.name,
          description: server.description,
          status: server.status === "active" ? "online" : "offline",
          enabled: true, // Default to enabled
        })
      );
      setServers(transformedServers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load namespace");
    } finally {
      setIsLoading(false);
    }
  }, [activeOrg?.id, namespaceId]);

  // Load available servers (not in namespace)
  const loadAvailableServers = useCallback(async () => {
    if (!activeOrg?.id) return;

    try {
      const response = await fetch(
        `${API_URL}/api/mcp-servers?organizationId=${activeOrg.id}`,
        { credentials: "include" }
      );

      if (!response.ok) return;

      const data = await response.json();
      const allServers: McpServer[] = (data.data || []).map(
        (server: { id: string; name: string; description?: string | null; status: string }) => ({
          id: server.id,
          name: server.name,
          description: server.description,
          status: server.status === "active" ? "online" : "offline",
        })
      );
      setAvailableServers(allServers);
    } catch {
      // Silently fail - available servers are not critical
    }
  }, [activeOrg?.id]);

  useEffect(() => {
    if (!isOrgPending && activeOrg?.id) {
      loadNamespace();
      loadAvailableServers();
    }
  }, [isOrgPending, activeOrg?.id, loadNamespace, loadAvailableServers]);

  const handleAddServer = async (serverId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/namespaces/${namespaceId}/servers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ serverId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to add server");
      }

      const data = await response.json();

      // Add the new server to the list
      const newServer: NamespaceServer = {
        id: data.mapping.id,
        serverId: data.server.id,
        name: data.server.name,
        description: data.server.description,
        status: data.server.status === "active" ? "online" : "offline",
        enabled: true,
      };

      setServers((prev) => [...prev, newServer]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add server");
    }
  };

  const handleRemoveServer = async (serverId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/namespaces/${namespaceId}/servers/${serverId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove server");
      }

      setServers((prev) => prev.filter((s) => s.serverId !== serverId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove server");
    }
  };

  const handleToggleServer = async (serverId: string, enabled: boolean) => {
    // For now, just update local state since toggle isn't persisted to backend
    // TODO: Add PATCH endpoint for updating server mapping status
    setServers((prev) =>
      prev.map((s) => (s.serverId === serverId ? { ...s, enabled } : s))
    );
  };

  const handleDeleteNamespace = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/namespaces/${namespaceId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to delete namespace");
      }

      router.push("/dashboard/namespaces");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete namespace");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isOrgPending || isLoading) {
    return (
      <div>
        <PageHeader title="Namespace Details" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (!activeOrg) {
    return (
      <div>
        <PageHeader title="Namespace Details" />
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-sm text-yellow-700">
            Please select an organization to view namespace details.
          </p>
        </div>
      </div>
    );
  }

  if (!namespace) {
    return (
      <div>
        <PageHeader title="Namespace not found" />
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            This namespace doesn&apos;t exist or you don&apos;t have access to
            it.
          </p>
          <Link
            href="/dashboard/namespaces"
            className="mt-4 inline-block text-sm font-medium text-gray-900 hover:underline"
          >
            Back to namespaces
          </Link>
        </div>
      </div>
    );
  }

  const existingServerIds = servers.map((s) => s.serverId);
  // Filter available servers to exclude ones already in the namespace
  const serversToShow = availableServers.filter(
    (s) => !existingServerIds.includes(s.id)
  );

  return (
    <div>
      <PageHeader
        title={namespace.name}
        description={namespace.description || "Manage servers in this namespace"}
        actions={
          <button
            type="button"
            onClick={() => setShowPickerModal(true)}
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Add server
          </button>
        }
      />

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 font-medium hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-8">
        {/* Servers list */}
        <div>
          <h2 className="mb-4 text-lg font-medium text-gray-900">
            Servers ({servers.length})
          </h2>
          <NamespaceServerList
            servers={servers}
            onRemove={handleRemoveServer}
            onToggleEnabled={handleToggleServer}
          />
        </div>

        {/* Namespace settings */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-medium text-gray-900">Settings</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage this namespace&apos;s settings.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <p className="mt-1 text-sm text-gray-900">{namespace.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Slug
              </label>
              <p className="mt-1 text-sm text-gray-500 font-mono">
                {namespace.slug}
              </p>
            </div>

            {namespace.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {namespace.description}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Default namespace
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {namespace.isDefault ? "Yes" : "No"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Created
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(namespace.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-lg border border-red-200 bg-white p-6">
          <h2 className="text-lg font-medium text-red-600">Danger zone</h2>
          <p className="mt-1 text-sm text-gray-500">
            Irreversible actions that affect this namespace.
          </p>

          <div className="mt-6">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={namespace.isDefault}
                className="inline-flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete namespace
              </button>
            ) : (
              <div className="rounded-md border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Are you sure you want to delete this namespace?
                    </p>
                    <p className="mt-1 text-sm text-red-600">
                      This action cannot be undone. All server associations will
                      be removed.
                    </p>
                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={handleDeleteNamespace}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleting && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Yes, delete namespace
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
            {namespace.isDefault && (
              <p className="mt-2 text-sm text-gray-500">
                Cannot delete the default namespace. Set another namespace as
                default first.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Server picker modal */}
      <ServerPickerModal
        isOpen={showPickerModal}
        onClose={() => setShowPickerModal(false)}
        onSelect={handleAddServer}
        availableServers={serversToShow}
        excludeServerIds={existingServerIds}
      />
    </div>
  );
}
