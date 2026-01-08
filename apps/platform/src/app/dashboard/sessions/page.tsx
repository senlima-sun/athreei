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
import { Activity, Square } from "lucide-react"
import type { Session, SessionsResponse } from "@/types"

export default function SessionsPage() {
  const { data: activeOrg, isPending: isOrgPending } =
    useActiveOrganizationSafe()
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = useState<"active" | "past">("active")

  // Filter state
  const [originFilter, setOriginFilter] = useState("")

  // Fetch sessions
  const fetchSessions = async () => {
    if (!isLocalMode() && (!activeOrg || isOrgPending)) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchApi<SessionsResponse>("/api/sessions", {
        organizationId: activeOrg?.id,
      })
      setSessions(response.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sessions")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrg?.id, isOrgPending])

  // Handle end session
  const handleEndSession = async (session: Session) => {
    if (!confirm(`End session for ${session.origin}?`)) {
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
      setError(err instanceof Error ? err.message : "Failed to end session")
    }
  }

  // Split sessions by active/past
  const activeSessions = sessions.filter((s) => !s.endedAt)
  const pastSessions = sessions.filter((s) => s.endedAt)

  // Apply filter
  const filterSessions = (list: Session[]) =>
    list.filter(
      (s) =>
        !originFilter ||
        s.origin.toLowerCase().includes(originFilter.toLowerCase())
    )

  const filteredActive = filterSessions(activeSessions)
  const filteredPast = filterSessions(pastSessions)
  const displayedSessions =
    activeTab === "active" ? filteredActive : filteredPast

  // Loading state
  if (isOrgPending || isLoading) {
    return (
      <div>
        <PageHeader
          title="Sessions"
          description="Monitor active and past AI interaction sessions"
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
          description="Monitor active and past AI interaction sessions"
        />
        <EmptyState
          icon={Activity}
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
          description="Monitor active and past AI interaction sessions"
        />
        <ErrorState message={error} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Sessions"
        description="Monitor active and past AI interaction sessions"
      />

      {/* Tabs */}
      <div className="mb-4 flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("active")}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            activeTab === "active"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          Active Sessions ({filteredActive.length})
        </button>
        <button
          onClick={() => setActiveTab("past")}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${
            activeTab === "past"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
          }`}
        >
          Past Sessions ({filteredPast.length})
        </button>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Filter by origin..."
          value={originFilter}
          onChange={(e) => setOriginFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Sessions Table */}
      {displayedSessions.length === 0 ? (
        <EmptyState
          icon={Activity}
          title={
            activeTab === "active" ? "No active sessions" : "No past sessions"
          }
          description={
            activeTab === "active"
              ? "Active sessions will appear here when AI apps connect through athreei."
              : "Past sessions will be displayed here after they end."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Session ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Origin
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Started
                </th>
                {activeTab === "past" && (
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Ended
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Duration
                </th>
                {activeTab === "active" && (
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {displayedSessions.map((session) => {
                const duration = session.endedAt
                  ? session.endedAt - session.startedAt
                  : Date.now() - session.startedAt

                return (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3">
                      <code className="rounded bg-gray-100 px-1 py-0.5 text-sm">
                        {session.id.substring(0, 8)}...
                      </code>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <code className="rounded bg-gray-100 px-1 py-0.5 text-sm">
                        {session.origin}
                      </code>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {new Date(session.startedAt).toLocaleString()}
                    </td>
                    {activeTab === "past" && (
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {session.endedAt
                          ? new Date(session.endedAt).toLocaleString()
                          : "N/A"}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {formatDuration(duration)}
                    </td>
                    {activeTab === "active" && (
                      <td className="whitespace-nowrap px-4 py-3">
                        <button
                          onClick={() => handleEndSession(session)}
                          className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-1 text-sm font-medium text-red-700 hover:bg-red-200"
                        >
                          <Square className="h-3.5 w-3.5" />
                          End Session
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/**
 * Format milliseconds to human-readable duration
 */
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
