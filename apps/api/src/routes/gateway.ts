/**
 * Gateway routes
 *
 * API endpoints for the athreei Gateway to fetch configuration.
 * The gateway uses these endpoints to:
 * 1. Fetch namespace configuration (servers to connect to)
 * 2. Report traces (optional)
 *
 * Authentication: API key in Authorization header (Bearer token)
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, isNull } from "drizzle-orm";
import { getDb, type DatabaseClient } from "../lib/db";
import {
  apiKey,
  endpoint,
  namespace,
  namespaceResource,
  mcpServer,
  trace,
} from "@athreei/db";
import { checkRateLimit } from "../middleware/rate-limit";

const gateway = new Hono();

// =============================================================================
// Validation Schemas
// =============================================================================

const getConfigQuerySchema = z.object({
  endpoint: z.string().min(1, "Endpoint name is required"),
});

const postTracesSchema = z.object({
  traces: z.array(
    z.object({
      traceId: z.string(),
      aggregatedToolName: z.string(),
      serverName: z.string(),
      toolName: z.string(),
      arguments: z.unknown().optional(),
      result: z.unknown().optional(),
      error: z.string().optional(),
      startedAt: z.string().datetime(),
      endedAt: z.string().datetime().optional(),
      durationMs: z.number().optional(),
    })
  ),
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse Authorization header and extract API key
 */
function parseAuthHeader(header: string | undefined): string | null {
  if (!header) return null;

  const parts = header.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }

  return parts[1];
}

/**
 * Hash an API key using SHA-256 (same as api-keys.ts)
 */
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validate API key and return associated endpoint
 */
async function validateApiKey(
  db: DatabaseClient,
  key: string
): Promise<{
  valid: true;
  apiKeyRecord: typeof apiKey.$inferSelect;
  endpointRecord: typeof endpoint.$inferSelect;
  keyHash: string;
} | { valid: false; error: string }> {
  // Strip "ak_" prefix if present (the key is stored without it)
  const keyToHash = key.startsWith("ak_") ? key.slice(3) : key;
  const keyHash = await hashApiKey(keyToHash);

  // Find the API key by hash
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query;

  const apiKeyRecord = await dbQuery.apiKey.findFirst({
    where: and(
      eq(apiKey.keyHash, keyHash),
      isNull(apiKey.revokedAt)
    ),
  }) as typeof apiKey.$inferSelect | undefined;

  if (!apiKeyRecord) {
    return { valid: false, error: "Invalid or revoked API key" };
  }

  // Check expiration
  if (apiKeyRecord.expiresAt && new Date(apiKeyRecord.expiresAt) < new Date()) {
    return { valid: false, error: "API key has expired" };
  }

  // Get the associated endpoint
  if (!apiKeyRecord.endpointId) {
    return { valid: false, error: "API key is not associated with an endpoint" };
  }

  const endpointRecord = await dbQuery.endpoint.findFirst({
    where: eq(endpoint.id, apiKeyRecord.endpointId),
  }) as typeof endpoint.$inferSelect | undefined;

  if (!endpointRecord) {
    return { valid: false, error: "Associated endpoint not found" };
  }

  // Update last used timestamp
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .update(apiKey)
    .set({
      lastUsedAt: new Date(),
      usageCount: apiKeyRecord.usageCount + 1,
    })
    .where(eq(apiKey.id, apiKeyRecord.id));

  return {
    valid: true,
    apiKeyRecord,
    endpointRecord,
    keyHash,
  };
}

/**
 * Generate a config version string based on namespace and server data
 */
function generateConfigVersion(
  namespaceRecord: typeof namespace.$inferSelect,
  servers: Array<typeof mcpServer.$inferSelect>
): string {
  // Use namespace updatedAt + server count + latest server update as version
  const latestServerUpdate = servers.reduce(
    (latest, s) => {
      const updated = new Date(s.updatedAt).getTime();
      return updated > latest ? updated : latest;
    },
    new Date(namespaceRecord.updatedAt).getTime()
  );

  return `${latestServerUpdate}-${servers.length}`;
}

/**
 * Generate a unique trace ID
 */
