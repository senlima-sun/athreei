/**
 * Endpoint routes
 *
 * CRUD operations for MCP endpoints (public connection points for AI apps).
 * Each endpoint is associated with a namespace within an organization.
 *
 * URL format: https://athreei.com/mcp/{endpoint-slug}/sse
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { authMiddleware, getAuthContext, ApiError } from "../middleware";
import { getDb, type DatabaseClient } from "../lib/db";
import {
  endpoint,
  namespace,
  namespaceResource,
  member,
} from "@athreei/db";

const endpoints = new Hono();

// Apply auth middleware to all endpoint routes
endpoints.use("*", authMiddleware);

// =============================================================================
// Validation Schemas
// =============================================================================

const createEndpointSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500).optional(),
  namespaceId: z.string().min(1, "Namespace ID is required"),
  authType: z.enum(["api_key", "bearer", "none"]).default("api_key"),
  rateLimit: z.number().int().positive().optional(),
});

const updateEndpointSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  authType: z.enum(["api_key", "bearer", "none"]).optional(),
  rateLimit: z.number().int().positive().nullable().optional(),
  status: z.enum(["active", "inactive", "deprecated"]).optional(),
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate a unique slug for an endpoint name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

/**
 * Generate a unique endpoint ID
 */
function generateId(): string {
  return `ep_${crypto.randomUUID().replace(/-/g, "")}`;
}

/**
 * Generate a unique resource mapping ID
 */
function generateResourceId(): string {
  return `nsr_${crypto.randomUUID().replace(/-/g, "")}`;
}

/**
 * Build the public MCP URL for an endpoint
 */
function buildEndpointUrl(slug: string): string {
  const baseUrl = process.env.PUBLIC_URL || "https://athreei.com";
  return `${baseUrl}/mcp/${slug}/sse`;
}

/**
 * Check if user is a member of the organization
 */
async function verifyOrganizationMembership(
  db: DatabaseClient,
  userId: string,
  organizationId: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membership = await (db as any).query.member.findFirst({
    where: and(
      eq(member.userId, userId),
      eq(member.organizationId, organizationId)
    ),
  });
  return !!membership;
}

/**
 * Get namespace and verify organization access
 */
async function getNamespaceWithAccess(
  db: DatabaseClient,
  namespaceId: string,
  userId: string
): Promise<typeof namespace.$inferSelect> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ns = await (db as any).query.namespace.findFirst({
    where: eq(namespace.id, namespaceId),
  });

  if (!ns) {
    throw ApiError.notFound("Namespace not found");
  }

  const isMember = await verifyOrganizationMembership(db, userId, ns.organizationId);
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this namespace");
  }

  return ns;
}

/**
 * Build connection configuration for AI apps
 */
