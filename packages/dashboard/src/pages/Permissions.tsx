import { h } from "preact"
import type { Permission } from "@athreei/shared"

export function Permissions() {
  // Placeholder - will be populated with actual data in later phases
  const permissions: Permission[] = []

  return (
    <div>
      <div style={{ marginBottom: "var(--spacing-xl)" }}>
        <h2>Permissions Management</h2>
        <p className="text-muted">
          Control which AI applications can access specific tools and resources.
        </p>
      </div>

      {/* Actions */}
      <div style={{ marginBottom: "var(--spacing-lg)" }}>
        <button className="btn btn-primary">Add Permission</button>
      </div>

      {/* Permissions Table */}
      <div className="card">
        {permissions.length === 0 ? (
          <div className="text-center" style={{ padding: "var(--spacing-xl)" }}>
            <p className="text-muted">No permissions configured yet.</p>
            <p className="text-muted text-sm">
              When AI applications request access to tools, you can grant or deny
              permissions here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Origin</th>
                  <th>Tool</th>
                  <th>Permission</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((permission) => (
                  <tr key={permission.id}>
                    <td>
                      <code>{permission.origin}</code>
                    </td>
                    <td>
                      <code>{permission.tool}</code>
                    </td>
                    <td>
                      <span
                        className={`badge badge-${
                          permission.allowed === "allowed"
                            ? "success"
                            : permission.allowed === "denied"
                              ? "error"
                              : "info"
                        }`}
                      >
                        {permission.allowed}
                      </span>
                    </td>
                    <td className="text-muted">
                      {new Date(permission.createdAt).toLocaleDateString()}
                    </td>
                    <td className="text-muted">
                      {new Date(permission.updatedAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
                        <button className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                          Edit
                        </button>
                        <button className="btn btn-danger" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
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
      </div>

      {/* Permission Levels Info */}
      <div className="card" style={{ marginTop: "var(--spacing-lg)" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "var(--spacing-md)" }}>
          Permission Levels
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
          <div>
            <span className="badge badge-success">Allowed</span>
            <span className="text-muted text-sm" style={{ marginLeft: "var(--spacing-sm)" }}>
              - Always grant access without prompting
            </span>
          </div>
          <div>
            <span className="badge badge-error">Denied</span>
            <span className="text-muted text-sm" style={{ marginLeft: "var(--spacing-sm)" }}>
              - Always deny access without prompting
            </span>
          </div>
          <div>
            <span className="badge badge-info">Ask</span>
            <span className="text-muted text-sm" style={{ marginLeft: "var(--spacing-sm)" }}>
              - Prompt for permission each time
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
