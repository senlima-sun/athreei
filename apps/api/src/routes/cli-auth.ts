/**
 * CLI Auth routes
 *
 * Routes for CLI-based authentication flow.
 * Enables CLI tools to authenticate via browser-based OAuth flow.
 *
 * Routes:
 * - POST /api/auth/cli/initiate - Start CLI auth flow
 * - POST /api/auth/cli/token - Generate CLI token after browser authorization
 */

import { createHash } from "crypto"
import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { eq, and } from "drizzle-orm"
import { cliAuthSession, cliToken, member } from "@athreei/db"
import { getDb } from "../lib/db"
import { getAuth } from "../lib/auth"
import { generateId, ID_PREFIXES } from "../services"

const cliAuth = new Hono()

// =============================================================================
// Configuration
// =============================================================================

function getPlatformUrl(): string {
  const platformUrl = process.env.PLATFORM_URL

  if (platformUrl) {
    return platformUrl
  }

  // In production, PLATFORM_URL is required
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "PLATFORM_URL environment variable is required in production"
    )
  }

  // Development fallback
  return "http://localhost:3000"
}

// =============================================================================
// Schemas
// =============================================================================

const initiateSchema = z.object({
  state: z.string().min(16).max(64),
  callbackPort: z.number().int().min(1024).max(65535),
})

const tokenSchema = z.object({
  sessionId: z.string(),
  organizationId: z.string(),
})

// =============================================================================
// Routes
// =============================================================================

/**
 * POST /initiate
 * Start CLI authentication flow
 *
 * Creates a short-lived auth session and returns a URL for the user
 * to authenticate in the browser.
 */
cliAuth.post("/initiate", zValidator("json", initiateSchema), async (c) => {
  const { state, callbackPort } = c.req.valid("json")
  const db = getDb()

  const sessionId = generateId(ID_PREFIXES.cliAuthSession)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).insert(cliAuthSession).values({
      id: sessionId,
      state,
      callbackPort,
      status: "pending",
      expiresAt,
    })
  } catch (error) {
    // Handle duplicate state (unique constraint violation)
    const errorMessage =
      error instanceof Error ? error.message.toLowerCase() : ""
    if (
      errorMessage.includes("unique") ||
      errorMessage.includes("duplicate") ||
      errorMessage.includes("constraint")
    ) {
      return c.json({ error: "A session with this state already exists" }, 409)
    }
    throw error
  }

  const platformUrl = getPlatformUrl()
  const authUrl = `${platformUrl}/auth/cli?session=${sessionId}`

  return c.json({ sessionId, authUrl })
})

/**
 * POST /token
 * Generate CLI token after browser authorization
 *
 * Called by the Platform's /auth/cli page after the user:
 * 1. Logs in on Platform
 * 2. Selects an organization to authorize
 * 3. Clicks "Authorize"
 *
 * The endpoint verifies the user's session, validates the CLI auth session,
 * checks organization membership, and generates a long-lived token.
 *
 * Uses optimistic locking to prevent race conditions - the session is
 * atomically updated from "pending" to "used" before token generation.
 */
cliAuth.post("/token", zValidator("json", tokenSchema), async (c) => {
  const { sessionId, organizationId } = c.req.valid("json")
  const db = getDb()
  const auth = getAuth()

  // Verify session from cookie (user must be logged in on Platform)
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session?.user) {
    return c.json({ error: "Not authenticated" }, 401)
  }

  // Step 1: Check session exists and is not expired (read-only check)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cliSession] = await (db as any)
    .select()
    .from(cliAuthSession)
    .where(eq(cliAuthSession.id, sessionId))
    .limit(1)

  if (!cliSession) {
    return c.json({ error: "Invalid session" }, 400)
  }

  if (new Date() > cliSession.expiresAt) {
    return c.json({ error: "Session expired" }, 400)
  }

  // Verify user has access to organization
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [membership] = await (db as any)
    .select()
    .from(member)
    .where(
      and(
        eq(member.userId, session.user.id),
        eq(member.organizationId, organizationId)
      )
    )
    .limit(1)

  if (!membership) {
    return c.json({ error: "No access to organization" }, 403)
  }

  // Step 2: Atomically claim the session using optimistic locking
  // This UPDATE only succeeds if status is still "pending"
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateResult = await (db as any)
    .update(cliAuthSession)
    .set({
      status: "used",
      userId: session.user.id,
      organizationId,
    })
    .where(
      and(
        eq(cliAuthSession.id, sessionId),
        eq(cliAuthSession.status, "pending")
      )
    )
    .returning()

  // If no rows updated, another request already claimed this session
  if (!updateResult || updateResult.length === 0) {
    return c.json({ error: "Session already used or expired" }, 409)
  }

  // Step 3: Generate token (only after successfully claiming session)
  // a3i_ prefix + 64 random hex characters (256 bits entropy)
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
  const tokenSuffix = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  const token = `a3i_${tokenSuffix}`
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const tokenId = generateId()
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days

  // Save hashed token with default name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).insert(cliToken).values({
    id: tokenId,
    tokenHash,
    userId: session.user.id,
    organizationId,
    name: "CLI Token",
    expiresAt,
  })

  return c.json({
    token,
    expiresAt: expiresAt.toISOString(),
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
    organization: {
      id: organizationId,
    },
  })
})

export default cliAuth
