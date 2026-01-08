/**
 * API Key routes
 *
 * Routes for managing API keys scoped to endpoints.
 * Keys are hashed before storage and only shown once at creation.
 *
 * Routes:
 * - GET /endpoints/:endpointId/keys - List API keys for an endpoint (masked values)
 * - POST /endpoints/:endpointId/keys - Create key (return plain key once)
 * - DELETE /endpoints/:endpointId/keys/:keyId - Revoke key
 * - GET /endpoints/:endpointId/keys/:keyId/stats - Get usage stats for a key
 */

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq, and, isNull, gte, sql } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { getDb, type DatabaseClient } from "../lib/db"
import { apiKey, endpoint, trace } from "@athreei/db"
import { createApiKeySchema } from "../schemas/api-keys"
import {
  generateApiKey,
  hashApiKey,
  createKeyPrefix,
  createFullKey,
  generateUUID,
  verifyOrganizationMembership,
} from "../services"

const apiKeys = new Hono()

// Apply auth middleware to all API key routes
apiKeys.use("*", authMiddleware)

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Verify user has access to the endpoint's organization
 */
async function verifyEndpointAccess(
  db: DatabaseClient,
  endpointId: string,
  userId: string
): Promise<typeof endpoint.$inferSelect> {
  // Get the endpoint
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ep = await (db as any).query.endpoint.findFirst({
    where: eq(endpoint.id, endpointId),
  })

  if (!ep) {
    throw ApiError.notFound("Endpoint not found")
  }

  // Check if user is a member of the organization that owns this endpoint
  const isMember = await verifyOrganizationMembership(
    db,
    userId,
    ep.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this endpoint")
  }

  return ep
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /endpoints/:endpointId/keys
 * List all API keys for an endpoint (masked values)
 */
apiKeys.get("/:endpointId/keys", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const endpointId = c.req.param("endpointId")

  // Verify access to endpoint
  await verifyEndpointAccess(db, endpointId, auth.userId)

  // Get all active (non-revoked) API keys for this endpoint
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keys = await (db as any).query.apiKey.findMany({
    where: and(eq(apiKey.endpointId, endpointId), isNull(apiKey.revokedAt)),
  })

  return c.json({
    keys: keys.map((key: typeof apiKey.$inferSelect) => ({
      id: key.id,
      name: key.name,
      prefix: key.keyPrefix,
      lastUsedAt: key.lastUsedAt?.toISOString() || null,
      usageCount: key.usageCount,
      createdAt: key.createdAt.toISOString(),
      expiresAt: key.expiresAt?.toISOString() || null,
      scopes: key.scopes ? JSON.parse(key.scopes) : null,
    })),
  })
})

/**
 * POST /endpoints/:endpointId/keys
 * Create a new API key for an endpoint
 * Returns the plain key ONLY at creation time
 */
apiKeys.post(
  "/:endpointId/keys",
  zValidator("json", createApiKeySchema),
  async (c) => {
    const db = getDb()
    const auth = getAuthContext(c)
    const endpointId = c.req.param("endpointId")
    const body = c.req.valid("json")

    // Verify access to endpoint
    const ep = await verifyEndpointAccess(db, endpointId, auth.userId)

    // Generate the API key
    const plainKey = generateApiKey()
    const keyHash = await hashApiKey(plainKey)
    const keyPrefix = createKeyPrefix(plainKey)
    const fullKey = createFullKey(plainKey)

    const now = new Date()
    const id = generateUUID()

    // Parse expiration date if provided
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

    // Insert the API key
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).insert(apiKey).values({
      id,
      organizationId: ep.organizationId,
      endpointId,
      createdById: auth.userId,
      name: body.name,
      keyHash,
      keyPrefix,
      scopes: body.scopes ? JSON.stringify(body.scopes) : null,
      expiresAt,
      usageCount: 0,
      createdAt: now,
      updatedAt: now,
    })

    // Return the response with the plain key (only shown once)
    return c.json(
      {
        id,
        name: body.name,
        key: fullKey, // Only returned once at creation
        prefix: keyPrefix,
        createdAt: now.toISOString(),
        expiresAt: expiresAt?.toISOString() || null,
        scopes: body.scopes || null,
      },
      201
    )
  }
)

/**
 * DELETE /endpoints/:endpointId/keys/:keyId
 * Revoke an API key
 */
