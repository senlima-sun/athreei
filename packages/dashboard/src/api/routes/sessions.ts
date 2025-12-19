/**
 * Sessions API routes
 *
 * Endpoints for tracking and managing browser sessions.
 * Currently uses mock data - will integrate with SQLite later.
 */

import { Hono } from "hono"
import type { Session } from "@athreei/shared"

export const sessionsRouter = new Hono()

// Mock sessions data
const mockSessions: Session[] = [
  {
    id: "session-001",
    tabId: 123,
    origin: "https://example.com",
    startedAt: Date.now() - 1800000,
    metadata: {
      userAgent: "Mozilla/5.0",
      aiApp: "Claude",
      actionsPerformed: 5,
    },
  },
  {
    id: "session-002",
    tabId: 456,
    origin: "https://github.com",
    startedAt: Date.now() - 3600000,
    metadata: {
      userAgent: "Mozilla/5.0",
      aiApp: "ChatGPT",
      actionsPerformed: 12,
    },
  },
  {
    id: "session-003",
    origin: "https://test.com",
    startedAt: Date.now() - 7200000,
    endedAt: Date.now() - 1800000,
    metadata: {
      userAgent: "Mozilla/5.0",
      aiApp: "Claude",
      actionsPerformed: 3,
      duration: 5400000,
    },
  },
  {
    id: "session-004",
    tabId: 789,
    origin: "https://app.example.com",
    startedAt: Date.now() - 10800000,
    metadata: {
      userAgent: "Mozilla/5.0",
      actionsPerformed: 8,
    },
  },
  {
    id: "session-005",
    origin: "https://example.com",
    startedAt: Date.now() - 86400000,
    endedAt: Date.now() - 82800000,
    metadata: {
      userAgent: "Mozilla/5.0",
      aiApp: "Claude",
      actionsPerformed: 15,
      duration: 3600000,
    },
  },
]

/**
 * GET /api/sessions
 * List sessions (active and recent)
 *
 * Query params:
 * - origin: Filter by origin
 * - active: Filter by active status (true|false)
 * - aiApp: Filter by AI app name
 * - limit: Maximum number of sessions to return (default: 50)
 */
sessionsRouter.get("/", (c) => {
  const origin = c.req.query("origin")
  const active = c.req.query("active")
  const aiApp = c.req.query("aiApp")
  const limit = parseInt(c.req.query("limit") || "50")

  let filtered = [...mockSessions]

  if (origin) {
    filtered = filtered.filter((s) => s.origin === origin)
  }

  if (active === "true") {
    filtered = filtered.filter((s) => !s.endedAt)
  } else if (active === "false") {
    filtered = filtered.filter((s) => s.endedAt !== undefined)
  }

  if (aiApp) {
    filtered = filtered.filter((s) => s.metadata?.aiApp === aiApp)
  }

  // Sort by startedAt descending (most recent first)
  filtered.sort((a, b) => b.startedAt - a.startedAt)

  // Limit results
  const limited = filtered.slice(0, limit)

  return c.json({
    data: limited,
    count: limited.length,
    total: filtered.length,
  })
})

/**
 * GET /api/sessions/:id
 * Get detailed information about a specific session
 */
sessionsRouter.get("/:id", (c) => {
  const id = c.req.param("id")
  const session = mockSessions.find((s) => s.id === id)

  if (!session) {
    return c.json({ error: "Session not found" }, 404)
  }

  // Calculate duration for active sessions
  const duration = session.endedAt
    ? session.endedAt - session.startedAt
    : Date.now() - session.startedAt

  return c.json({
    ...session,
    duration,
    isActive: !session.endedAt,
  })
})

/**
 * DELETE /api/sessions/:id
 * End an active session
 */
sessionsRouter.delete("/:id", (c) => {
  const id = c.req.param("id")
  const index = mockSessions.findIndex((s) => s.id === id)

  if (index === -1) {
    return c.json({ error: "Session not found" }, 404)
  }

  const session = mockSessions[index]

  if (session.endedAt) {
    return c.json({ error: "Session is already ended" }, 400)
  }

  // End the session
  mockSessions[index] = {
    ...session,
    endedAt: Date.now(),
    metadata: {
      ...session.metadata,
      duration: Date.now() - session.startedAt,
    },
  }

  return c.json({
    message: "Session ended successfully",
    session: mockSessions[index],
  })
})
