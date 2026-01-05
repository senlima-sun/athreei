/**
 * Namespace routes
 *
 * CRUD operations for namespaces - logical groupings of MCP servers
 * within an organization (similar to Kubernetes namespaces).
 *
 * Use cases:
 * - Environment separation (production, staging, development)
 * - Team/project isolation
 * - Granular API key scoping
 */

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq, and } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { getDb } from "../lib/db"
import { namespace, namespaceResource, mcpServer } from "@athreei/db"

// Import extracted schemas
import {
  createNamespaceSchema,
  updateNamespaceSchema,
  addServerSchema,
  updateServerMappingSchema,
} from "../schemas/namespaces"

// Import extracted services
import {
  verifyOrganizationMembership,
  getNamespaceWithAccess,
  generateNamespaceId,
  generateNamespaceResourceId,
  generateSlug,
} from "../services"

const namespaces = new Hono()

// Apply auth middleware to all namespace routes
namespaces.use("*", authMiddleware)

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/namespaces
 * List all namespaces for an organization
 *
 * Query params:
 * - organizationId: required - the organization to list namespaces for
 */
namespaces.get("/", async (c) => {
  const db = getDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query
  const auth = getAuthContext(c)
  const organizationId = c.req.query("organizationId")

  if (!organizationId) {
    throw ApiError.badRequest("organizationId query parameter is required")
  }

  // Verify user is a member of the organization
  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  // Get all namespaces for the organization
  const allNamespaces = (await dbQuery.namespace.findMany({
    where: eq(namespace.organizationId, organizationId),
    orderBy: namespace.createdAt,
  })) as Array<typeof namespace.$inferSelect>

  // Get server counts for each namespace
  const namespacesWithCounts = await Promise.all(
    allNamespaces.map(async (ns) => {
      const resources = (await dbQuery.namespaceResource.findMany({
        where: and(
          eq(namespaceResource.namespaceId, ns.id),
          eq(namespaceResource.resourceType, "mcp_server")
        ),
      })) as Array<typeof namespaceResource.$inferSelect>

      return {
        ...ns,
        serverCount: resources.length,
      }
    })
  )

  return c.json({
    namespaces: namespacesWithCounts,
  })
})

/**
 * POST /api/namespaces
 * Create a new namespace
 */
namespaces.post("/", zValidator("json", createNamespaceSchema), async (c) => {
  const db = getDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query
  const auth = getAuthContext(c)
  const body = c.req.valid("json")
  const organizationId = c.req.query("organizationId")

  if (!organizationId) {
    throw ApiError.badRequest("organizationId query parameter is required")
  }

  // Verify user is a member of the organization
  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  // Generate unique slug from name
  const baseSlug = generateSlug(body.name)
  let slug = baseSlug
  let counter = 1

  // Check for slug uniqueness within the organization
  while (true) {
    const existing = await dbQuery.namespace.findFirst({
      where: and(
        eq(namespace.organizationId, organizationId),
        eq(namespace.slug, slug)
      ),
    })
    if (!existing) break
    slug = `${baseSlug}-${counter}`
    counter++
    if (counter > 100) {
      throw ApiError.conflict("Unable to generate unique namespace slug")
    }
  }

  // If setting as default, unset other defaults
  if (body.isDefault) {
    const existingDefaults = (await dbQuery.namespace.findMany({
      where: and(
        eq(namespace.organizationId, organizationId),
        eq(namespace.isDefault, true)
      ),
    })) as Array<typeof namespace.$inferSelect>

    for (const existing of existingDefaults) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any)
        .update(namespace)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(namespace.id, existing.id))
    }
  }

  const now = new Date()
  const namespaceId = generateNamespaceId()

  // Create the namespace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).insert(namespace).values({
    id: namespaceId,
    organizationId,
    name: body.name,
    slug,
    description: body.description || null,
    isDefault: body.isDefault,
    createdAt: now,
    updatedAt: now,
  })

  // Fetch the created namespace
  const created = (await dbQuery.namespace.findFirst({
    where: eq(namespace.id, namespaceId),
  })) as typeof namespace.$inferSelect

  return c.json(
    {
      namespace: {
        ...created,
        serverCount: 0,
      },
    },
    201
  )
})

/**
 * GET /api/namespaces/:id
 * Get namespace details with associated servers
 */
