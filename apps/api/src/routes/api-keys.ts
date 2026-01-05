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
 */

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq, and, isNull } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { getDb, type DatabaseClient } from "../lib/db"
import { apiKey, endpoint } from "@athreei/db"
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

export default apiKeys
