/**
 * CLI Auth routes
 *
 * Routes for CLI-based authentication flow.
 * Enables CLI tools to authenticate via browser-based OAuth flow.
 *
 * Routes:
 * - POST /api/auth/cli/initiate - Start CLI auth flow
 */

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { cliAuthSession } from "@athreei/db"
import { getDb } from "../lib/db"
import { generateId } from "../services"

const cliAuth = new Hono()

// =============================================================================
// Schemas
// =============================================================================

const initiateSchema = z.object({
  state: z.string().min(16).max(64),
  callbackPort: z.number().int().min(1024).max(65535),
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

  const sessionId = generateId("cas_") // CLI auth session prefix
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).insert(cliAuthSession).values({
    id: sessionId,
    state,
    callbackPort,
    status: "pending",
    expiresAt,
  })

  const platformUrl = process.env.PLATFORM_URL || "http://localhost:3000"
  const authUrl = `${platformUrl}/auth/cli?session=${sessionId}`

  return c.json({ sessionId, authUrl })
})

export default cliAuth
