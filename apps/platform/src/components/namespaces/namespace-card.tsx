"use client";

import Link from "next/link";
import { Boxes, Server, Settings } from "lucide-react";

export interface Namespace {
  id: string;
  name: string;
  description?: string | null;
  serverCount: number;
  createdAt: Date;
}

interface NamespaceCardProps {
  namespace: Namespace;
}

export function NamespaceCard({ namespace }: NamespaceCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <Boxes className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{namespace.name}</h3>
            {namespace.description && (
              <p className="text-sm text-gray-500">{namespace.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600">
            <Server className="h-4 w-4" />
            <span>
              {namespace.serverCount} server
              {namespace.serverCount !== 1 ? "s" : ""}
            </span>
          </div>
          <Link
            href={`/dashboard/namespaces/${namespace.id}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Settings className="h-4 w-4" />
            Manage
          </Link>
        </div>
      </div>
    </div>
  );
}
