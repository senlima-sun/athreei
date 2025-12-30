"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/page-header";
import { NamespaceCard, type Namespace } from "@/components/namespaces";
import { useActiveOrganization } from "@/lib/auth-client";
import { Boxes, Plus, Loader2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function NamespacesPage() {
  const { data: activeOrg, isPending: isOrgPending } = useActiveOrganization();
  const [namespaces, setNamespaces] = useState<Namespace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNamespaces = async () => {
      if (!activeOrg?.id) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/namespaces?organizationId=${activeOrg.id}`,
          { credentials: "include" }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch namespaces");
        }

        const data = await response.json();
        // Transform API response to match Namespace type
        const transformedNamespaces: Namespace[] = (data.namespaces || []).map(
          (ns: {
            id: string;
            name: string;
            description?: string | null;
            serverCount: number;
            createdAt: string;
          }) => ({
            id: ns.id,
            name: ns.name,
            description: ns.description,
            serverCount: ns.serverCount,
            createdAt: new Date(ns.createdAt),
          })
        );
        setNamespaces(transformedNamespaces);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load namespaces"
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (!isOrgPending) {
      loadNamespaces();
    }
  }, [activeOrg?.id, isOrgPending]);

  if (isOrgPending || isLoading) {
    return (
      <div>
        <PageHeader
          title="Namespaces"
          description="Organize your MCP servers into environments"
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
          title="Namespaces"
          description="Organize your MCP servers into environments"
        />
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-sm text-yellow-700">
            Please select an organization to view namespaces.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Namespaces"
          description="Organize your MCP servers into environments"
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
