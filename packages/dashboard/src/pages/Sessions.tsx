import { h } from "preact"
import { useState, useEffect } from "preact/hooks"
import type { Session } from "@athreei/shared"
import { api } from "../lib/api"
import { DataTable, Column } from "../components/ui/DataTable"
import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Tabs } from "../components/ui/Tabs"

interface SessionsResponse {
  sessions: Session[]
}

export function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"active" | "past">("active")

  // Fetch sessions from API
  const fetchSessions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.get<SessionsResponse>("/api/sessions")
      setSessions(response.sessions)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch sessions")
    } finally {
      setLoading(false)
    }
  }

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions()
  }, [])

  // Handle end session
  const handleEndSession = async (session: Session) => {
    if (!confirm(`End session for ${session.origin}?`)) {
      return
    }

    try {
      setError(null)
      await api.delete(`/api/sessions/${session.id}`)

      // Refresh sessions list
      await fetchSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to end session")
    }
  }

  // Split sessions
  const activeSessions = sessions.filter((s) => !s.endedAt)
  const pastSessions = sessions.filter((s) => s.endedAt)

  // Define columns for active sessions
  const activeColumns: Column<Session>[] = [
    {
      accessor: "id",
      header: "Session ID",
      cell: (value) => <code>{value.substring(0, 8)}...</code>,
    },
    {
      accessor: "origin",
      header: "Origin",
      cell: (value) => <code>{value}</code>,
    },
    {
      accessor: "startedAt",
      header: "Started",
      cell: (value) => (
        <span className="text-muted">
          {new Date(value).toLocaleString()}
        </span>
      ),
    },
    {
      accessor: (row) => Date.now() - row.startedAt,
      header: "Duration",
      cell: (value) => (
        <span className="text-muted">{formatDuration(value)}</span>
      ),
      sortable: false,
    },
    {
      accessor: (row) => row.id,
      header: "Actions",
      sortable: false,
      cell: (_, row) => (
        <Button variant="danger" size="sm" onClick={() => handleEndSession(row)}>
          End Session
        </Button>
      ),
    },
  ]

  // Define columns for past sessions
  const pastColumns: Column<Session>[] = [
    {
      accessor: "id",
      header: "Session ID",
      cell: (value) => <code>{value.substring(0, 8)}...</code>,
    },
    {
      accessor: "origin",
      header: "Origin",
      cell: (value) => <code>{value}</code>,
    },
    {
      accessor: "startedAt",
      header: "Started",
      cell: (value) => (
        <span className="text-muted">
          {new Date(value).toLocaleString()}
        </span>
      ),
    },
    {
      accessor: "endedAt",
      header: "Ended",
      cell: (value) => (
        <span className="text-muted">
          {value ? new Date(value).toLocaleString() : "N/A"}
        </span>
      ),
    },
    {
      accessor: (row) => (row.endedAt ? row.endedAt - row.startedAt : 0),
      header: "Duration",
      cell: (value) => (
        <span className="text-muted">
          {value ? formatDuration(value) : "N/A"}
        </span>
      ),
      sortable: false,
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: "var(--spacing-xl)" }}>
        <h2>Session Management</h2>
        <p className="text-muted">
          Monitor active and past AI interaction sessions across your browsing
          contexts.
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

      {/* Sessions Table */}
      <Card>
        <Tabs
          tabs={[
            { id: "active", label: `Active Sessions (${activeSessions.length})` },
            { id: "past", label: `Past Sessions (${pastSessions.length})` },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as "active" | "past")}
        />

        <div style={{ marginTop: "var(--spacing-lg)" }}>
          {activeTab === "active" ? (
            <DataTable
              columns={activeColumns}
              data={activeSessions}
              loading={loading}
              emptyMessage="No active sessions at the moment."
            />
          ) : (
            <DataTable
              columns={pastColumns}
              data={pastSessions}
              loading={loading}
              emptyMessage="No past sessions to display."
            />
          )}
        </div>
      </Card>
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
