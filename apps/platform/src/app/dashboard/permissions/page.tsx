"use client"

import { useState, useEffect } from "react"
import {
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/dashboard"
import { isLocalMode } from "@/lib/mode"
import { fetchApi } from "@/lib/api"
import { useActiveOrganizationSafe } from "@/lib/auth-client"
import { Shield, Pencil, Trash2 } from "lucide-react"
import type { Permission, PermissionLevel, PermissionsResponse } from "@/types"

export default function PermissionsPage() {
  const { data: activeOrg, isPending: isOrgPending } =
    useActiveOrganizationSafe()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter state
  const [originFilter, setOriginFilter] = useState("")
  const [toolFilter, setToolFilter] = useState("")

  // Modal state
  const [editingPermission, setEditingPermission] = useState<Permission | null>(
    null
  )
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editLevel, setEditLevel] = useState<PermissionLevel>("ask")
  const [isSaving, setIsSaving] = useState(false)

  // Fetch permissions
  const fetchPermissions = async () => {
    if (!isLocalMode() && (!activeOrg || isOrgPending)) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchApi<PermissionsResponse>("/api/permissions", {
        organizationId: activeOrg?.id,
      })
      setPermissions(response.data || [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch permissions"
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPermissions()
  }, [activeOrg?.id, isOrgPending])

  // Handle edit permission
  const handleEdit = (permission: Permission) => {
    setEditingPermission(permission)
    setEditLevel(permission.allowed)
    setIsEditModalOpen(true)
  }

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editingPermission) return

    try {
      setIsSaving(true)
      setError(null)

      await fetchApi(`/api/permissions/${editingPermission.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowed: editLevel }),
        organizationId: activeOrg?.id,
      })

      await fetchPermissions()
      setIsEditModalOpen(false)
      setEditingPermission(null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update permission"
      )
    } finally {
      setIsSaving(false)
    }
  }

  // Handle delete permission
  const handleDelete = async (permission: Permission) => {
    if (
      !confirm(
        `Delete permission for ${permission.origin} -> ${permission.tool}?`
      )
    ) {
      return
    }

    try {
      setError(null)
      await fetchApi(`/api/permissions/${permission.id}`, {
        method: "DELETE",
        organizationId: activeOrg?.id,
      })
      await fetchPermissions()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete permission"
      )
    }
  }

  // Filter permissions
  const filteredPermissions = permissions.filter((p) => {
    const matchesOrigin =
      !originFilter ||
      p.origin.toLowerCase().includes(originFilter.toLowerCase())
    const matchesTool =
      !toolFilter || p.tool.toLowerCase().includes(toolFilter.toLowerCase())
    return matchesOrigin && matchesTool
  })

  // Loading state
  if (isOrgPending || isLoading) {
    return (
      <div>
        <PageHeader
          title="Permissions"
          description="Control which AI applications can access specific tools"
        />
        <LoadingState />
      </div>
    )
  }

  // No organization selected (cloud mode)
  if (!isLocalMode() && !activeOrg) {
    return (
      <div>
        <PageHeader
          title="Permissions"
          description="Control which AI applications can access specific tools"
        />
        <EmptyState
          icon={Shield}
          title="No organization selected"
          description="Select an organization to view its permissions."
        />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div>
        <PageHeader
          title="Permissions"
          description="Control which AI applications can access specific tools"
        />
        <ErrorState message={error} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Permissions"
        description="Control which AI applications can access specific tools"
      />

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <input
          type="text"
          placeholder="Filter by origin..."
          value={originFilter}
          onChange={(e) => setOriginFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Filter by tool..."
          value={toolFilter}
          onChange={(e) => setToolFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Permissions Table */}
      {filteredPermissions.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="No permissions configured"
          description="When AI applications request access to tools, you can grant or deny permissions here."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Origin
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tool
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Permission
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Updated
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredPermissions.map((permission) => (
                <tr key={permission.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <code className="rounded bg-gray-100 px-1 py-0.5 text-sm">
                      {permission.origin}
                    </code>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <code className="rounded bg-gray-100 px-1 py-0.5 text-sm">
                      {permission.tool}
                    </code>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <PermissionBadge level={permission.allowed} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {new Date(permission.createdAt).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {new Date(permission.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(permission)}
                        className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(permission)}
                        className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-200"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Permission Levels Info */}
      <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-medium text-gray-900">
          Permission Levels
        </h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <PermissionBadge level="allowed" />
            <span className="text-sm text-gray-500">
              - Always grant access without prompting
            </span>
          </div>
          <div className="flex items-center gap-2">
            <PermissionBadge level="denied" />
            <span className="text-sm text-gray-500">
              - Always deny access without prompting
            </span>
          </div>
          <div className="flex items-center gap-2">
            <PermissionBadge level="ask" />
            <span className="text-sm text-gray-500">
              - Prompt for permission each time
            </span>
          </div>
        </div>
      </div>

      {/* Edit Permission Modal */}
      {isEditModalOpen && editingPermission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold">Edit Permission</h2>

            <div className="mb-4">
              <p className="mb-1 text-sm text-gray-500">Origin</p>
              <code className="rounded bg-gray-100 px-2 py-1 text-sm">
                {editingPermission.origin}
              </code>
            </div>

            <div className="mb-4">
              <p className="mb-1 text-sm text-gray-500">Tool</p>
              <code className="rounded bg-gray-100 px-2 py-1 text-sm">
                {editingPermission.tool}
              </code>
            </div>

            <div className="mb-6">
              <label className="mb-1.5 block text-sm font-medium text-gray-900">
                Permission Level
              </label>
              <select
                value={editLevel}
                onChange={(e) =>
                  setEditLevel(e.target.value as PermissionLevel)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="allowed">Allowed</option>
                <option value="denied">Denied</option>
                <option value="ask">Ask</option>
              </select>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Badge component for displaying permission levels
 */
function PermissionBadge({ level }: { level: PermissionLevel }) {
  const styles: Record<PermissionLevel, string> = {
    allowed: "bg-green-100 text-green-800",
    denied: "bg-red-100 text-red-800",
    ask: "bg-yellow-100 text-yellow-800",
  }

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[level]}`}
    >
      {level}
    </span>
  )
}
