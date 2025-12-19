import { h } from "preact"
import type { Session } from "@athreei/shared"

export function Sessions() {
  // Placeholder - will be populated with actual data in later phases
  const sessions: Session[] = []
  const activeSessions = sessions.filter((s) => !s.endedAt)
  const pastSessions = sessions.filter((s) => s.endedAt)

  return (
    <div>
      <div style={{ marginBottom: "var(--spacing-xl)" }}>
        <h2>Session Management</h2>
        <p className="text-muted">
          Monitor active and past AI interaction sessions across your browsing
          contexts.
        </p>
      </div>

      {/* Active Sessions */}
      <div className="card" style={{ marginBottom: "var(--spacing-lg)" }}>
        <h3 style={{ fontSize: "1.125rem", marginBottom: "var(--spacing-md)" }}>
          Active Sessions ({activeSessions.length})
        </h3>
        {activeSessions.length === 0 ? (
          <p className="text-muted">No active sessions at the moment.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Origin</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <code>{session.id.substring(0, 8)}...</code>
                    </td>
                    <td>
                      <code>{session.origin}</code>
                    </td>
                    <td className="text-muted">
                      {new Date(session.startedAt).toLocaleString()}
                    </td>
                    <td className="text-muted">
                      {formatDuration(Date.now() - session.startedAt)}
                    </td>
                    <td>
                      <button className="btn btn-danger" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}>
                        End Session
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Past Sessions */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--spacing-md)" }}>
          <h3 style={{ fontSize: "1.125rem", margin: 0 }}>
            Past Sessions ({pastSessions.length})
          </h3>
          <button className="btn btn-secondary">Clear All</button>
        </div>
        {pastSessions.length === 0 ? (
          <p className="text-muted">No past sessions to display.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Session ID</th>
                  <th>Origin</th>
                  <th>Started</th>
                  <th>Ended</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pastSessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <code>{session.id.substring(0, 8)}...</code>
                    </td>
                    <td>
                      <code>{session.origin}</code>
                    </td>
                    <td className="text-muted">
                      {new Date(session.startedAt).toLocaleString()}
                    </td>
                    <td className="text-muted">
                      {session.endedAt
                        ? new Date(session.endedAt).toLocaleString()
                        : "N/A"}
                    </td>
                    <td className="text-muted">
                      {session.endedAt
                        ? formatDuration(session.endedAt - session.startedAt)
                        : "N/A"}
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

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}
