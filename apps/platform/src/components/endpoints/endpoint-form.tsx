"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Globe, Loader2 } from "lucide-react"

interface Namespace {
  id: string
  name: string
  slug: string
}

interface EndpointFormProps {
  namespaces: Namespace[]
  initialData?: {
    id: string
    name: string
    slug: string
    namespaceId: string | null
    status: "active" | "inactive"
  }
  onSubmit: (data: {
    name: string
    slug: string
    namespaceId: string | null
    status: "active" | "inactive"
  }) => Promise<{ error?: string }>
}

export function EndpointForm({
  namespaces,
  initialData,
  onSubmit,
}: EndpointFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initialData?.name || "")
  const [slug, setSlug] = useState(initialData?.slug || "")
  const [namespaceId, setNamespaceId] = useState(initialData?.namespaceId || "")
  const [status, setStatus] = useState<"active" | "inactive">(
    initialData?.status || "active"
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value)
    // Only auto-generate if user hasn't manually edited slug or is creating new
    if (!initialData && (!slug || slug === generateSlug(name))) {
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
      const result = await onSubmit({
        name: name.trim(),
        slug: slug.trim(),
        namespaceId: namespaceId || null,
        status,
      })

      if (result.error) {
        setError(result.error)
        return
      }

      router.push("/dashboard/endpoints")
    } catch (_err) {
      setError("An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Endpoint icon */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100">
            <Globe className="h-10 w-10 text-gray-400" />
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
            placeholder="My Endpoint"
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
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              placeholder="my-endpoint"
              required
              disabled={!!initialData}
              className="block w-full rounded-none rounded-r-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {initialData
              ? "Slug cannot be changed after creation."
              : "This will be used in the connection URL."}
          </p>
        </div>

        {/* Namespace selector */}
        <div>
          <label
            htmlFor="namespace"
            className="block text-sm font-medium text-gray-700"
          >
            Namespace
          </label>
          <select
            id="namespace"
            value={namespaceId}
            onChange={(e) => setNamespaceId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          >
            <option value="">No namespace (default)</option>
            {namespaces.map((ns) => (
              <option key={ns.id} value={ns.id}>
                {ns.name} ({ns.slug})
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Link this endpoint to a namespace to expose its tools.
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
            disabled={isSubmitting || !name.trim() || !slug.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {initialData ? "Save changes" : "Create endpoint"}
          </button>
        </div>
      </form>
    </div>
  )
}
