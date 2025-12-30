/**
 * MCP Server routes
 *
 * CRUD API for MCP Server registry management.
 * Supports listing public registry servers and organization's private servers.
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { eq, and, or, like, sql } from "drizzle-orm";
import { authMiddleware, getAuthContext, ApiError } from "../middleware";
import { getDb, type DatabaseClient } from "../lib/db";
import { mcpServer, mcpTool, member } from "@athreei/db";

const mcpServers = new Hono();

// Apply auth middleware to all MCP server routes
mcpServers.use("*", authMiddleware);

// =============================================================================
// Validation Schemas
// =============================================================================

const transportTypes = ["stdio", "sse", "streamable-http"] as const;
const statusTypes = ["active", "inactive", "pending"] as const;

const createServerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional(),
  transport: z.enum(transportTypes, {
    errorMap: () => ({ message: "Invalid transport type" }),
  }),
  command: z.string().max(500).optional(),
  args: z.string().max(1000).optional(),
  url: z.string().url("Invalid URL").optional(),
  version: z.string().max(50).optional(),
  capabilities: z.string().max(5000).optional(),
});

const updateServerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  transport: z
    .enum(transportTypes, {
      errorMap: () => ({ message: "Invalid transport type" }),
    })
    .optional(),
  command: z.string().max(500).nullable().optional(),
  args: z.string().max(1000).nullable().optional(),
  url: z.string().url("Invalid URL").nullable().optional(),
  status: z
    .enum(statusTypes, {
      errorMap: () => ({ message: "Invalid status" }),
    })
    .optional(),
  version: z.string().max(50).nullable().optional(),
  capabilities: z.string().max(5000).nullable().optional(),
});

const listQuerySchema = z.object({
  status: z.enum(statusTypes).optional(),
  transport: z.enum(transportTypes).optional(),
  search: z.string().max(100).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  organizationId: z.string().min(1, "Organization ID is required"),
});

// =============================================================================
// Helper Functions
// =============================================================================

function generateId(): string {
  return crypto.randomUUID();
}

function now(): Date {
  return new Date();
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

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/mcp-servers
 * List available MCP servers (org's private servers)
 *
 * Query params:
 * - organizationId: Required - filter by organization
 * - status: Filter by status (active, inactive, pending)
 * - transport: Filter by transport type (stdio, sse, streamable-http)
 * - search: Search by name or description
 * - limit: Max results (default 20, max 100)
 * - offset: Pagination offset (default 0)
 */
mcpServers.get("/", zValidator("query", listQuerySchema), async (c) => {
  const db = getDb();
  const auth = getAuthContext(c);
  const { status, transport, search, limit, offset, organizationId } =
    c.req.valid("query");

  // Verify user is a member of the organization
  const isMember = await verifyOrganizationMembership(db, auth.userId, organizationId);
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization");
  }

  // Build the query conditions
  const conditions = [eq(mcpServer.organizationId, organizationId)];

  if (status) {
    conditions.push(eq(mcpServer.status, status));
  }

  if (transport) {
    conditions.push(eq(mcpServer.transport, transport));
  }

  if (search) {
    const searchPattern = "%" + search + "%";
    conditions.push(
      or(
        like(mcpServer.name, searchPattern),
        like(mcpServer.description, searchPattern)
      )!
    );
  }

  // Execute query with filters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const servers = await (db as any)
    .select()
    .from(mcpServer)
    .where(and(...conditions))
    .limit(limit)
    .offset(offset)
    .orderBy(mcpServer.createdAt);

  // Get total count for pagination
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const countResult = await (db as any)
    .select({ count: sql<number>`count(*)` })
    .from(mcpServer)
    .where(and(...conditions));

  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: servers,
    pagination: {
      limit,
      offset,
      total,
      hasMore: offset + servers.length < total,
    },
  });
});

/**
 * GET /api/mcp-servers/:id
 * Get MCP server details including its tools
 */
mcpServers.get("/:id", async (c) => {
  const db = getDb();
  const auth = getAuthContext(c);
  const serverId = c.req.param("id");

  // Fetch server
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server = await (db as any).query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  });

  if (!server) {
    throw ApiError.notFound("MCP server not found");
  }

  // Verify user has access to the organization
  const isMember = await verifyOrganizationMembership(db, auth.userId, server.organizationId);
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this server");
  }

  // Fetch associated tools
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools = await (db as any).query.mcpTool.findMany({
    where: eq(mcpTool.serverId, serverId),
  });

  return c.json({
    ...server,
    tools,
  });
});

