import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { LegacyCard as Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Spinner } from "../components/ui/Spinner"
import { EmptyState, ActivityIcon } from "../components/ui/EmptyState"
import { api, getAuditLogs, getSessions, getPermissions } from "../lib/api"
import type { AuditLogEntry } from "../lib/api"
import { cn } from "@/lib/utils"

/**
 * Trace analytics response from API
 */
interface TraceAnalytics {
  totalTraces: number
  successRate: number
  averageDurationMs: number
  activeMcpServers: number
  toolUsage: {
    toolName: string
    count: number
    percentage: number
  }[]
}

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

  // Trace analytics state
  const [traceAnalytics, setTraceAnalytics] = useState<TraceAnalytics | null>(
    null
  )
  const [analyticsLoading, setAnalyticsLoading] = useState(true)

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

  // Fetch trace analytics
  useEffect(() => {
    const fetchTraceAnalytics = async () => {
      try {
        setAnalyticsLoading(true)

        // Try to fetch from API
        const analytics = await api.get<TraceAnalytics>(
          "/api/traces/analytics?days=7"
        )
        setTraceAnalytics(analytics)
      } catch (error) {
        setTraceAnalytics(null)
      } finally {
        setAnalyticsLoading(false)
      }
    }

    fetchTraceAnalytics()
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

  // Format duration for display
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-2">Dashboard Overview</h2>
      <p className="text-muted-foreground">
        Welcome to the athreei privacy dashboard. This is your central hub for
        monitoring and managing AI interactions.
      </p>

      {/* Trace Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        <AnalyticsCard
          title="Total Traces"
          value={
            analyticsLoading
              ? "..."
              : traceAnalytics?.totalTraces.toLocaleString() || "0"
          }
          subtitle="Last 7 days"
          loading={analyticsLoading}
        />
        <AnalyticsCard
          title="Success Rate"
          value={
            analyticsLoading
              ? "..."
              : `${traceAnalytics?.successRate.toFixed(1) || "0"}%`
          }
          subtitle="Tool call success"
          loading={analyticsLoading}
          variant={
            traceAnalytics && traceAnalytics.successRate >= 95
              ? "success"
              : traceAnalytics && traceAnalytics.successRate >= 80
                ? "warning"
                : "error"
          }
        />
        <AnalyticsCard
          title="Avg Duration"
          value={
            analyticsLoading
              ? "..."
              : formatDuration(traceAnalytics?.averageDurationMs || 0)
          }
          subtitle="Per tool call"
          loading={analyticsLoading}
        />
        <AnalyticsCard
          title="Active MCPs"
          value={
            analyticsLoading
              ? "..."
              : String(traceAnalytics?.activeMcpServers || 0)
          }
          subtitle="Connected servers"
          loading={analyticsLoading}
        />
      </div>

      {/* Empty state when no analytics data */}
      {!analyticsLoading && !traceAnalytics && (
        <Card className="mt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ActivityIcon />
            <h3 className="mt-4 text-lg font-medium text-foreground">
              No analytics data yet
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Start using your MCP tools to see analytics
            </p>
          </div>
        </Card>
      )}

      {/* Tool Usage Chart */}
      {traceAnalytics && traceAnalytics.toolUsage.length > 0 && (
        <Card title="Tool Usage (Last 7 days)" className="mt-6">
          <div className="space-y-3">
            {traceAnalytics.toolUsage.slice(0, 5).map((tool) => (
              <ToolUsageBar
                key={tool.toolName}
                toolName={tool.toolName}
                count={tool.count}
                percentage={tool.percentage}
              />
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/traces")}
            >
              View all traces
            </Button>
          </div>
        </Card>
      )}

      {/* Legacy Statistics Grid */}
      <h3 className="text-lg font-semibold mt-10 mb-4">System Overview</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
          <div className="flex flex-col items-center justify-center p-8 gap-3">
            <Spinner size="lg" />
            <p className="text-muted-foreground text-sm">Loading activity...</p>
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
          <EmptyState
            icon={<ActivityIcon />}
            title="No recent activity"
            description="Activity will appear here once AI tools are invoked through the extension."
          />
        )}
      </Card>

      {/* Quick Actions */}
      <Card title="Quick Actions" className="mt-6">
        <div className="flex gap-4 flex-wrap">
          <Button variant="primary" onClick={() => navigate("/traces")}>
            View Traces
          </Button>
          <Button variant="secondary" onClick={() => navigate("/logs")}>
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

      {/* Browser MCP Showcase */}
      <Card title="Featured: Browser MCP" className="mt-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex-1">
            <p className="text-muted-foreground mb-4">
              Control your browser with AI using natural language. Navigate
              pages, click elements, fill forms, take screenshots, and automate
              workflows - all with full privacy controls and audit logging.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                11 Browser Tools
              </span>
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                Privacy-First
              </span>
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                Works with Claude
              </span>
            </div>
            <Button
              variant="primary"
              onClick={() => navigate("/showcase/browser")}
            >
              Learn More
            </Button>
          </div>
          <div className="hidden md:flex w-48 h-32 bg-muted rounded-lg items-center justify-center">
            <svg
              className="w-16 h-16 text-muted-foreground/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
              />
            </svg>
          </div>
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

interface AnalyticsCardProps {
  title: string
  value: string
  subtitle: string
  loading?: boolean
  variant?: "default" | "success" | "warning" | "error"
}

function AnalyticsCard({
  title,
  value,
  subtitle,
  loading,
  variant = "default",
}: AnalyticsCardProps) {
  const valueColor = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    error: "text-error",
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h4 className="text-sm mb-2 text-muted-foreground font-medium">
        {title}
      </h4>
      <p
        className={cn(
          "text-3xl font-semibold m-0",
          loading ? "text-muted-foreground" : valueColor[variant]
        )}
      >
        {value}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </div>
  )
}

interface ToolUsageBarProps {
  toolName: string
  count: number
  percentage: number
}

function ToolUsageBar({ toolName, count, percentage }: ToolUsageBarProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
          {toolName}
        </code>
        <span className="text-sm text-muted-foreground">
          {count.toLocaleString()} ({percentage.toFixed(0)}%)
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}
