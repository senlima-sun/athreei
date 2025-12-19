import { h } from "preact"
import type { AuditLogEntry } from "@athreei/shared"

export function AuditLogs() {
  // Placeholder - will be populated with actual data in later phases
  const logs: AuditLogEntry[] = []

  return (
    <div>
      <div style={{ marginBottom: "var(--spacing-xl)" }}>
        <h2>Audit Logs</h2>
        <p className="text-muted">
          Track all AI tool invocations and their outcomes for transparency and
          accountability.
        </p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: "var(--spacing-lg)" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "var(--spacing-md)" }}>
          Filters
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "var(--spacing-md)",
          }}
        >
          <div className="form-group">
            <label>Status</label>
            <select>
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="denied">Denied</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div className="form-group">
            <label>Tool</label>
            <select>
              <option value="">All Tools</option>
            </select>
          </div>
          <div className="form-group">
            <label>Origin</label>
            <input type="text" placeholder="Filter by origin..." />
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        {logs.length === 0 ? (
          <div className="text-center" style={{ padding: "var(--spacing-xl)" }}>
            <p className="text-muted">No audit logs available yet.</p>
            <p className="text-muted text-sm">
              Logs will appear here once AI tools are invoked through the
              extension.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Tool</th>
                  <th>Origin</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>
                      <code>{log.tool}</code>
                    </td>
                    <td className="text-muted">{log.origin || "N/A"}</td>
                    <td>
                      <span
                        className={`badge badge-${
                          log.status === "success"
                            ? "success"
                            : log.status === "denied"
                              ? "warning"
                              : "error"
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