/**
 * POST /api/mcp-servers
 * Create a new custom MCP server (private to organization)
 */
mcpServers.post("/", zValidator("json", createServerSchema), async (c) => {
  const db = getDb();
  const auth = getAuthContext(c);
  const body = c.req.valid("json");

  // Get organizationId from query parameter
  const organizationId = c.req.query("organizationId");

  if (!organizationId) {
    throw ApiError.badRequest("organizationId query parameter is required");
  }

  // Verify user is a member of the organization
  const isMember = await verifyOrganizationMembership(db, auth.userId, organizationId);
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization");
  }

  // Validate transport-specific fields
  if (body.transport === "stdio" && !body.command) {
    throw ApiError.badRequest("Command is required for stdio transport");
  }

  if (
    (body.transport === "sse" || body.transport === "streamable-http") &&
    !body.url
  ) {
    throw ApiError.badRequest("URL is required for SSE/HTTP transport");
  }

  const timestamp = now();
  const id = generateId();

  const newServer = {
    id,
    organizationId,
    name: body.name,
    description: body.description ?? null,
    transport: body.transport,
    command: body.command ?? null,
    args: body.args ?? null,
    url: body.url ?? null,
    status: "active" as const,
    version: body.version ?? null,
    capabilities: body.capabilities ?? null,
    lastSeenAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).insert(mcpServer).values(newServer);

  return c.json(newServer, 201);
});

/**
 * PATCH /api/mcp-servers/:id
 * Update an MCP server
 */
mcpServers.patch("/:id", zValidator("json", updateServerSchema), async (c) => {
  const db = getDb();
  const auth = getAuthContext(c);
  const serverId = c.req.param("id");
  const updates = c.req.valid("json");

  // Verify server exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (db as any).query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  });

  if (!existing) {
    throw ApiError.notFound("MCP server not found");
  }

  // Verify user has access to the organization
  const isMember = await verifyOrganizationMembership(db, auth.userId, existing.organizationId);
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this server");
  }

  // Validate transport-specific fields if transport is being updated
  const transport = updates.transport ?? existing.transport;
  const command = updates.command !== undefined ? updates.command : existing.command;
  const url = updates.url !== undefined ? updates.url : existing.url;

  if (transport === "stdio" && !command) {
    throw ApiError.badRequest("Command is required for stdio transport");
  }

  if ((transport === "sse" || transport === "streamable-http") && !url) {
    throw ApiError.badRequest("URL is required for SSE/HTTP transport");
  }

  // Build update object, excluding undefined values
  const updateData: Record<string, unknown> = {
    updatedAt: now(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.transport !== undefined) updateData.transport = updates.transport;
  if (updates.command !== undefined) updateData.command = updates.command;
  if (updates.args !== undefined) updateData.args = updates.args;
  if (updates.url !== undefined) updateData.url = updates.url;
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.version !== undefined) updateData.version = updates.version;
  if (updates.capabilities !== undefined) updateData.capabilities = updates.capabilities;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).update(mcpServer).set(updateData).where(eq(mcpServer.id, serverId));

  // Fetch and return updated server
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await (db as any).query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  });

  return c.json(updated);
});

/**
 * DELETE /api/mcp-servers/:id
 * Delete an MCP server
 */
mcpServers.delete("/:id", async (c) => {
  const db = getDb();
  const auth = getAuthContext(c);
  const serverId = c.req.param("id");

  // Verify server exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (db as any).query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  });

  if (!existing) {
    throw ApiError.notFound("MCP server not found");
  }

  // Verify user has access to the organization
  const isMember = await verifyOrganizationMembership(db, auth.userId, existing.organizationId);
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this server");
  }

  // Delete server (tools will be cascade deleted via foreign key)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).delete(mcpServer).where(eq(mcpServer.id, serverId));

  return c.json({ message: "MCP server deleted successfully" });
});

/**
 * GET /api/mcp-servers/:id/tools
 * List all tools for an MCP server
 */
mcpServers.get("/:id/tools", async (c) => {
  const db = getDb();
  const auth = getAuthContext(c);
  const serverId = c.req.param("id");

  // Verify server exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const server = await (db as any).query.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  });

  if (!server) {
    throw ApiError.notFound("MCP server not found");
  }

  // Verify user has access to the organization
  const isMember = await verifyOrganizationMembership(db, auth.userId, server.organizationId);
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this server");
  }

  // Fetch tools
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools = await (db as any).query.mcpTool.findMany({
    where: eq(mcpTool.serverId, serverId),
  });

  return c.json({
    data: tools,
    total: tools.length,
  });
});

export default mcpServers;
