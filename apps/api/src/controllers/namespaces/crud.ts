import type { Context } from "hono"
import { eq, and } from "drizzle-orm"
import { getAuthContext, getOrgContext, ApiError } from "../../middleware"
import { db } from "../../lib/db-operations"
import { namespace, namespaceResource, mcpServer } from "@athreei/db"
import {
  getNamespaceWithAccess,
  generateNamespaceId,
  generateSlug,
} from "../../services"
import type {
  CreateNamespaceInput,
  UpdateNamespaceInput,
} from "../../schemas/namespaces"

export async function listNamespaces(c: Context): Promise<Response> {
  const dbQuery = db().query
  const { organizationId } = getOrgContext(c)

  const allNamespaces = (await dbQuery.namespace.findMany({
    where: eq(namespace.organizationId, organizationId),
    orderBy: namespace.createdAt,
  })) as Array<typeof namespace.$inferSelect>

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
}

export async function createNamespace(c: Context): Promise<Response> {
  const dbQuery = db().query
  const { organizationId } = getOrgContext(c)
  const body = (
    c.req as unknown as { valid: (target: "json") => CreateNamespaceInput }
  ).valid("json")

  const baseSlug = generateSlug(body.name)
  let slug = baseSlug
  let counter = 1

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

  if (body.isDefault) {
    const existingDefaults = (await dbQuery.namespace.findMany({
      where: and(
        eq(namespace.organizationId, organizationId),
        eq(namespace.isDefault, true)
      ),
    })) as Array<typeof namespace.$inferSelect>

    for (const existing of existingDefaults) {
      await db()
        .update(namespace)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(namespace.id, existing.id))
    }
  }

  const now = new Date()
  const namespaceId = generateNamespaceId()

  await db()
    .insert(namespace)
    .values({
      id: namespaceId,
      organizationId,
      name: body.name,
      slug,
      description: body.description || null,
      isDefault: body.isDefault,
      createdAt: now,
      updatedAt: now,
    })

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
}

export async function getNamespace(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")

  const ns = await getNamespaceWithAccess(namespaceId, auth.userId)

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

  const validServers = servers.filter(Boolean)

  return c.json({
    namespace: {
      ...ns,
      serverCount: validServers.length,
    },
    servers: validServers,
  })
}

export async function updateNamespace(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")
  const updates = (
    c.req as unknown as { valid: (target: "json") => UpdateNamespaceInput }
  ).valid("json")

  const ns = await getNamespaceWithAccess(namespaceId, auth.userId)

  if (updates.isDefault === true) {
    const existingDefaults = (await dbQuery.namespace.findMany({
      where: and(
        eq(namespace.organizationId, ns.organizationId),
        eq(namespace.isDefault, true)
      ),
    })) as Array<typeof namespace.$inferSelect>

    for (const existing of existingDefaults) {
      if (existing.id !== namespaceId) {
        await db()
          .update(namespace)
          .set({ isDefault: false, updatedAt: new Date() })
          .where(eq(namespace.id, existing.id))
      }
    }
  }

  const updateData: Partial<typeof namespace.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (updates.name !== undefined) {
    updateData.name = updates.name
    updateData.slug = generateSlug(updates.name)

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

  await db()
    .update(namespace)
    .set(updateData)
    .where(eq(namespace.id, namespaceId))

  const updated = (await dbQuery.namespace.findFirst({
    where: eq(namespace.id, namespaceId),
  })) as typeof namespace.$inferSelect

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

export async function deleteNamespace(c: Context): Promise<Response> {
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")

  const ns = await getNamespaceWithAccess(namespaceId, auth.userId)

  if (ns.isDefault) {
    throw ApiError.badRequest(
      "Cannot delete the default namespace. Set another namespace as default first."
    )
  }

  await db()
    .delete(namespaceResource)
    .where(eq(namespaceResource.namespaceId, namespaceId))

  await db().delete(namespace).where(eq(namespace.id, namespaceId))

  return c.json({ message: "Namespace deleted successfully" })
}
