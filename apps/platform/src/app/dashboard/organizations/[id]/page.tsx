"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { PageHeader } from "@/components/dashboard/page-header"
import { useListOrganizations, organization } from "@/lib/auth-client"
import { Building2, Loader2, Trash2, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface Organization {
  id: string
  name: string
  slug?: string | null
  logo?: string | null
  createdAt: Date
}

export default function OrganizationSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const orgId = params.id as string

  const { data: orgList, isPending } = useListOrganizations()
  const currentOrg = (orgList as Organization[] | undefined)?.find(
    (o: Organization) => o.id === orgId
  )

  const [name, setName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (currentOrg) {
      setName(currentOrg.name)
    }
  }, [currentOrg])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      const result = await organization.update({
        organizationId: orgId,
        data: { name: name.trim() },
      })

      if (result.error) {
        setError(result.error.message || "Failed to update organization")
        return
      }

      setSuccess("Organization updated successfully")
    } catch (_err) {
      setError("An unexpected error occurred")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setError(null)
    setIsDeleting(true)

    try {
      const result = await organization.delete({
        organizationId: orgId,
      })

      if (result.error) {
        setError(result.error.message || "Failed to delete organization")
        setShowDeleteConfirm(false)
        return
      }

      router.push("/dashboard/organizations")
    } catch (_err) {
      setError("An unexpected error occurred")
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isPending) {
    return (
      <div>
        <PageHeader title="Organization Settings" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600" />
        </div>
      </div>
    )
  }

  if (!currentOrg) {
    return (
      <div>
        <PageHeader title="Organization not found" />
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            This organization doesn&apos;t exist or you don&apos;t have access
            to it.
          </p>
          <Link
            href="/dashboard/organizations"
            className="mt-4 inline-block text-sm font-medium text-gray-900 hover:underline"
          >
            Back to organizations
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={`${currentOrg.name} Settings`}
        description="Manage your organization settings"
      />

      <div className="space-y-8">
        {/* General settings */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-medium text-gray-900">General</h2>
          <p className="mt-1 text-sm text-gray-500">
            Update your organization&apos;s basic information.
          </p>

          <form onSubmit={handleSave} className="mt-6 space-y-4">
            {/* Organization icon */}
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100">
                <Building2 className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Organization logo
                </p>
                <p className="text-xs text-gray-500">Logo upload coming soon</p>
              </div>
            </div>

            {/* Name field */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Organization name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="mt-1 block w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>

            {/* Slug (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                URL slug
              </label>
              <p className="mt-1 text-sm text-gray-500">
                {currentOrg.slug || currentOrg.id}
              </p>
            </div>

            {/* Success/error messages */}
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </button>
          </form>
        </div>

        {/* Danger zone */}
        <div className="rounded-lg border border-red-200 bg-white p-6">
          <h2 className="text-lg font-medium text-red-600">Danger zone</h2>
          <p className="mt-1 text-sm text-gray-500">
            Irreversible actions that affect your organization.
          </p>

          <div className="mt-6">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete organization
              </button>
            ) : (
              <div className="rounded-md border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Are you sure you want to delete this organization?
                    </p>
                    <p className="mt-1 text-sm text-red-600">
                      This action cannot be undone. All members will lose
                      access.
                    </p>
                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleting && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Yes, delete organization
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
  )
}
