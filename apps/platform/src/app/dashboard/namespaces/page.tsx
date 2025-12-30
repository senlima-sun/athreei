"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { NamespaceCard, type Namespace } from "@/components/namespaces";
import { Boxes, Plus } from "lucide-react";

// TODO: Replace with actual API calls when backend is ready
const mockNamespaces: Namespace[] = [
  {
    id: "1",
    name: "Personal Tools",
    description: "My personal development environment",
    serverCount: 3,
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    name: "Work Dev",
    description: "Development servers for work projects",
    serverCount: 5,
    createdAt: new Date("2024-02-01"),
  },
  {
    id: "3",
    name: "Project X",
    description: null,
    serverCount: 2,
    createdAt: new Date("2024-03-10"),
  },
];

export default function NamespacesPage() {
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    // TODO: Replace with actual API call
    const loadNamespaces = async () => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));
      setNamespaces(mockNamespaces);
      setIsPending(false);
    };

    loadNamespaces();
  }, []);

  if (isPending) {
    return (
      <div>
        <PageHeader
          title="Namespaces"
          description="Organize your MCP servers into environments"
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
        title="Namespaces"
        description="Organize your MCP servers into environments"
        actions={
          <Link
            href="/dashboard/namespaces/new"
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            New namespace
          </Link>
        }
      />

      {namespaces.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <Boxes className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No namespaces yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Create your first namespace to organize your MCP servers into
            logical groups.
          </p>
          <Link
            href="/dashboard/namespaces/new"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Create namespace
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {namespaces.map((namespace) => (
            <NamespaceCard key={namespace.id} namespace={namespace} />
          ))}
        </div>
      )}
    </div>
  );
}
