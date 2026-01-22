import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq, and, isNull, gte, sql } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { db } from "../lib/db-operations"
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

function safeJsonParse(str: string): unknown {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

const apiKeys = new Hono()

apiKeys.use("*", authMiddleware)

apiKeys.get("/", async (c) => {
  const auth = getAuthContext(c)
  const organizationId = c.req.query("organizationId")

  if (!organizationId) {
    throw ApiError.badRequest("organizationId query parameter is required")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  const keys = await db().query.apiKey.findMany({
    where: and(
      eq(apiKey.organizationId, organizationId),
      isNull(apiKey.revokedAt)
    ),
    with: {
      endpoint: true,
    },
  })

  return c.json({
    keys: keys.map((key) => ({
      id: key.id,
      name: key.name,
      prefix: key.keyPrefix,
      endpointId: key.endpointId,
      endpointName: key.endpoint?.name || null,
      lastUsedAt: key.lastUsedAt?.toISOString() || null,
      usageCount: key.usageCount,
      createdAt: key.createdAt.toISOString(),
      expiresAt: key.expiresAt?.toISOString() || null,
      scopes: key.scopes ? safeJsonParse(key.scopes) : null,
    })),
  })
})

apiKeys.post("/", zValidator("json", createApiKeySchema), async (c) => {
  const auth = getAuthContext(c)
  const organizationId = c.req.query("organizationId")
  const body = c.req.valid("json")

  if (!organizationId) {
    throw ApiError.badRequest("organizationId query parameter is required")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  const endpointId = body.endpointId as string | undefined
  if (endpointId) {
    const ep = await db().query.endpoint.findFirst({
      where: eq(endpoint.id, endpointId),
    })
    if (!ep || ep.organizationId !== organizationId) {
      throw ApiError.badRequest(
        "Endpoint not found or does not belong to this organization"
      )
    }
  }

  const plainKey = generateApiKey()
  const keyHash = await hashApiKey(plainKey)
  const keyPrefix = createKeyPrefix(plainKey)
  const fullKey = createFullKey(plainKey)

  const now = new Date()
  const id = generateUUID()

  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

  await db()
    .insert(apiKey)
    .values({
      id,
      organizationId,
      endpointId: endpointId || null,
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
      endpointId: endpointId || null,
      createdAt: now.toISOString(),
      expiresAt: expiresAt?.toISOString() || null,
      scopes: body.scopes || null,
    },
    201
  )
})

apiKeys.delete("/:keyId", async (c) => {
  const auth = getAuthContext(c)
  const organizationId = c.req.query("organizationId")
  const keyId = c.req.param("keyId")

  if (!organizationId) {
    throw ApiError.badRequest("organizationId query parameter is required")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  const existingKey = await db().query.apiKey.findFirst({
    where: and(
      eq(apiKey.id, keyId),
      eq(apiKey.organizationId, organizationId),
      isNull(apiKey.revokedAt)
    ),
  })

  if (!existingKey) {
    throw ApiError.notFound("API key not found or already revoked")
  }

  const now = new Date()
  await db()
    .update(apiKey)
    .set({
      revokedAt: now,
      revokedById: auth.userId,
      updatedAt: now,
    })
    .where(eq(apiKey.id, keyId))

  return c.json({ message: "API key revoked successfully" })
})

async function verifyEndpointAccess(
  endpointId: string,
  userId: string
): Promise<typeof endpoint.$inferSelect> {
  const ep = await db().query.endpoint.findFirst({
    where: eq(endpoint.id, endpointId),
  })

  if (!ep) {
    throw ApiError.notFound("Endpoint not found")
  }

  const isMember = await verifyOrganizationMembership(userId, ep.organizationId)
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this endpoint")
  }

  return ep
}

apiKeys.get("/:endpointId/keys", async (c) => {
  const auth = getAuthContext(c)
  const endpointId = c.req.param("endpointId")

  await verifyEndpointAccess(endpointId, auth.userId)

  const keys = await db().query.apiKey.findMany({
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
      scopes: key.scopes ? safeJsonParse(key.scopes) : null,
    })),
  })
})

apiKeys.post(
  "/:endpointId/keys",
  zValidator("json", createApiKeySchema),
  async (c) => {
    const auth = getAuthContext(c)
    const endpointId = c.req.param("endpointId")
    const body = c.req.valid("json")

    const ep = await verifyEndpointAccess(endpointId, auth.userId)

    const plainKey = generateApiKey()
    const keyHash = await hashApiKey(plainKey)
    const keyPrefix = createKeyPrefix(plainKey)
    const fullKey = createFullKey(plainKey)

    const now = new Date()
    const id = generateUUID()

    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null

    await db()
      .insert(apiKey)
      .values({
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
  const auth = getAuthContext(c)
  const endpointId = c.req.param("endpointId")
  const keyId = c.req.param("keyId")

  await verifyEndpointAccess(endpointId, auth.userId)

  const existingKey = await db().query.apiKey.findFirst({
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
  await db()
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
    const dayStr = date.toISOString().split("T")[0]
    if (dayStr) {
      result.push(dayStr)
    }
  }
  return result
}

apiKeys.get("/:endpointId/keys/:keyId/stats", async (c) => {
  const auth = getAuthContext(c)
  const endpointId = c.req.param("endpointId")
  const keyId = c.req.param("keyId")

  await verifyEndpointAccess(endpointId, auth.userId)

  const existingKey = await db().query.apiKey.findFirst({
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

  const escapedKeyId = keyId.replace(/[%_\\]/g, "\\$&")
  const apiKeyJsonPattern = `%"apiKeyId":"${escapedKeyId}"%`

  const totalCountResult = await db()
    .select({ count: sql<number>`count(*)` })
    .from(trace)
    .where(sql`${trace.attributes} LIKE ${apiKeyJsonPattern}`)

  const totalUsage = Number(totalCountResult[0]?.count ?? 0)

  const errorCountResult = await db()
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

    const dayCountResult = await db()
      .select({ count: sql<number>`count(*)` })
      .from(trace)
      .where(
        and(
          sql`${trace.attributes} LIKE ${apiKeyJsonPattern}`,
          gte(trace.startTime, dayStart),
          sql`${trace.startTime} <= ${dayEnd}`
        )
      )

    const dayErrorResult = await db()
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

  const lastTraceResult = await db()
    .select({ startTime: trace.startTime })
    .from(trace)
    .where(sql`${trace.attributes} LIKE ${apiKeyJsonPattern}`)
    .orderBy(sql`${trace.startTime} DESC`)
    .limit(1)

  const lastUsed = lastTraceResult[0]?.startTime?.toISOString() ?? null

  return c.json({
    totalUsage,
    last7Days,
    errorRate: Math.round(errorRate * 100) / 100,
    lastUsed,
  })
})

export default apiKeys
