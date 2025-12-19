import { h } from "preact"
import { useState, useEffect } from "preact/hooks"
import { route } from "preact-router"
import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { getAuditLogs, getSessions, getPermissions } from "../lib/api"
import type { AuditLogEntry } from "../lib/api"

export function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRequests: 0,
    activeSessions: 0,
    permissions: 0,
    blockedRequests: 0,
  })
  const [recentActivity, setRecentActivity] = useState<AuditLogEntry[]>([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)

        // Fetch all data in parallel
        const [auditLogs, activeSessions, allSessions, permissions, blockedLogs] =
          await Promise.all([
            getAuditLogs({ limit: 5 }), // Last 5 entries for recent activity
            getSessions({ active: true }),
            getSessions(),
            getPermissions(),
            getAuditLogs({ status: "denied" }),
          ])

        setStats({
          totalRequests: auditLogs.pagination.total,
          activeSessions: activeSessions.count,
          permissions: permissions.count,
          blockedRequests: blockedLogs.pagination.total,
        })

        setRecentActivity(auditLogs.data)
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = Date.now()
    const diff = now - timestamp

    // Less than 1 minute
    if (diff < 60000) return "Just now"

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000)
      return `${minutes}m ago`
    }

    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      return `${hours}h ago`
    }

    // More than 24 hours - show date
    return date.toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "var(--success)"
      case "denied":
        return "var(--warning)"
      case "error":
        return "var(--error)"
      default:
        return "var(--text-tertiary)"
    }
  }

  return (
    <div>
      <h2>Dashboard Overview</h2>
      <p style={{ color: "var(--text-tertiary)", marginTop: "var(--spacing-sm)" }}>
        Welcome to the athreei privacy dashboard. This is your central hub for
        monitoring and managing AI interactions.
      </p>

      {/* Statistics Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "var(--spacing-lg)",
          marginTop: "var(--spacing-xl)",
        }}
      >
        <StatCard
          title="Total Requests"
          value={loading ? "..." : String(stats.totalRequests)}
          loading={loading}
        />
        <StatCard
          title="Active Sessions"
          value={loading ? "..." : String(stats.activeSessions)}
          loading={loading}
        />
        <StatCard
          title="Permissions"
          value={loading ? "..." : String(stats.permissions)}
          loading={loading}
        />
        <StatCard
          title="Blocked Requests"
          value={loading ? "..." : String(stats.blockedRequests)}
          loading={loading}
        />
      </div>

      {/* Recent Activity */}
      <Card title="Recent Activity" style={{ marginTop: "var(--spacing-xl)" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "var(--spacing-lg)" }}>
            <p style={{ color: "var(--text-tertiary)" }}>Loading activity...</p>
          </div>
        ) : recentActivity.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
            {recentActivity.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "var(--spacing-md)",
                  backgroundColor: "var(--bg-tertiary)",
                  borderRadius: "var(--radius-md)",
                  borderLeft: `3px solid ${getStatusColor(entry.status)}`,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--spacing-sm)",
                      marginBottom: "var(--spacing-xs)",
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                      {entry.tool}
                    </span>
                    {entry.aiApp && (
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-tertiary)",
                          padding: "2px 6px",
                          backgroundColor: "var(--bg-secondary)",
                          borderRadius: "var(--radius-sm)",
                        }}
                      >
                        {entry.aiApp}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {entry.origin}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: getStatusColor(entry.status),
                      fontWeight: 600,
                      textTransform: "uppercase",
                      marginBottom: "var(--spacing-xs)",
                    }}
                  >
                    {entry.status}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {formatTimestamp(entry.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--text-tertiary)", textAlign: "center" }}>
            No recent activity to display.
          </p>
        )}
      </Card>

      {/* Quick Actions */}
      <Card title="Quick Actions" style={{ marginTop: "var(--spacing-lg)" }}>
        <div style={{ display: "flex", gap: "var(--spacing-md)", flexWrap: "wrap" }}>
          <Button variant="primary" onClick={() => route("/logs")}>
            View Audit Logs
          </Button>
          <Button variant="secondary" onClick={() => route("/permissions")}>
            Manage Permissions
          </Button>
          <Button variant="secondary" onClick={() => route("/settings")}>
            Configure Settings
          </Button>
        </div>
      </Card>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string
  loading?: boolean
}

function StatCard({ title, value, loading }: StatCardProps) {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--radius-md)",
        padding: "var(--spacing-lg)",
      }}
    >
      <h4
        style={{
          fontSize: "0.875rem",
          marginBottom: "var(--spacing-sm)",
          color: "var(--text-tertiary)",
          fontWeight: 500,
        }}
      >
        {title}
      </h4>
      <p
        style={{
          fontSize: "2rem",
          fontWeight: "600",
          margin: 0,
          color: loading ? "var(--text-tertiary)" : "var(--text-primary)",
        }}
      >
        {value}
      </p>
    </div>
  )
}
