import { useState, useEffect } from "react"
import type { Permission, PermissionLevel } from "@athreei/shared"
import { api } from "../lib/api"
import { DataTable } from "../components/ui/DataTable"
import type { Column } from "../components/ui/DataTable"
import { LegacyCard as Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Modal } from "../components/ui/Modal"
import { PermissionBadge } from "../components/ui/PermissionBadge"

interface PermissionsResponse {
  permissions: Permission[]
}

export function Permissions() {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editLevel, setEditLevel] = useState<PermissionLevel>("ask")
  const [isSaving, setIsSaving] = useState(false)

  // Fetch permissions from API
  const fetchPermissions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.get<PermissionsResponse>("/api/permissions")
      setPermissions(response.permissions)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch permissions")
    } finally {
      setLoading(false)
    }
  }

  // Fetch permissions on mount
  useEffect(() => {
    fetchPermissions()
  }, [])

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

      await api.put(`/api/permissions/${editingPermission.id}`, {
        allowed: editLevel,
      })

      // Refresh permissions list
      await fetchPermissions()
      setIsEditModalOpen(false)
      setEditingPermission(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update permission")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle delete permission
  const handleDelete = async (permission: Permission) => {
    if (!confirm(`Delete permission for ${permission.origin} → ${permission.tool}?`)) {
      return
    }

    try {
      setError(null)
      await api.delete(`/api/permissions/${permission.id}`)

      // Refresh permissions list
      await fetchPermissions()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete permission")
    }
  }

  // Define table columns
  const columns: Column<Permission>[] = [
    {
      accessor: "origin",
      header: "Origin",
      cell: (value) => <code className="text-sm">{value as string}</code>,
    },
    {
      accessor: "tool",
      header: "Tool",
      cell: (value) => <code className="text-sm">{value as string}</code>,
    },
    {
      accessor: "allowed",
      header: "Permission",
      cell: (value) => <PermissionBadge level={value as PermissionLevel} />,
    },
    {
      accessor: "createdAt",
      header: "Created",
      cell: (value) => (
        <span className="text-muted-foreground">
          {new Date(value as number).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessor: "updatedAt",
      header: "Updated",
      cell: (value) => (
        <span className="text-muted-foreground">
          {new Date(value as number).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessor: (row) => row.id,
      header: "Actions",
      sortable: false,
      cell: (_, row) => (
        <div className="flex gap-1">
          <Button variant="secondary" size="sm" onClick={() => handleEdit(row)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(row)}>
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Permissions Management</h2>
        <p className="text-muted-foreground">
          Control which AI applications can access specific tools and resources.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <Card className="mb-6">
          <div className="text-error text-center">{error}</div>
        </Card>
      )}

      {/* Permissions Table */}
      <Card>
        <DataTable
          columns={columns}
          data={permissions}
          loading={loading}
          emptyMessage="No permissions configured yet. When AI applications request access to tools, you can grant or deny permissions here."
        />
      </Card>

      {/* Permission Levels Info */}
      <Card className="mt-6">
        <h3 className="text-base font-medium mb-4">Permission Levels</h3>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <PermissionBadge level="allowed" />
            <span className="text-muted-foreground text-sm">
              - Always grant access without prompting
            </span>
          </div>
          <div className="flex items-center gap-2">
            <PermissionBadge level="denied" />
            <span className="text-muted-foreground text-sm">
              - Always deny access without prompting
            </span>
          </div>
          <div className="flex items-center gap-2">
            <PermissionBadge level="ask" />
            <span className="text-muted-foreground text-sm">
              - Prompt for permission each time
            </span>
          </div>
        </div>
      </Card>

      {/* Edit Permission Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Permission"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveEdit} loading={isSaving}>
              Save
            </Button>
          </>
        }
      >
        {editingPermission && (
          <div>
            <div className="mb-4">
              <p className="text-muted-foreground text-sm mb-1">Origin</p>
              <code>{editingPermission.origin}</code>
            </div>
            <div className="mb-4">
              <p className="text-muted-foreground text-sm mb-1">Tool</p>
              <code>{editingPermission.tool}</code>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium">
                Permission Level
              </label>
              <select
                value={editLevel}
                onChange={(e) => setEditLevel(e.target.value as PermissionLevel)}
                className="w-full p-2 bg-secondary border border-border rounded-md text-foreground"
              >
                <option value="allowed">Allowed</option>
                <option value="denied">Denied</option>
                <option value="ask">Ask</option>
              </select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
