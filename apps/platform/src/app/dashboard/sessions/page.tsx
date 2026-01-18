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
import { Monitor, Smartphone, Laptop, Square, Check } from "lucide-react"
import type { Session } from "@/types"

export default function SessionsPage() {
  const { data: activeOrg, isPending: isOrgPending } =
    useActiveOrganizationSafe()
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch sessions - API returns array directly
  const fetchSessions = async () => {
    if (!isLocalMode() && (!activeOrg || isOrgPending)) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchApi<Session[]>("/api/sessions", {
        organizationId: activeOrg?.id,
      })
      setSessions(response || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sessions")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [activeOrg?.id, isOrgPending])

  // Handle revoke session
  const handleRevokeSession = async (session: Session) => {
    if (session.current) {
      setError("Cannot revoke your current session. Please use sign out.")
      return
    }

    const deviceInfo = [session.device, session.browser]
      .filter(Boolean)
      .join(" / ")
    if (!confirm(`Revoke session${deviceInfo ? ` on ${deviceInfo}` : ""}?`)) {
      return
    }

    try {
      setError(null)
      await fetchApi(`/api/sessions/${session.id}`, {
        method: "DELETE",
        organizationId: activeOrg?.id,
      })
      await fetchSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke session")
    }
  }

  // Get device icon
  const DeviceIcon = ({ device }: { device?: string }) => {
    if (device === "iPhone" || device === "iPad" || device === "Android") {
      return <Smartphone className="h-4 w-4" />
    }
    if (device === "Mac" || device === "Windows" || device === "Linux") {
      return <Laptop className="h-4 w-4" />
    }
    return <Monitor className="h-4 w-4" />
  }

  // Loading state
  if (isOrgPending || isLoading) {
    return (
      <div>
        <PageHeader
          title="Sessions"
          description="Manage your active login sessions across devices"
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
          title="Sessions"
          description="Manage your active login sessions across devices"
        />
        <EmptyState
          icon={Monitor}
          title="No organization selected"
          description="Select an organization to view its sessions."
        />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div>
        <PageHeader
          title="Sessions"
          description="Manage your active login sessions across devices"
        />
        <ErrorState message={error} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Sessions"
        description="Manage your active login sessions across devices"
      />

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <EmptyState
          icon={Monitor}
          title="No active sessions"
          description="Your login sessions will appear here."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Device / Browser
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Last Active
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex items-center gap-2">
                      <DeviceIcon device={session.device} />
                      <div>
                        <div className="font-medium text-gray-900">
                          {session.device || "Unknown Device"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {session.browser || "Unknown Browser"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {formatRelativeTime(session.lastActive)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <code className="rounded bg-gray-100 px-1 py-0.5 text-sm">
                      {session.ipAddress || "N/A"}
                    </code>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {session.current ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        <Check className="h-3 w-3" />
                        Current
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">Active</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {!session.current && (
                      <button
                        onClick={() => handleRevokeSession(session)}
                        className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-200"
                      >
                        <Square className="h-3.5 w-3.5" />
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/**
 * Format ISO date string to relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHours = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSec < 60) {
    return "Just now"
  }
  if (diffMin < 60) {
    return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
  }
  return date.toLocaleDateString()
}