function generateTraceId(): string {
  return `tr_${crypto.randomUUID().replace(/-/g, "")}`;
}

/**
 * Generate a unique span ID
 */
function generateSpanId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_RATE_LIMIT = 60; // requests per minute

/**
 * Apply rate limiting for an API key with optional per-endpoint override
 * Returns rate limit info with headers to set, or null if rate limited (returns 429 response)
 */
function applyRateLimit(
  c: import("hono").Context,
  apiKeyHash: string,
  endpointRateLimit: number | null
): { limited: true } | { limited: false } {
  const limit = endpointRateLimit ?? DEFAULT_RATE_LIMIT;
  const info = checkRateLimit(apiKeyHash, limit, RATE_LIMIT_WINDOW_MS);

  // Set rate limit headers
  const now = Date.now();
  c.header("X-RateLimit-Limit", String(limit));
  c.header("X-RateLimit-Remaining", String(Math.max(0, limit - info.current)));
  c.header("X-RateLimit-Reset", String(Math.ceil((now + info.resetIn) / 1000)));

  if (info.limited) {
    c.header("Retry-After", String(Math.ceil(info.resetIn / 1000)));
    return { limited: true };
  }

  return { limited: false };
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/gateway/config?endpoint={name}
 *
 * Fetch namespace configuration for a gateway endpoint.
 * Returns the list of MCP servers to connect to.
 *
 * Authentication: Bearer token (API key)
 */
gateway.get("/config", zValidator("query", getConfigQuerySchema), async (c) => {
  const db = getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query;
  const { endpoint: endpointSlug } = c.req.valid("query");

  // Parse API key from Authorization header
  const authHeader = c.req.header("Authorization");
  const apiKeyValue = parseAuthHeader(authHeader);

  if (!apiKeyValue) {
    return c.json({ error: "Authorization header required" }, 401);
  }

  // Validate API key
  const validation = await validateApiKey(db, apiKeyValue);
  if (!validation.valid) {
    return c.json({ error: validation.error }, 401);
  }

  const { apiKeyRecord, endpointRecord, keyHash } = validation;

  // Apply rate limiting
  const rateLimitResult = applyRateLimit(c, keyHash, endpointRecord.rateLimit);
  if (rateLimitResult.limited) {
    return c.json(
      {
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please try again later.",
      },
      429
    );
  }

  // Extract slug from endpoint URL (e.g., "https://athreei.com/mcp/my-tools/sse" → "my-tools")
  const urlParts = endpointRecord.url.split("/");
  const mcpIndex = urlParts.indexOf("mcp");
  const endpointSlugFromUrl = mcpIndex !== -1 ? urlParts[mcpIndex + 1] : null;

  // Verify the requested endpoint matches the API key's endpoint
  if (endpointSlugFromUrl !== endpointSlug) {
    return c.json(
      { error: `API key does not have access to endpoint "${endpointSlug}"` },
      403
    );
  }

  // Get the namespace resource mapping for this endpoint
  const resourceMapping = await dbQuery.namespaceResource.findFirst({
    where: and(
      eq(namespaceResource.resourceType, "endpoint"),
      eq(namespaceResource.resourceId, endpointRecord.id)
    ),
  }) as typeof namespaceResource.$inferSelect | undefined;

  if (!resourceMapping) {
    return c.json({ error: "Endpoint is not assigned to a namespace" }, 404);
  }

  // Get the namespace
  const namespaceRecord = await dbQuery.namespace.findFirst({
    where: eq(namespace.id, resourceMapping.namespaceId),
  }) as typeof namespace.$inferSelect | undefined;

  if (!namespaceRecord) {
    return c.json({ error: "Namespace not found" }, 404);
  }

  // Get all MCP servers in this namespace
  const serverMappings = await dbQuery.namespaceResource.findMany({
    where: and(
      eq(namespaceResource.namespaceId, namespaceRecord.id),
      eq(namespaceResource.resourceType, "mcp_server")
    ),
  }) as Array<typeof namespaceResource.$inferSelect>;

  const servers: Array<typeof mcpServer.$inferSelect> = [];

  for (const mapping of serverMappings) {
    const server = await dbQuery.mcpServer.findFirst({
      where: eq(mcpServer.id, mapping.resourceId),
    }) as typeof mcpServer.$inferSelect | undefined;

    if (server) {
      servers.push(server);
    }
  }

  // Build the response
  const configVersion = generateConfigVersion(namespaceRecord, servers);

  return c.json({
    namespaceId: namespaceRecord.id,
    namespaceName: namespaceRecord.name,
    namespaceSlug: namespaceRecord.slug,
    endpointId: endpointRecord.id,
    endpointName: endpointRecord.name,
    organizationId: endpointRecord.organizationId,
    userId: apiKeyRecord.createdById,
    configVersion,
    servers: servers.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      transport: s.transport,
      command: s.command,
      args: s.args,
      url: s.url,
      version: s.version,
      capabilities: s.capabilities,
      status: s.status,
    })),
  });
});

