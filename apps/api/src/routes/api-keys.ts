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

apiKeys.use("*", authMiddleware)

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

apiKeys.get("/:endpointId/keys", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const endpointId = c.req.param("endpointId")

  await verifyEndpointAccess(db, endpointId, auth.userId)

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

apiKeys.post(
  "/:endpointId/keys",
  zValidator("json", createApiKeySchema),
  async (c) => {
    const db = getDb()
    const auth = getAuthContext(c)
    const endpointId = c.req.param("endpointId")
    const body = c.req.valid("json")

    const ep = await verifyEndpointAccess(db, endpointId, auth.userId)

    const plainKey = generateApiKey()
    const keyHash = await hashApiKey(plainKey)
    const keyPrefix = createKeyPrefix(plainKey)
    const fullKey = createFullKey(plainKey)

    const now = new Date()
    const id = generateUUID()

    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

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

    return c.json(
      {
        id,
        name: body.name,
        key: fullKey,
        prefix: keyPrefix,
        createdAt: now.toISOString(),
        expiresAt: expiresAt?.toISOString() || null,
        scopes: body.scopes || null,
      },
      201
    )
  }
)

apiKeys.delete("/:endpointId/keys/:keyId", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const endpointId = c.req.param("endpointId")
  const keyId = c.req.param("keyId")

  await verifyEndpointAccess(db, endpointId, auth.userId)

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

apiKeys.get("/:endpointId/keys/:keyId/stats", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const endpointId = c.req.param("endpointId")
  const keyId = c.req.param("keyId")

  await verifyEndpointAccess(db, endpointId, auth.userId)

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

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbAny = db as any

  const apiKeyJsonPattern = `%"apiKeyId":"${keyId}"%`

  const totalCountResult = await dbAny
    .select({ count: sql<number>`count(*)` })
    .from(trace)
    .where(sql`${trace.attributes} LIKE ${apiKeyJsonPattern}`)

  const totalUsage = Number(totalCountResult[0]?.count ?? 0)

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

  const pastDays = getPastDays(7)
  const last7Days: Array<{ date: string; count: number; errors: number }> = []

  for (const dateStr of pastDays) {
    const dayStart = new Date(dateStr)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dateStr)
    dayEnd.setHours(23, 59, 59, 999)

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
