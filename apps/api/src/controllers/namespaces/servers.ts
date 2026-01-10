import type { Context } from "hono"
import { eq, and } from "drizzle-orm"
import { getAuthContext, ApiError } from "../../middleware"
import { db } from "../../lib/db-operations"
import { namespaceResource, mcpServer } from "@athreei/db"
import {
  getNamespaceWithAccess,
  generateNamespaceResourceId,
} from "../../services"
import type {
  AddServerInput,
  UpdateServerMappingInput,
} from "../../schemas/namespaces"

export async function addServer(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")
  const { serverId } = (
    c.req as unknown as { valid: (target: "json") => AddServerInput }
  ).valid("json")

  const ns = await getNamespaceWithAccess(namespaceId, auth.userId)

  const server = (await dbQuery.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })) as typeof mcpServer.$inferSelect | null

  if (!server) {
    throw ApiError.notFound("MCP server not found")
  }

  if (server.organizationId !== ns.organizationId) {
    throw ApiError.forbidden("Server does not belong to the same organization")
  }

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

  const mappingId = generateNamespaceResourceId()
  const now = new Date()

  await db().insert(namespaceResource).values({
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

export async function removeServer(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")
  const serverId = c.req.param("serverId")

  await getNamespaceWithAccess(namespaceId, auth.userId)

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

  await db()
    .delete(namespaceResource)
    .where(eq(namespaceResource.id, mapping.id))

  return c.json({ message: "Server removed from namespace successfully" })
}

export async function listServers(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")

  await getNamespaceWithAccess(namespaceId, auth.userId)

  const resourceMappings = (await dbQuery.namespaceResource.findMany({
    where: and(
      eq(namespaceResource.namespaceId, namespaceId),
      eq(namespaceResource.resourceType, "mcp_server")
    ),
  })) as Array<typeof namespaceResource.$inferSelect>

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
}

export async function updateServerMapping(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")
  const serverId = c.req.param("serverId")
  const { enabled } = (
    c.req as unknown as { valid: (target: "json") => UpdateServerMappingInput }
  ).valid("json")

  await getNamespaceWithAccess(namespaceId, auth.userId)

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

  await db()
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