/**
 * POST /api/gateway/traces
 *
 * Receive traces from the gateway for monitoring/analytics.
 * Authentication: Bearer token (API key)
 */
gateway.post("/traces", zValidator("json", postTracesSchema), async (c) => {
  // Parse API key from Authorization header
  const authHeader = c.req.header("Authorization");
  const apiKeyValue = parseAuthHeader(authHeader);

  if (!apiKeyValue) {
    return c.json({ error: "Authorization header required" }, 401);
  }

  const db = getDb();

  // Validate API key
  const validation = await validateApiKey(db, apiKeyValue);
  if (!validation.valid) {
    return c.json({ error: validation.error }, 401);
  }

  const { apiKeyRecord, endpointRecord, keyHash } = validation;

  // Apply rate limiting
  const rateLimitResult = applyRateLimit(c, keyHash, endpointRecord.rateLimit);
  if (rateLimitResult.limited) {
    return c.json(
      {
        error: "Too Many Requests",
        message: "Rate limit exceeded. Please try again later.",
      },
      429
    );
  }

  const { traces } = c.req.valid("json");

  const now = new Date();
  const insertedIds: string[] = [];

  // Store each trace in the database
  for (const traceData of traces) {
    const id = generateTraceId();
    const spanId = generateSpanId();

    // Determine status from error presence
    const status = traceData.error ? "error" : "success";
    const statusMessage = traceData.error || undefined;

    // Build attributes JSON with extra fields (size-limited for security)
    const attributesObj = {
      aggregatedToolName: traceData.aggregatedToolName,
      serverName: traceData.serverName,
      toolName: traceData.toolName,
      arguments: traceData.arguments,
      result: traceData.result,
      endpointId: endpointRecord.id,
      apiKeyId: apiKeyRecord.id,
    };
    const attributes = JSON.stringify(attributesObj);

    // Prevent DoS via oversized payloads (1MB limit)
    const MAX_ATTRIBUTES_SIZE = 1_000_000;
    if (attributes.length > MAX_ATTRIBUTES_SIZE) {
      console.warn(`Trace ${traceData.traceId} attributes exceed size limit, skipping`);
      continue;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).insert(trace).values({
        id,
        organizationId: endpointRecord.organizationId,
        userId: null, // Gateway traces don't have a user context
        mcpServerId: null, // Could be enhanced to look up server by name
        traceId: traceData.traceId,
        parentSpanId: null,
        spanId,
        name: traceData.aggregatedToolName || traceData.toolName,
        kind: "server", // Gateway is acting as server
        status,
        statusMessage,
        startTime: new Date(traceData.startedAt),
        endTime: traceData.endedAt ? new Date(traceData.endedAt) : null,
        durationMs: traceData.durationMs || null,
        attributes,
        events: null,
        createdAt: now,
      });

      insertedIds.push(id);
    } catch (error) {
      // Sanitize error to avoid leaking sensitive information in logs
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to insert trace ${traceData.traceId}: ${errorMsg}`);
      // Continue with other traces even if one fails
    }
  }

  console.log(`Stored ${insertedIds.length}/${traces.length} traces from gateway`);

  return c.json({
    received: traces.length,
    stored: insertedIds.length,
    message: "Traces processed successfully",
    traceIds: insertedIds,
  });
});

export default gateway;
