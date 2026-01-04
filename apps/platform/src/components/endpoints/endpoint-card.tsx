"use client"

import Link from "next/link"
import { Globe, Settings, ExternalLink } from "lucide-react"

export interface Endpoint {
  id: string
  name: string
  slug: string
  namespaceId: string | null
  namespaceName?: string
  status: "active" | "inactive"
  createdAt: Date
}

interface EndpointCardProps {
  endpoint: Endpoint
}

export function EndpointCard({ endpoint }: EndpointCardProps) {
  const connectionUrl = `https://athreei.com/mcp/${endpoint.slug}/sse`

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
            <Globe className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900">{endpoint.name}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  endpoint.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {endpoint.status === "active" ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="text-sm text-gray-500">{connectionUrl}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {endpoint.namespaceName && (
            <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
              {endpoint.namespaceName}
            </span>
          )}
          <Link
            href={`/dashboard/endpoints/${endpoint.id}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            <Settings className="h-4 w-4" />
            Configure
          </Link>
          <a
            href={connectionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" />
            Test
          </a>
        </div>
      </div>
    </div>
  )
}