function buildConnectionConfig(endpointName: string, endpointUrl: string) {
  return {
    claudeDesktop: {
      mcpServers: {
        [endpointName]: {
          url: endpointUrl,
          transport: "sse",
        },
      },
    },
    generic: {
      url: endpointUrl,
      transport: "sse",
    },
  };
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/endpoints
 * List all endpoints for the current organization
 *
 * Query params:
 * - organizationId: required - the organization to list endpoints for
 * - namespaceId: optional - filter by namespace
 * - status: optional - filter by status
 */
endpoints.get("/", async (c) => {
  const db = getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query;
  const auth = getAuthContext(c);
  const organizationId = c.req.query("organizationId");
  const namespaceId = c.req.query("namespaceId");
  const status = c.req.query("status");

  if (!organizationId) {
    throw ApiError.badRequest("organizationId query parameter is required");
  }

  // Verify user is a member of the organization
  const isMember = await verifyOrganizationMembership(db, auth.userId, organizationId);
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization");
  }

  // Get all endpoints for the organization
  const allEndpoints = await dbQuery.endpoint.findMany({
    where: eq(endpoint.organizationId, organizationId),
  }) as Array<typeof endpoint.$inferSelect>;

  // Filter by status if provided
  let filteredEndpoints = allEndpoints;
  if (status) {
    filteredEndpoints = filteredEndpoints.filter((ep) => ep.status === status);
  }

  // If namespaceId filter is provided, filter by namespace resource mapping
  if (namespaceId) {
    const resourceMappings = await dbQuery.namespaceResource.findMany({
      where: and(
        eq(namespaceResource.namespaceId, namespaceId),
        eq(namespaceResource.resourceType, "endpoint")
      ),
    }) as Array<typeof namespaceResource.$inferSelect>;
    const mappedIds = new Set(resourceMappings.map((r) => r.resourceId));
    filteredEndpoints = filteredEndpoints.filter((ep) => mappedIds.has(ep.id));
  }

  // Get namespace mappings for all endpoints
  const endpointIds = filteredEndpoints.map((ep) => ep.id);
  const allResourceMappings = await dbQuery.namespaceResource.findMany({
    where: eq(namespaceResource.resourceType, "endpoint"),
  }) as Array<typeof namespaceResource.$inferSelect>;

  const endpointNamespaces = new Map<string, string>();
  for (const mapping of allResourceMappings) {
    if (endpointIds.includes(mapping.resourceId)) {
      endpointNamespaces.set(mapping.resourceId, mapping.namespaceId);
    }
  }

  return c.json({
    endpoints: filteredEndpoints.map((ep) => ({
      ...ep,
      namespaceId: endpointNamespaces.get(ep.id) || null,
    })),
  });
});

/**
 * POST /api/endpoints
 * Create a new endpoint
 */
endpoints.post("/", zValidator("json", createEndpointSchema), async (c) => {
  const db = getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query;
  const auth = getAuthContext(c);
  const body = c.req.valid("json");

  // Verify namespace exists and user has access
  const ns = await getNamespaceWithAccess(db, body.namespaceId, auth.userId);

  // Generate unique slug from name
  const baseSlug = generateSlug(body.name);
  let slug = baseSlug;
  let counter = 1;

  // Check for slug uniqueness and increment if needed
  while (true) {
    const existing = await dbQuery.endpoint.findFirst({
      where: eq(endpoint.url, buildEndpointUrl(slug)),
    });
    if (!existing) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
    if (counter > 100) {
      throw ApiError.conflict("Unable to generate unique endpoint URL");
    }
  }

  const now = new Date();
  const endpointId = generateId();
  const endpointUrl = buildEndpointUrl(slug);

  // Create the endpoint
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).insert(endpoint).values({
    id: endpointId,
    organizationId: ns.organizationId,
    name: body.name,
    description: body.description || null,
    url: endpointUrl,
    method: "POST",
    authType: body.authType,
    rateLimit: body.rateLimit || null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  // Create namespace resource mapping
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).insert(namespaceResource).values({
    id: generateResourceId(),
    namespaceId: body.namespaceId,
    resourceType: "endpoint",
    resourceId: endpointId,
    createdAt: now,
  });

  // Fetch the created endpoint
  const created = await dbQuery.endpoint.findFirst({
    where: eq(endpoint.id, endpointId),
  }) as typeof endpoint.$inferSelect;

  return c.json(
    {
      endpoint: {
        ...created,
        namespaceId: body.namespaceId,
      },
      connectionConfig: buildConnectionConfig(body.name, endpointUrl),
    },
    201
  );
});

/**
 * GET /api/endpoints/:id
 * Get endpoint details with connection configuration
 */
