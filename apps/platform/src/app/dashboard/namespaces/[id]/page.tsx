"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  NamespaceServerList,
  ServerPickerModal,
  type NamespaceServer,
  type McpServer,
} from "@/components/namespaces";
import {
  Boxes,
  Plus,
  Settings,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

// TODO: Replace with actual types from API
interface NamespaceDetails {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  servers: NamespaceServer[];
}

// Mock data - TODO: Replace with actual API calls
const mockNamespaceDetails: Record<string, NamespaceDetails> = {
  "1": {
    id: "1",
    name: "Personal Tools",
    description: "My personal development environment",
    createdAt: new Date("2024-01-15"),
    servers: [
      {
        id: "ns-1",
        serverId: "srv-1",
        name: "File Browser",
        description: "Browse and manage files",
        status: "online",
        enabled: true,
      },
      {
        id: "ns-2",
        serverId: "srv-2",
        name: "Code Search",
        description: "Search through code repositories",
        status: "online",
        enabled: true,
      },
      {
        id: "ns-3",
        serverId: "srv-3",
        name: "Terminal",
        description: "Execute shell commands",
        status: "offline",
        enabled: false,
      },
    ],
  },
  "2": {
    id: "2",
    name: "Work Dev",
    description: "Development servers for work projects",
    createdAt: new Date("2024-02-01"),
    servers: [
      {
        id: "ns-4",
        serverId: "srv-4",
        name: "Database Explorer",
        description: "Query and manage databases",
        status: "online",
        enabled: true,
      },
    ],
  },
  "3": {
    id: "3",
    name: "Project X",
    description: null,
    createdAt: new Date("2024-03-10"),
    servers: [],
  },
};

const mockAvailableServers: McpServer[] = [
  {
    id: "srv-5",
    name: "API Tester",
    description: "Test REST APIs",
    status: "online",
  },
  {
    id: "srv-6",
    name: "Log Viewer",
    description: "View and search logs",
    status: "online",
  },
  {
    id: "srv-7",
    name: "Docker Manager",
    description: "Manage Docker containers",
    status: "offline",
  },
];

export default function NamespaceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const namespaceId = params.id as string;

  const [namespace, setNamespace] = useState<NamespaceDetails | null>(null);
  const [isPending, setIsPending] = useState(true);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Replace with actual API call
    const loadNamespace = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const data = mockNamespaceDetails[namespaceId];
      setNamespace(data || null);
      setIsPending(false);
    };

    loadNamespace();
  }, [namespaceId]);

  const handleAddServer = async (serverId: string) => {
    if (!namespace) return;

    // TODO: Replace with actual API call
    console.log("Adding server:", serverId);
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Find the server in available servers
    const server = mockAvailableServers.find((s) => s.id === serverId);
    if (server) {
      const newServer: NamespaceServer = {
        id: `ns-${Date.now()}`,
        serverId: server.id,
        name: server.name,
        description: server.description,
        status: server.status,
        enabled: true,
      };
      setNamespace({
        ...namespace,
        servers: [...namespace.servers, newServer],
      });
    }
  };

  const handleRemoveServer = async (serverId: string) => {
    if (!namespace) return;

    // TODO: Replace with actual API call
    console.log("Removing server:", serverId);
    await new Promise((resolve) => setTimeout(resolve, 300));

    setNamespace({
      ...namespace,
      servers: namespace.servers.filter((s) => s.serverId !== serverId),
    });
  };

  const handleToggleServer = async (serverId: string, enabled: boolean) => {
    if (!namespace) return;

    // TODO: Replace with actual API call
    console.log("Toggling server:", serverId, enabled);
    await new Promise((resolve) => setTimeout(resolve, 300));

    setNamespace({
      ...namespace,
      servers: namespace.servers.map((s) =>
        s.serverId === serverId ? { ...s, enabled } : s
      ),
    });
  };

  const handleDeleteNamespace = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      console.log("Deleting namespace:", namespaceId);
      await new Promise((resolve) => setTimeout(resolve, 500));

      router.push("/dashboard/namespaces");
    } catch (err) {
      setError("Failed to delete namespace");
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isPending) {
    return (
      <div>
        <PageHeader title="Namespace Details" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600" />
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

  const existingServerIds = namespace.servers.map((s) => s.serverId);

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

      <div className="space-y-8">
        {/* Servers list */}
        <div>
          <h2 className="mb-4 text-lg font-medium text-gray-900">
            Servers ({namespace.servers.length})
          </h2>
          <NamespaceServerList
            servers={namespace.servers}
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
                Created
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {namespace.createdAt.toLocaleDateString()}
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
            {error && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
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
          </div>
        </div>
      </div>

      {/* Server picker modal */}
      <ServerPickerModal
        isOpen={showPickerModal}
        onClose={() => setShowPickerModal(false)}
        onSelect={handleAddServer}
        availableServers={mockAvailableServers}
        excludeServerIds={existingServerIds}
      />
    </div>
  );
}
