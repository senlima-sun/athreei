"use client"

import { useState, useEffect } from "react"
import { PageHeader, LoadingState } from "@/components/dashboard"
import { useSession } from "@/lib/auth-client"
import { useActiveOrganizationSafe } from "@/lib/auth-client"
import { fetchApi } from "@/lib/api"
import { isLocalMode } from "@/lib/mode"
import { Server, Activity, Users, ArrowRight, Loader2 } from "lucide-react"
import Link from "next/link"

interface QuickActionProps {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface DashboardStats {
  activeEndpoints: number
  mcpServers: number
  totalTraces: number
  teamMembers: number
}

interface ActivityItem {
  id: string
  type: "trace" | "mcp_server_added" | "mcp_server_removed" | "member_joined"
  description: string
  timestamp: string
  metadata?: Record<string, unknown>
}

function QuickAction({
  title,
  description,
  href,
  icon: Icon,
}: QuickActionProps) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 hover:bg-gray-50"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 group-hover:bg-gray-200">
        <Icon className="h-5 w-5 text-gray-600" />
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <ArrowRight className="h-5 w-5 text-gray-400 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  )
}

export default function DashboardPage() {
  const { data: session, isPending: isSessionPending } = useSession()
  const { data: activeOrg, isPending: isOrgPending } =
    useActiveOrganizationSafe()

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!isLocalMode() && !activeOrg?.id) {
        return
      }

      setIsLoadingStats(true)
      setStatsError(null)

      try {
        const [statsResponse, activityResponse] = await Promise.all([
          fetchApi<DashboardStats>("/api/dashboard/stats", {
            organizationId: activeOrg?.id,
          }),
          fetchApi<{ activity: ActivityItem[] }>("/api/dashboard/activity", {
            organizationId: activeOrg?.id,
          }),
        ])
        setStats(statsResponse)
        setActivity(activityResponse.activity || [])
      } catch (err) {
        setStatsError(
          err instanceof Error ? err.message : "Failed to load stats"
        )
      } finally {
        setIsLoadingStats(false)
      }
    }

    if (!isOrgPending) {
      fetchStats()
    }
  }, [activeOrg?.id, isOrgPending])

  if (isSessionPending) {
    return <LoadingState />
  }

  const userName = session?.user?.name || "there"

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${userName}`}
        description="Here's an overview of your athreei workspace"
      />

      {/* Quick actions */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Quick actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            title="View MCPs"
            description="Manage your Model Context Protocol servers"
            href="/dashboard/mcps"
            icon={Server}
          />
          <QuickAction
            title="View Traces"
            description="Monitor activity and debug requests"
            href="/dashboard/traces"
            icon={Activity}
          />
          <QuickAction
            title="Manage Team"
            description="Invite members and manage permissions"
            href="/dashboard/organizations"
            icon={Users}
          />
        </div>
      </section>

      {/* Stats */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Overview</h2>
        {isLoadingStats ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : statsError ? (
          <p className="py-4 text-sm text-red-600">{statsError}</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Active Endpoints"
                value={stats?.activeEndpoints ?? null}
              />
              <StatCard label="MCP Servers" value={stats?.mcpServers ?? null} />
              <StatCard
                label="Total Traces"
                value={stats?.totalTraces ?? null}
              />
              <StatCard
                label="Team Members"
                value={stats?.teamMembers ?? null}
              />
            </div>
            {!stats && (
              <p className="mt-3 text-sm text-gray-500">
                Statistics will appear here once you start using athreei.
              </p>
            )}
          </>
        )}
      </section>

      {/* Recent Activity */}
      {activity.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Recent Activity
          </h2>
          <div className="rounded-lg border border-gray-200 bg-white">
            <ul className="divide-y divide-gray-100">
              {activity.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <ActivityIcon type={item.type} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">
                      {item.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatActivityTime(item.timestamp)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: string | number | null
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      {value === null ? (
        <p className="mt-1 text-lg text-gray-400">—</p>
      ) : (
        <p className="mt-1 text-2xl font-semibold text-gray-900">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
      )}
    </div>
  )
}

function ActivityIcon({ type }: { type: ActivityItem["type"] }) {
  const iconClass = "h-4 w-4"
  const bgClass = "flex h-8 w-8 items-center justify-center rounded-full"

  switch (type) {
    case "trace":
      return (
        <div className={`${bgClass} bg-blue-100`}>
          <Activity className={`${iconClass} text-blue-600`} />
        </div>
      )
    case "mcp_server_added":
    case "mcp_server_removed":
      return (
        <div className={`${bgClass} bg-purple-100`}>
          <Server className={`${iconClass} text-purple-600`} />
        </div>
      )
    case "member_joined":
      return (
        <div className={`${bgClass} bg-green-100`}>
          <Users className={`${iconClass} text-green-600`} />
        </div>
      )
    default:
      return (
        <div className={`${bgClass} bg-gray-100`}>
          <Activity className={`${iconClass} text-gray-600`} />
        </div>
      )
  }
}

function formatActivityTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
