"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/dashboard/page-header"
import {
  Search,
  Filter,
  Server,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Terminal,
  Radio,
} from "lucide-react"
import { API_URL } from "@/constants"

interface RegistryServer {
  slug: string
  name: string
  description: string
  publisher: string
  iconUrl?: string
  transport: "stdio" | "sse"
  categories: string[]
  verified: boolean
}

type FilterType = "all" | "stdio" | "sse"

const transportIcons = {
  stdio: Terminal,
  sse: Radio,
}

export default function RegistryPage() {
  const [servers, setServers] = useState<RegistryServer[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [transportFilter, setTransportFilter] = useState<FilterType>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  useEffect(() => {
    async function loadRegistry() {
      try {
        const params = new URLSearchParams()
        if (searchQuery) {
          params.set("search", searchQuery)
        }

        const response = await fetch(
          `${API_URL}/api/registry?${params.toString()}`
        )

        if (!response.ok) {
          throw new Error("Failed to fetch registry")
        }

        const data = await response.json()
        setServers(data.servers)
        setCategories(data.categories || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load registry")
      } finally {
        setIsLoading(false)
      }
    }

    loadRegistry()
  }, [searchQuery])

  const filteredServers = useMemo(() => {
    return servers.filter((server) => {
      // Filter by transport type
      if (transportFilter !== "all" && server.transport !== transportFilter) {
        return false
      }

      // Filter by category
      if (
        categoryFilter !== "all" &&
        !server.categories.includes(categoryFilter)
      ) {
        return false
      }

      return true
    })
  }, [servers, transportFilter, categoryFilter])

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="MCP Registry"
          description="Browse and discover available MCP servers from the public registry"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="MCP Registry"
          description="Browse and discover available MCP servers from the public registry"
        />
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="MCP Registry"
        description="Browse and discover available MCP servers from the public registry"
      />

      {/* Search and filter bar */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative max-w-md flex-1">
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <div className="flex rounded-md border border-gray-200">
              {(["all", "stdio", "sse"] as FilterType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setTransportFilter(type)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors first:rounded-l-md last:rounded-r-md ${
                    transportFilter === type
                      ? "bg-gray-900 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {type === "all" ? "All" : type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Category filter */}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category
                    .split("-")
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(" ")}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-gray-500">
        {filteredServers.length} server
        {filteredServers.length !== 1 ? "s" : ""} found
      </p>

      {/* Server list */}
      {filteredServers.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <Server className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No servers found
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {searchQuery ||
            transportFilter !== "all" ||
            categoryFilter !== "all"
              ? "Try adjusting your search or filter criteria."
              : "The registry is empty."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredServers.map((server) => {
            const TransportIcon = transportIcons[server.transport]
            return (
              <div
                key={server.slug}
                className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                    {server.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={server.iconUrl}
                        alt={server.name}
                        className="h-7 w-7 object-contain"
                      />
                    ) : (
                      <Server className="h-6 w-6 text-gray-500" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">
                        {server.name}
                      </h3>
                      {server.verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">
                      by {server.publisher}
                    </p>
                    <p className="mt-2 text-sm text-gray-600">
                      {server.description}
                    </p>
                    <div className="mt-3 flex items-center gap-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                        <TransportIcon className="h-3.5 w-3.5" />
                        {server.transport.toUpperCase()}
                      </span>
                      {server.categories.slice(0, 2).map((category) => (
                        <span
                          key={category}
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action */}
                  <Link
                    href={`/dashboard/registry/${server.slug}`}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Details
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