namespaces.get("/:id", async (c) => {
  const db = getDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")

  // Get the namespace and verify access
  const ns = await getNamespaceWithAccess(db, namespaceId, auth.userId)

  // Get associated MCP servers
  const resourceMappings = (await dbQuery.namespaceResource.findMany({
    where: and(
      eq(namespaceResource.namespaceId, namespaceId),
      eq(namespaceResource.resourceType, "mcp_server")
    ),
  })) as Array<typeof namespaceResource.$inferSelect>

  // Fetch server details for each mapping
  const servers = await Promise.all(
    resourceMappings.map(async (mapping) => {
      const server = (await dbQuery.mcpServer.findFirst({
        where: eq(mcpServer.id, mapping.resourceId),
      })) as typeof mcpServer.$inferSelect | null

      if (!server) return null

      return {
        ...server,
        mappingId: mapping.id,
        addedAt: mapping.createdAt,
        enabled: mapping.enabled ?? true,
      }
    })
  )

  // Filter out null values (servers that may have been deleted)
  const validServers = servers.filter(Boolean)

  return c.json({
    namespace: {
      ...ns,
      serverCount: validServers.length,
    },
    servers: validServers,
  })
})

/**
 * PATCH /api/namespaces/:id
 * Update a namespace
 */
namespaces.patch(
  "/:id",
  zValidator("json", updateNamespaceSchema),
  async (c) => {
    const db = getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbQuery = (db as any).query
    const auth = getAuthContext(c)
    const namespaceId = c.req.param("id")
    const updates = c.req.valid("json")

    // Get the namespace and verify access
    const ns = await getNamespaceWithAccess(db, namespaceId, auth.userId)

    // If setting as default, unset other defaults
    if (updates.isDefault === true) {
      const existingDefaults = (await dbQuery.namespace.findMany({
        where: and(
          eq(namespace.organizationId, ns.organizationId),
          eq(namespace.isDefault, true)
        ),
      })) as Array<typeof namespace.$inferSelect>

      for (const existing of existingDefaults) {
        if (existing.id !== namespaceId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (db as any)
            .update(namespace)
            .set({ isDefault: false, updatedAt: new Date() })
            .where(eq(namespace.id, existing.id))
        }
      }
    }

    // Build update object
    const updateData: Partial<typeof namespace.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (updates.name !== undefined) {
      updateData.name = updates.name
      // Update slug if name changes
      updateData.slug = generateSlug(updates.name)

      // Check slug uniqueness
      let slug = updateData.slug
      let counter = 1
      while (true) {
        const existing = await dbQuery.namespace.findFirst({
          where: and(
            eq(namespace.organizationId, ns.organizationId),
            eq(namespace.slug, slug)
          ),
        })
        if (!existing || existing.id === namespaceId) break
        slug = `${updateData.slug}-${counter}`
        counter++
        if (counter > 100) {
          throw ApiError.conflict("Unable to generate unique namespace slug")
        }
      }
      updateData.slug = slug
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description
    }
    if (updates.isDefault !== undefined) {
      updateData.isDefault = updates.isDefault
    }

    // Update the namespace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .update(namespace)
      .set(updateData)
      .where(eq(namespace.id, namespaceId))

    // Fetch the updated namespace
    const updated = (await dbQuery.namespace.findFirst({
      where: eq(namespace.id, namespaceId),
    })) as typeof namespace.$inferSelect

    // Get server count
    const resources = (await dbQuery.namespaceResource.findMany({
      where: and(
        eq(namespaceResource.namespaceId, namespaceId),
        eq(namespaceResource.resourceType, "mcp_server")
      ),
    })) as Array<typeof namespaceResource.$inferSelect>

    return c.json({
      namespace: {
        ...updated,
        serverCount: resources.length,
      },
    })
  }
)

/**
 * DELETE /api/namespaces/:id
 * Delete a namespace
 */
namespaces.delete("/:id", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")

  // Get the namespace and verify access
  const ns = await getNamespaceWithAccess(db, namespaceId, auth.userId)

  // Prevent deletion of default namespace
  if (ns.isDefault) {
    throw ApiError.badRequest(
      "Cannot delete the default namespace. Set another namespace as default first."
    )
  }

  // Delete namespace resource mappings first (cascade should handle this, but being explicit)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .delete(namespaceResource)
    .where(eq(namespaceResource.namespaceId, namespaceId))

  // Delete the namespace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).delete(namespace).where(eq(namespace.id, namespaceId))

  return c.json({ message: "Namespace deleted successfully" })
})

// =============================================================================
// Server Mapping Routes
// =============================================================================

/**
 * POST /api/namespaces/:id/servers
 * Add an MCP server to a namespace
 */
