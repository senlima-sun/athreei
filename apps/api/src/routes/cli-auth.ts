import { createHash } from "crypto"
import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { eq, and } from "drizzle-orm"
import {
  cliAuthSession,
  cliToken,
  member,
  user,
  organization,
} from "@athreei/db"
import { getDb } from "../lib/db"
import { getAuth } from "../lib/auth"
import { generateId, ID_PREFIXES } from "../services"

const cliAuth = new Hono()

function getPlatformUrl(): string {
  const platformUrl = process.env.PLATFORM_URL

  if (platformUrl) {
    return platformUrl
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "PLATFORM_URL environment variable is required in production"
    )
  }

  return "http://localhost:3000"
}

const initiateSchema = z.object({
  state: z.string().min(16).max(64),
  callbackPort: z.number().int().min(1024).max(65535),
})

const tokenSchema = z.object({
  sessionId: z.string(),
  organizationId: z.string(),
})

cliAuth.post("/initiate", zValidator("json", initiateSchema), async (c) => {
  const { state, callbackPort } = c.req.valid("json")
  const db = getDb()

  const sessionId = generateId(ID_PREFIXES.cliAuthSession)
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

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

cliAuth.get("/session/:sessionId", async (c) => {
  const { sessionId } = c.req.param()
  const state = c.req.query("state")

  const db = getDb()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [session] = await (db as any)
    .select()
    .from(cliAuthSession)
    .where(eq(cliAuthSession.id, sessionId))
    .limit(1)

  if (!session) {
    return c.json({ error: "Session not found" }, 404)
  }

  if (state && session.state !== state) {
    return c.json({ error: "Invalid state" }, 400)
  }

  if (new Date() > session.expiresAt) {
    return c.json({ status: "expired" })
  }

  return c.json({ status: session.status })
})

cliAuth.post("/token", zValidator("json", tokenSchema), async (c) => {
  const { sessionId, organizationId } = c.req.valid("json")
  const db = getDb()
  const auth = getAuth()

  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session?.user) {
    return c.json({ error: "Not authenticated" }, 401)
  }

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

  if (!updateResult || updateResult.length === 0) {
    return c.json({ error: "Session already used or expired" }, 409)
  }

  const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
  const tokenSuffix = Array.from(tokenBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  const token = `a3i_${tokenSuffix}`
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const tokenId = generateId()
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

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

cliAuth.get("/verify", async (c) => {
  const authHeader = c.req.header("Authorization")
  if (!authHeader?.startsWith("Bearer a3i_")) {
    return c.json({ valid: false, error: "Invalid token format" }, 401)
  }

  const token = authHeader.slice(7)
  const tokenHash = createHash("sha256").update(token).digest("hex")

  const db = getDb()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [foundToken] = await (db as any)
    .select({
      id: cliToken.id,
      userId: cliToken.userId,
      organizationId: cliToken.organizationId,
      expiresAt: cliToken.expiresAt,
      revokedAt: cliToken.revokedAt,
    })
    .from(cliToken)
    .where(eq(cliToken.tokenHash, tokenHash))
    .limit(1)

  if (!foundToken) {
    return c.json({ valid: false, error: "Token not found" }, 401)
  }

  if (foundToken.revokedAt) {
    return c.json({ valid: false, error: "Token revoked" }, 401)
  }

  if (new Date() > foundToken.expiresAt) {
    return c.json({ valid: false, error: "Token expired" }, 401)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .update(cliToken)
    .set({ lastUsedAt: new Date() })
    .where(eq(cliToken.id, foundToken.id))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [foundUser] = await (db as any)
    .select({
      id: user.id,
      email: user.email,
      name: user.name,
    })
    .from(user)
    .where(eq(user.id, foundToken.userId))
    .limit(1)

  if (!foundUser) {
    return c.json({ valid: false, error: "User not found" }, 401)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memberships = await (db as any)
    .select({
      organizationId: member.organizationId,
      role: member.role,
      orgName: organization.name,
      orgSlug: organization.slug,
    })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(eq(member.userId, foundToken.userId))

  return c.json({
    valid: true,
    user: foundUser,
    currentOrganization: foundToken.organizationId,
    organizations: memberships.map(
      (m: {
        organizationId: string
        role: string
        orgName: string
        orgSlug: string
      }) => ({
        id: m.organizationId,
        name: m.orgName,
        slug: m.orgSlug,
        role: m.role,
      })
    ),
  })
})

export default cliAuth
