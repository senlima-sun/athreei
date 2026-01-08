/**
 * Sessions routes
 *
 * Endpoints for managing user sessions.
 *
 * Routes:
 * - GET /api/sessions - List all active sessions
 * - DELETE /api/sessions/:sessionId - Revoke a specific session
 */

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { eq, and, gt } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { getDb } from "../lib/db"
import { detectDatabaseType, getSchema } from "@athreei/db"

// =============================================================================
// Types
// =============================================================================

interface SessionResponse {
  id: string
  device?: string
  browser?: string
  lastActive: string
  current: boolean
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

// =============================================================================
// Schemas
// =============================================================================

const sessionIdParamSchema = z.object({
  sessionId: z.string().min(1, "Session ID is required"),
})

// =============================================================================
// Helpers
// =============================================================================

/**
 * Parse user agent string to extract device and browser info
 */
function parseUserAgent(userAgent?: string | null): {
  device?: string
  browser?: string
} {
  if (!userAgent) {
    return {}
  }

  let device: string | undefined
  let browser: string | undefined

  // Detect device
  if (/iPhone/i.test(userAgent)) {
    device = "iPhone"
  } else if (/iPad/i.test(userAgent)) {
    device = "iPad"
  } else if (/Android/i.test(userAgent)) {
    device = "Android"
  } else if (/Macintosh|Mac OS/i.test(userAgent)) {
    device = "Mac"
  } else if (/Windows/i.test(userAgent)) {
    device = "Windows"
  } else if (/Linux/i.test(userAgent)) {
    device = "Linux"
  }

  // Detect browser
  if (/Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) {
    browser = "Chrome"
  } else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) {
    browser = "Safari"
  } else if (/Firefox/i.test(userAgent)) {
    browser = "Firefox"
  } else if (/Edg/i.test(userAgent)) {
    browser = "Edge"
  } else if (/Opera|OPR/i.test(userAgent)) {
    browser = "Opera"
  }

  return { device, browser }
}

// =============================================================================
// Routes
// =============================================================================

const sessions = new Hono()

// Apply auth middleware to all session routes
sessions.use("*", authMiddleware)

/**
 * GET /api/sessions
 * List all active sessions for the current user
 */
sessions.get("/", async (c) => {
  const auth = getAuthContext(c)

  const db = getDb()
  const databaseUrl = process.env.DATABASE_URL
  const dbType = databaseUrl ? detectDatabaseType(databaseUrl) : "sqlite"
  const schema = getSchema(dbType)

  // Query all sessions for the current user that haven't expired
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userSessions = await (db as any)
    .select({
      id: schema.session.id,
      ipAddress: schema.session.ipAddress,
      userAgent: schema.session.userAgent,
      createdAt: schema.session.createdAt,
      updatedAt: schema.session.updatedAt,
      expiresAt: schema.session.expiresAt,
    })
    .from(schema.session)
    .where(
      and(
        eq(schema.session.userId, auth.userId),
        gt(schema.session.expiresAt, new Date())
      )
    )

  // Transform sessions for response
  const sessionsResponse: SessionResponse[] = userSessions.map(
    (session: {
      id: string
      ipAddress: string | null
      userAgent: string | null
      createdAt: Date
      updatedAt: Date
      expiresAt: Date
    }) => {
      const { device, browser } = parseUserAgent(session.userAgent)

      return {
        id: session.id,
        device,
        browser,
        // Use updatedAt as lastActive since sessions are updated on activity
        lastActive: session.updatedAt.toISOString(),
        current: session.id === auth.session.id,
        ipAddress: session.ipAddress ?? undefined,
        userAgent: session.userAgent ?? undefined,
        createdAt: session.createdAt.toISOString(),
      }
    }
  )

  // Sort with current session first, then by lastActive descending
  sessionsResponse.sort((a, b) => {
    if (a.current) return -1
    if (b.current) return 1
    return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
  })

  return c.json(sessionsResponse)
})

/**
 * DELETE /api/sessions/:sessionId
 * Revoke (invalidate) a specific session
 */
sessions.delete(
  "/:sessionId",
  zValidator("param", sessionIdParamSchema),
  async (c) => {
    const auth = getAuthContext(c)
    const { sessionId } = c.req.valid("param")

    // Prevent revoking the current session
    if (sessionId === auth.session.id) {
      throw ApiError.badRequest(
        "Cannot revoke your current session. Please use sign out instead.",
        "CANNOT_REVOKE_CURRENT_SESSION"
      )
    }

    const db = getDb()
    const databaseUrl = process.env.DATABASE_URL
    const dbType = databaseUrl ? detectDatabaseType(databaseUrl) : "sqlite"
    const schema = getSchema(dbType)

    // First verify the session exists and belongs to the current user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingSession = await (db as any).query.session.findFirst({
      where: and(
        eq(schema.session.id, sessionId),
        eq(schema.session.userId, auth.userId)
      ),
    })

    if (!existingSession) {
      throw ApiError.notFound("Session not found", "SESSION_NOT_FOUND")
    }

    // Delete the session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .delete(schema.session)
      .where(
        and(
          eq(schema.session.id, sessionId),
          eq(schema.session.userId, auth.userId)
        )
      )

    return c.json({ message: "Session revoked successfully" })
  }
)

export default sessions
