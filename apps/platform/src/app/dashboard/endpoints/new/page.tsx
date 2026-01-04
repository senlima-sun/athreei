"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PageHeader } from "@/components/dashboard/page-header"
import { Server, Loader2 } from "lucide-react"

interface Namespace {
  id: string
  name: string
}

export default function NewEndpointPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [namespaceId, setNamespaceId] = useState("")
  const [status, setStatus] = useState<"active" | "inactive">("active")
  const [namespaces, setNamespaces] = useState<Namespace[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingNamespaces, setIsLoadingNamespaces] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch available namespaces
  useEffect(() => {
    const fetchNamespaces = async () => {
      try {
        const response = await fetch("/api/namespaces")
        if (response.ok) {
          const data = await response.json()
          setNamespaces(data.namespaces || [])
        }
      } catch (err) {
        console.error("Failed to fetch namespaces:", err)
      } finally {
        setIsLoadingNamespaces(false)
      }
    }

    fetchNamespaces()
  }, [])

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value)
    // Only auto-generate if user hasn't manually edited slug
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value))
    }
  }

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/endpoints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim() || generateSlug(name.trim()),
          namespaceId: namespaceId || undefined,
          status,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create endpoint")
      }

      const data = await response.json()
      router.push(`/dashboard/endpoints/${data.endpoint.id}`)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Create endpoint"
        description="Set up a new MCP endpoint for AI apps to connect to"
      />

      <div className="mx-auto max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Endpoint icon */}
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100">
              <Server className="h-10 w-10 text-gray-400" />
            </div>
          </div>

          {/* Name field */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Endpoint name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="My MCP Endpoint"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>

          {/* Slug field */}
          <div>
            <label
              htmlFor="slug"
              className="block text-sm font-medium text-gray-700"
            >
              URL slug
            </label>
            <div className="mt-1 flex rounded-md">
              <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">
                athreei.com/mcp/
              </span>
              <input
                type="text"
                id="slug"
                value={slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                  )
                }
                placeholder="my-endpoint"
                className="block w-full rounded-none rounded-r-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This will be used in the connection URL and cannot be changed
              later.
            </p>
          </div>

          {/* Namespace field */}
          <div>
            <label
              htmlFor="namespace"
              className="block text-sm font-medium text-gray-700"
            >
              Namespace (optional)
            </label>
            <select
              id="namespace"
              value={namespaceId}
              onChange={(e) => setNamespaceId(e.target.value)}
              disabled={isLoadingNamespaces}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:bg-gray-50"
            >
              <option value="">No namespace</option>
              {namespaces.map((ns) => (
                <option key={ns.id} value={ns.id}>
                  {ns.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Group this endpoint under a namespace for better organization.
            </p>
          </div>

          {/* Status field */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <div className="mt-2 flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={status === "active"}
                  onChange={() => setStatus("active")}
                  className="h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-500"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="status"
                  value="inactive"
                  checked={status === "inactive"}
                  onChange={() => setStatus("inactive")}
                  className="h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-500"
                />
                <span className="text-sm text-gray-700">Inactive</span>
              </label>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/dashboard/endpoints"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create endpoint
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