endpoints.get("/:id", async (c) => {
  const db = getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query;
  const auth = getAuthContext(c);
  const endpointId = c.req.param("id");

  // Get the endpoint
  const ep = await dbQuery.endpoint.findFirst({
    where: eq(endpoint.id, endpointId),
  }) as typeof endpoint.$inferSelect | undefined;

  if (!ep) {
    throw ApiError.notFound("Endpoint not found");
  }

  // Verify user has access to the organization
  const isMember = await verifyOrganizationMembership(db, auth.userId, ep.organizationId);
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this endpoint");
  }

  // Get namespace mapping
  const resourceMapping = await dbQuery.namespaceResource.findFirst({
    where: and(
      eq(namespaceResource.resourceType, "endpoint"),
      eq(namespaceResource.resourceId, endpointId)
    ),
  }) as typeof namespaceResource.$inferSelect | undefined;

  // Get namespace details if mapped
  let namespaceDetails: typeof namespace.$inferSelect | null = null;
  if (resourceMapping) {
    namespaceDetails = await dbQuery.namespace.findFirst({
      where: eq(namespace.id, resourceMapping.namespaceId),
    }) as typeof namespace.$inferSelect | null;
  }

  return c.json({
    endpoint: {
      ...ep,
      namespaceId: resourceMapping?.namespaceId || null,
      namespace: namespaceDetails
        ? {
            id: namespaceDetails.id,
            name: namespaceDetails.name,
            slug: namespaceDetails.slug,
          }
        : null,
    },
    connectionConfig: buildConnectionConfig(ep.name, ep.url),
  });
});

/**
 * PATCH /api/endpoints/:id
 * Update an endpoint
 */
endpoints.patch("/:id", zValidator("json", updateEndpointSchema), async (c) => {
  const db = getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query;
  const auth = getAuthContext(c);
  const endpointId = c.req.param("id");
  const updates = c.req.valid("json");

  // Get the endpoint
  const ep = await dbQuery.endpoint.findFirst({
    where: eq(endpoint.id, endpointId),
  }) as typeof endpoint.$inferSelect | undefined;

  if (!ep) {
    throw ApiError.notFound("Endpoint not found");
  }

  // Verify user has access to the organization
  const isMember = await verifyOrganizationMembership(db, auth.userId, ep.organizationId);
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this endpoint");
  }

  // Build update object
  const updateData: Partial<typeof endpoint.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (updates.name !== undefined) {
    updateData.name = updates.name;
  }
  if (updates.description !== undefined) {
    updateData.description = updates.description;
  }
  if (updates.authType !== undefined) {
    updateData.authType = updates.authType;
  }
  if (updates.rateLimit !== undefined) {
    updateData.rateLimit = updates.rateLimit;
  }
  if (updates.status !== undefined) {
    updateData.status = updates.status;
  }

  // Update the endpoint
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .update(endpoint)
    .set(updateData)
    .where(eq(endpoint.id, endpointId));

  // Fetch the updated endpoint
  const updated = await dbQuery.endpoint.findFirst({
    where: eq(endpoint.id, endpointId),
  }) as typeof endpoint.$inferSelect;

  // Get namespace mapping
  const resourceMapping = await dbQuery.namespaceResource.findFirst({
    where: and(
      eq(namespaceResource.resourceType, "endpoint"),
      eq(namespaceResource.resourceId, endpointId)
    ),
  }) as typeof namespaceResource.$inferSelect | undefined;

  return c.json({
    endpoint: {
      ...updated,
      namespaceId: resourceMapping?.namespaceId || null,
    },
  });
});

/**
 * DELETE /api/endpoints/:id
 * Delete an endpoint
 */
endpoints.delete("/:id", async (c) => {
  const db = getDb();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query;
  const auth = getAuthContext(c);
  const endpointId = c.req.param("id");

  // Get the endpoint
  const ep = await dbQuery.endpoint.findFirst({
    where: eq(endpoint.id, endpointId),
  }) as typeof endpoint.$inferSelect | undefined;

  if (!ep) {
    throw ApiError.notFound("Endpoint not found");
  }

  // Verify user has access to the organization
  const isMember = await verifyOrganizationMembership(db, auth.userId, ep.organizationId);
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this endpoint");
  }

  // Delete namespace resource mapping first (due to foreign key constraints)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .delete(namespaceResource)
    .where(
      and(
        eq(namespaceResource.resourceType, "endpoint"),
        eq(namespaceResource.resourceId, endpointId)
      )
    );

  // Delete the endpoint
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).delete(endpoint).where(eq(endpoint.id, endpointId));

  return c.json({ message: "Endpoint deleted successfully" });
});

export default endpoints;