apiKeys.delete("/:endpointId/keys/:keyId", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const endpointId = c.req.param("endpointId")
  const keyId = c.req.param("keyId")

  // Verify access to endpoint
  await verifyEndpointAccess(db, endpointId, auth.userId)

  // Check if the key exists and belongs to this endpoint
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingKey = await (db as any).query.apiKey.findFirst({
    where: and(
      eq(apiKey.id, keyId),
      eq(apiKey.endpointId, endpointId),
      isNull(apiKey.revokedAt)
    ),
  })

  if (!existingKey) {
    throw ApiError.notFound("API key not found or already revoked")
  }

  // Revoke the key (soft delete)
  const now = new Date()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .update(apiKey)
    .set({
      revokedAt: now,
      revokedById: auth.userId,
      updatedAt: now,
    })
    .where(eq(apiKey.id, keyId))

  return c.json({ message: "API key revoked successfully" })
})

// =============================================================================
// Stats Endpoint
// =============================================================================

/**
 * Helper to generate array of past N days as YYYY-MM-DD strings
 */
function getPastDays(days: number): string[] {
  const result: string[] = []
  const now = new Date()
  for (let i = 0; i < days; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    result.push(date.toISOString().split("T")[0])
  }
  return result
}

/**
 * GET /endpoints/:endpointId/keys/:keyId/stats
 * Get usage statistics for a specific API key
 */
apiKeys.get("/:endpointId/keys/:keyId/stats", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const endpointId = c.req.param("endpointId")
  const keyId = c.req.param("keyId")

  // Verify access to endpoint
  await verifyEndpointAccess(db, endpointId, auth.userId)

  // Check if the key exists and belongs to this endpoint
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingKey = await (db as any).query.apiKey.findFirst({
    where: and(
      eq(apiKey.id, keyId),
      eq(apiKey.endpointId, endpointId),
      isNull(apiKey.revokedAt)
    ),
  })

  if (!existingKey) {
    throw ApiError.notFound("API key not found or revoked")
  }

  // Calculate date 7 days ago for daily breakdown
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  // Query traces that have this API key in their attributes JSON
  // The apiKeyId is stored in the attributes column as JSON: {"apiKeyId": "..."}
  const apiKeyJsonPattern = `%"apiKeyId":"${keyId}"%`

  // Get total usage count
  const totalCountResult = await dbAny
    .select({ count: sql<number>`count(*)` })
    .from(trace)
    .where(sql`${trace.attributes} LIKE ${apiKeyJsonPattern}`)

  const totalUsage = Number(totalCountResult[0]?.count ?? 0)

  // Get error count for error rate calculation
  const errorCountResult = await dbAny
    .select({ count: sql<number>`count(*)` })
    .from(trace)
    .where(
      and(
        sql`${trace.attributes} LIKE ${apiKeyJsonPattern}`,
        eq(trace.status, "error")
      )
    )

  const totalErrors = Number(errorCountResult[0]?.count ?? 0)
  const errorRate = totalUsage > 0 ? (totalErrors / totalUsage) * 100 : 0

  // Get last 7 days breakdown
  const pastDays = getPastDays(7)
  const last7Days: Array<{ date: string; count: number; errors: number }> = []

  for (const dateStr of pastDays) {
    const dayStart = new Date(dateStr)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dateStr)
    dayEnd.setHours(23, 59, 59, 999)

    // Count total traces for this day
    const dayCountResult = await dbAny
      .select({ count: sql<number>`count(*)` })
      .from(trace)
      .where(
        and(
          sql`${trace.attributes} LIKE ${apiKeyJsonPattern}`,
          gte(trace.startTime, dayStart),
          sql`${trace.startTime} <= ${dayEnd}`
        )
      )

    // Count error traces for this day
    const dayErrorResult = await dbAny
      .select({ count: sql<number>`count(*)` })
      .from(trace)
      .where(
        and(
          sql`${trace.attributes} LIKE ${apiKeyJsonPattern}`,
          eq(trace.status, "error"),
          gte(trace.startTime, dayStart),
          sql`${trace.startTime} <= ${dayEnd}`
        )
      )

    last7Days.push({
      date: dateStr,
      count: Number(dayCountResult[0]?.count ?? 0),
      errors: Number(dayErrorResult[0]?.count ?? 0),
    })
  }

  // Get most recent trace timestamp
  const lastTraceResult = await dbAny
    .select({ startTime: trace.startTime })
    .from(trace)
    .where(sql`${trace.attributes} LIKE ${apiKeyJsonPattern}`)
    .orderBy(sql`${trace.startTime} DESC`)
    .limit(1)

  const lastUsed = lastTraceResult[0]?.startTime?.toISOString() ?? null

  return c.json({
    totalUsage,
    last7Days,
    errorRate: Math.round(errorRate * 100) / 100, // Round to 2 decimal places
    lastUsed,
  })
})

export default apiKeys
