import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { LegacyCard as Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { getAuditLogs, getSessions, getPermissions } from "../lib/api"
import type { AuditLogEntry } from "../lib/api"
import { cn } from "@/lib/utils"

export function Dashboard() {
  const navigate = useNavigate()
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
        const [auditLogs, activeSessions, permissions, blockedLogs] =
          await Promise.all([
            getAuditLogs({ limit: 5 }), // Last 5 entries for recent activity
            getSessions({ active: true }),
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
    return new Date(timestamp).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-success"
      case "denied":
        return "text-warning"
      case "error":
        return "text-error"
      default:
        return "text-muted-foreground"
    }
  }

  const getStatusBorderColor = (status: string) => {
    switch (status) {
      case "success":
        return "border-l-green-500"
      case "denied":
        return "border-l-yellow-500"
      case "error":
        return "border-l-red-500"
      default:
        return "border-l-muted-foreground"
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2">Dashboard Overview</h2>
      <p className="text-muted-foreground">
        Welcome to the athreei privacy dashboard. This is your central hub for
        monitoring and managing AI interactions.
      </p>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
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
      <Card title="Recent Activity" className="mt-8">
        {loading ? (
          <div className="text-center p-6">
            <p className="text-muted-foreground">Loading activity...</p>
          </div>
        ) : recentActivity.length > 0 ? (
          <div className="flex flex-col gap-4">
            {recentActivity.map((entry) => (
              <div
                key={entry.id}
                className={cn(
                  "flex justify-between items-center p-4 bg-secondary rounded-md border-l-4",
                  getStatusBorderColor(entry.status)
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{entry.tool}</span>
                    {entry.aiApp && (
                      <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                        {entry.aiApp}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {entry.origin}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={cn(
                      "text-xs font-semibold uppercase mb-1",
                      getStatusColor(entry.status)
                    )}
                  >
                    {entry.status}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimestamp(entry.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center">
            No recent activity to display.
          </p>
        )}
      </Card>

      {/* Quick Actions */}
      <Card title="Quick Actions" className="mt-6">
        <div className="flex gap-4 flex-wrap">
          <Button variant="primary" onClick={() => navigate("/logs")}>
            View Audit Logs
          </Button>
          <Button variant="secondary" onClick={() => navigate("/permissions")}>
            Manage Permissions
          </Button>
          <Button variant="secondary" onClick={() => navigate("/settings")}>
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
    <div className="bg-card border border-border rounded-lg p-6">
      <h4 className="text-sm mb-2 text-muted-foreground font-medium">
        {title}
      </h4>
      <p
        className={cn(
          "text-3xl font-semibold m-0",
          loading ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  )
}
