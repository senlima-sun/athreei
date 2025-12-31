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

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { authMiddleware, getAuthContext, ApiError } from "../middleware";
import { getDb } from "../lib/db";
import { apiKey, endpoint, member, pg } from "@athreei/db";

// Type alias for the PostgreSQL database with our schema
type PgDb = PostgresJsDatabase<typeof pg>;

const apiKeys = new Hono();

// Apply auth middleware to all API key routes
apiKeys.use("*", authMiddleware);

// =============================================================================
// Validation Schemas
// =============================================================================

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  scopes: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a secure random API key
 * Uses crypto.getRandomValues for cryptographic security
 */
function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // Convert to base64url encoding
  const base64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return base64;
}

/**
 * Hash an API key using SHA-256
 */
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a unique ID for the API key
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Verify user is a member of an organization
 */
async function verifyOrganizationMembership(
  db: PgDb,
  userId: string,
  organizationId: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membership = await (db as any).query.member.findFirst({
    where: and(eq(member.userId, userId), eq(member.organizationId, organizationId)),
  });
  return !!membership;
}

/**
 * Verify user has access to the endpoint's organization
 */
async function verifyEndpointAccess(
  db: PgDb,
  endpointId: string,
  userId: string
): Promise<typeof endpoint.$inferSelect> {
  // Get the endpoint
  const ep = await db.query.endpoint.findFirst({
    where: eq(endpoint.id, endpointId),
  });

  if (!ep) {
    throw ApiError.notFound("Endpoint not found");
  }

  // Check if user is a member of the organization that owns this endpoint
  const isMember = await verifyOrganizationMembership(db, userId, ep.organizationId);
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this endpoint");
  }

  return ep;
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /endpoints/:endpointId/keys
 * List all API keys for an endpoint (masked values)
 */
apiKeys.get("/:endpointId/keys", async (c) => {
  const db = getDb() as PgDb;
  const auth = getAuthContext(c);
  const endpointId = c.req.param("endpointId");

  // Verify access to endpoint
  await verifyEndpointAccess(db, endpointId, auth.userId);

  // Get all active (non-revoked) API keys for this endpoint
  const keys = await db.query.apiKey.findMany({
    where: and(
      eq(apiKey.endpointId, endpointId),
      isNull(apiKey.revokedAt)
    ),
  });

  return c.json({
    keys: keys.map((key) => ({
      id: key.id,
      name: key.name,
      prefix: key.keyPrefix,
      lastUsedAt: key.lastUsedAt?.toISOString() || null,
      usageCount: key.usageCount,
      createdAt: key.createdAt.toISOString(),
      expiresAt: key.expiresAt?.toISOString() || null,
      scopes: key.scopes ? JSON.parse(key.scopes) : null,
    })),
  });
});

/**
 * POST /endpoints/:endpointId/keys
 * Create a new API key for an endpoint
 * Returns the plain key ONLY at creation time
 */
apiKeys.post(
  "/:endpointId/keys",
  zValidator("json", createApiKeySchema),
  async (c) => {
    const db = getDb() as PgDb;
    const auth = getAuthContext(c);
    const endpointId = c.req.param("endpointId");
    const body = c.req.valid("json");

    // Verify access to endpoint
    const ep = await verifyEndpointAccess(db, endpointId, auth.userId);

    // Generate the API key
    const plainKey = generateApiKey();
    const keyHash = await hashApiKey(plainKey);
    const keyPrefix = "ak_" + plainKey.substring(0, 8);
    const fullKey = "ak_" + plainKey;

    const now = new Date();
    const id = generateId();

    // Parse expiration date if provided
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    // Insert the API key
    await db.insert(apiKey).values({
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
    });

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
    );
  }
);

/**
 * DELETE /endpoints/:endpointId/keys/:keyId
 * Revoke an API key
 */
apiKeys.delete("/:endpointId/keys/:keyId", async (c) => {
  const db = getDb() as PgDb;
  const auth = getAuthContext(c);
  const endpointId = c.req.param("endpointId");
  const keyId = c.req.param("keyId");

  // Verify access to endpoint
  await verifyEndpointAccess(db, endpointId, auth.userId);

  // Check if the key exists and belongs to this endpoint
  const existingKey = await db.query.apiKey.findFirst({
    where: and(
      eq(apiKey.id, keyId),
      eq(apiKey.endpointId, endpointId),
      isNull(apiKey.revokedAt)
    ),
  });

  if (!existingKey) {
    throw ApiError.notFound("API key not found or already revoked");
  }

  // Revoke the key (soft delete)
  const now = new Date();
  await db
    .update(apiKey)
    .set({
      revokedAt: now,
      revokedById: auth.userId,
      updatedAt: now,
    })
    .where(eq(apiKey.id, keyId));

  return c.json({ message: "API key revoked successfully" });
});

export default apiKeys;