namespaces.post(
  "/:id/servers",
  zValidator("json", addServerSchema),
  async (c) => {
    const db = getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbQuery = (db as any).query
    const auth = getAuthContext(c)
    const namespaceId = c.req.param("id")
    const { serverId } = c.req.valid("json")

    // Get the namespace and verify access
    const ns = await getNamespaceWithAccess(db, namespaceId, auth.userId)

    // Verify the server exists and belongs to the same organization
    const server = (await dbQuery.mcpServer.findFirst({
      where: eq(mcpServer.id, serverId),
    })) as typeof mcpServer.$inferSelect | null

    if (!server) {
      throw ApiError.notFound("MCP server not found")
    }

    if (server.organizationId !== ns.organizationId) {
      throw ApiError.forbidden(
        "Server does not belong to the same organization"
      )
    }

    // Check if server is already in the namespace
    const existingMapping = await dbQuery.namespaceResource.findFirst({
      where: and(
        eq(namespaceResource.namespaceId, namespaceId),
        eq(namespaceResource.resourceType, "mcp_server"),
        eq(namespaceResource.resourceId, serverId)
      ),
    })

    if (existingMapping) {
      throw ApiError.conflict("Server is already in this namespace")
    }

    // Create the mapping
    const mappingId = generateNamespaceResourceId()
    const now = new Date()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).insert(namespaceResource).values({
      id: mappingId,
      namespaceId,
      resourceType: "mcp_server",
      resourceId: serverId,
      createdAt: now,
    })

    return c.json(
      {
        mapping: {
          id: mappingId,
          namespaceId,
          serverId,
          createdAt: now,
        },
        server: {
          ...server,
          mappingId,
          addedAt: now,
        },
      },
      201
    )
  }
)

/**
 * DELETE /api/namespaces/:id/servers/:serverId
 * Remove an MCP server from a namespace
 */
namespaces.delete("/:id/servers/:serverId", async (c) => {
  const db = getDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")
  const serverId = c.req.param("serverId")

  // Get the namespace and verify access
  await getNamespaceWithAccess(db, namespaceId, auth.userId)

  // Find the mapping
  const mapping = (await dbQuery.namespaceResource.findFirst({
    where: and(
      eq(namespaceResource.namespaceId, namespaceId),
      eq(namespaceResource.resourceType, "mcp_server"),
      eq(namespaceResource.resourceId, serverId)
    ),
  })) as typeof namespaceResource.$inferSelect | null

  if (!mapping) {
    throw ApiError.notFound("Server is not in this namespace")
  }

  // Delete the mapping
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .delete(namespaceResource)
    .where(eq(namespaceResource.id, mapping.id))

  return c.json({ message: "Server removed from namespace successfully" })
})

/**
 * GET /api/namespaces/:id/servers
 * List all servers in a namespace
 */
namespaces.get("/:id/servers", async (c) => {
  const db = getDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")

  // Get the namespace and verify access
  await getNamespaceWithAccess(db, namespaceId, auth.userId)

  // Get server mappings
  const resourceMappings = (await dbQuery.namespaceResource.findMany({
    where: and(
      eq(namespaceResource.namespaceId, namespaceId),
      eq(namespaceResource.resourceType, "mcp_server")
    ),
  })) as Array<typeof namespaceResource.$inferSelect>

  // Fetch server details
  const servers = await Promise.all(
    resourceMappings.map(async (mapping) => {
      const server = (await dbQuery.mcpServer.findFirst({
        where: eq(mcpServer.id, mapping.resourceId),
      })) as typeof mcpServer.$inferSelect | null

      if (!server) return null

      return {
        ...server,
        mappingId: mapping.id,
        addedAt: mapping.createdAt,
        enabled: mapping.enabled ?? true,
      }
    })
  )

  return c.json({
    servers: servers.filter(Boolean),
  })
})

/**
 * PATCH /api/namespaces/:id/servers/:serverId
 * Update server mapping status (enabled/disabled) in a namespace
 */
namespaces.patch(
  "/:id/servers/:serverId",
  zValidator("json", updateServerMappingSchema),
  async (c) => {
    const db = getDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbQuery = (db as any).query
    const auth = getAuthContext(c)
    const namespaceId = c.req.param("id")
    const serverId = c.req.param("serverId")
    const { enabled } = c.req.valid("json")

    // Get the namespace and verify access
    await getNamespaceWithAccess(db, namespaceId, auth.userId)

    // Find the mapping
    const mapping = (await dbQuery.namespaceResource.findFirst({
      where: and(
        eq(namespaceResource.namespaceId, namespaceId),
        eq(namespaceResource.resourceType, "mcp_server"),
        eq(namespaceResource.resourceId, serverId)
      ),
    })) as typeof namespaceResource.$inferSelect | null

    if (!mapping) {
      throw ApiError.notFound("Server is not in this namespace")
    }

    // Update the mapping
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .update(namespaceResource)
      .set({ enabled })
      .where(eq(namespaceResource.id, mapping.id))

    return c.json({
      mapping: {
        id: mapping.id,
        namespaceId,
        serverId,
        enabled,
      },
      message: `Server ${enabled ? "enabled" : "disabled"} successfully`,
    })
  }
)

export default namespaces
