import { useState, useEffect } from "preact/hooks"
import type { Permission, PermissionLevel } from "@athreei/shared"
import { api } from "../lib/api"
import { DataTable } from "../components/ui/DataTable"
import type { Column } from "../components/ui/DataTable"
import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Modal } from "../components/ui/Modal"
import { PermissionBadge } from "../components/ui/PermissionBadge"

interface PermissionsResponse {
  permissions: Permission[]
}

interface PermissionsProps {
  path?: string
}

export function Permissions(_props: PermissionsProps) {
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
      cell: (value) => <code>{value}</code>,
    },
    {
      accessor: "tool",
      header: "Tool",
      cell: (value) => <code>{value}</code>,
    },
    {
      accessor: "allowed",
      header: "Permission",
      cell: (value: PermissionLevel) => <PermissionBadge level={value} />,
    },
    {
      accessor: "createdAt",
      header: "Created",
      cell: (value) => (
        <span className="text-muted">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessor: "updatedAt",
      header: "Updated",
      cell: (value) => (
        <span className="text-muted">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessor: (row) => row.id,
      header: "Actions",
      sortable: false,
      cell: (_, row) => (
        <div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
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
      <div style={{ marginBottom: "var(--spacing-xl)" }}>
        <h2>Permissions Management</h2>
        <p className="text-muted">
          Control which AI applications can access specific tools and resources.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <Card style={{ marginBottom: "var(--spacing-lg)" }}>
          <div style={{ color: "var(--error)", textAlign: "center" }}>
            {error}
          </div>
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
      <Card style={{ marginTop: "var(--spacing-lg)" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "var(--spacing-md)" }}>
          Permission Levels
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
          <div>
            <PermissionBadge level="allowed" />
            <span className="text-muted text-sm" style={{ marginLeft: "var(--spacing-sm)" }}>
              - Always grant access without prompting
            </span>
          </div>
          <div>
            <PermissionBadge level="denied" />
            <span className="text-muted text-sm" style={{ marginLeft: "var(--spacing-sm)" }}>
              - Always deny access without prompting
            </span>
          </div>
          <div>
            <PermissionBadge level="ask" />
            <span className="text-muted text-sm" style={{ marginLeft: "var(--spacing-sm)" }}>
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
            <div style={{ marginBottom: "var(--spacing-md)" }}>
              <p className="text-muted text-sm" style={{ marginBottom: "var(--spacing-xs)" }}>
                Origin
              </p>
              <code>{editingPermission.origin}</code>
            </div>
            <div style={{ marginBottom: "var(--spacing-md)" }}>
              <p className="text-muted text-sm" style={{ marginBottom: "var(--spacing-xs)" }}>
                Tool
              </p>
              <code>{editingPermission.tool}</code>
            </div>
            <div className="form-group">
              <label>Permission Level</label>
              <select
                value={editLevel}
                onChange={(e) => setEditLevel(e.currentTarget.value as PermissionLevel)}
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
