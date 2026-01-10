import type { Context } from "hono"
import { eq, and } from "drizzle-orm"
import { getAuthContext, ApiError } from "../../middleware"
import { db } from "../../lib/db-operations"
import { endpoint, namespace, namespaceResource } from "@athreei/db"
import {
  verifyOrganizationMembership,
  getNamespaceWithAccess,
  generateSlug,
  generateEndpointId,
  generateNamespaceResourceId,
  buildEndpointUrl,
  buildConnectionConfig,
} from "../../services"
import type {
  CreateEndpointInput,
  UpdateEndpointInput,
} from "../../schemas/endpoints"

export async function listEndpoints(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const organizationId = c.req.query("organizationId")
  const namespaceId = c.req.query("namespaceId")
  const status = c.req.query("status")

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

  const allEndpoints = (await dbQuery.endpoint.findMany({
    where: eq(endpoint.organizationId, organizationId),
  })) as Array<typeof endpoint.$inferSelect>

  let filteredEndpoints = allEndpoints
  if (status) {
    filteredEndpoints = filteredEndpoints.filter((ep) => ep.status === status)
  }

  if (namespaceId) {
    const resourceMappings = (await dbQuery.namespaceResource.findMany({
      where: and(
        eq(namespaceResource.namespaceId, namespaceId),
        eq(namespaceResource.resourceType, "endpoint")
      ),
    })) as Array<typeof namespaceResource.$inferSelect>
    const mappedIds = new Set(resourceMappings.map((r) => r.resourceId))
    filteredEndpoints = filteredEndpoints.filter((ep) => mappedIds.has(ep.id))
  }

  const endpointIds = filteredEndpoints.map((ep) => ep.id)
  const allResourceMappings = (await dbQuery.namespaceResource.findMany({
    where: eq(namespaceResource.resourceType, "endpoint"),
  })) as Array<typeof namespaceResource.$inferSelect>

  const endpointNamespaces = new Map<string, string>()
  for (const mapping of allResourceMappings) {
    if (endpointIds.includes(mapping.resourceId)) {
      endpointNamespaces.set(mapping.resourceId, mapping.namespaceId)
    }
  }

  return c.json({
    endpoints: filteredEndpoints.map((ep) => ({
      ...ep,
      namespaceId: endpointNamespaces.get(ep.id) || null,
    })),
  })
}

export async function createEndpoint(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const body = (
    c.req as unknown as { valid: (target: "json") => CreateEndpointInput }
  ).valid("json")

  const ns = await getNamespaceWithAccess(body.namespaceId, auth.userId)

  const baseSlug = generateSlug(body.name)
  let slug = baseSlug
  let counter = 1

  while (true) {
    const existing = await dbQuery.endpoint.findFirst({
      where: eq(endpoint.url, buildEndpointUrl(slug)),
    })
    if (!existing) break
    slug = `${baseSlug}-${counter}`
    counter++
    if (counter > 100) {
      throw ApiError.conflict("Unable to generate unique endpoint URL")
    }
  }

  const now = new Date()
  const endpointId = generateEndpointId()
  const endpointUrl = buildEndpointUrl(slug)

  await db()
    .insert(endpoint)
    .values({
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
    })

  await db().insert(namespaceResource).values({
    id: generateNamespaceResourceId(),
    namespaceId: body.namespaceId,
    resourceType: "endpoint",
    resourceId: endpointId,
    createdAt: now,
  })

  const created = (await dbQuery.endpoint.findFirst({
    where: eq(endpoint.id, endpointId),
  })) as typeof endpoint.$inferSelect

  return c.json(
    {
      endpoint: {
        ...created,
        namespaceId: body.namespaceId,
      },
      connectionConfig: buildConnectionConfig(body.name, endpointUrl),
    },
    201
  )
}

export async function getEndpoint(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const endpointId = c.req.param("id")

  const ep = (await dbQuery.endpoint.findFirst({
    where: eq(endpoint.id, endpointId),
  })) as typeof endpoint.$inferSelect | undefined

  if (!ep) {
    throw ApiError.notFound("Endpoint not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    ep.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this endpoint")
  }

  const resourceMapping = (await dbQuery.namespaceResource.findFirst({
    where: and(
      eq(namespaceResource.resourceType, "endpoint"),
      eq(namespaceResource.resourceId, endpointId)
    ),
  })) as typeof namespaceResource.$inferSelect | undefined

  let namespaceDetails: typeof namespace.$inferSelect | null = null
  if (resourceMapping) {
    namespaceDetails = (await dbQuery.namespace.findFirst({
      where: eq(namespace.id, resourceMapping.namespaceId),
    })) as typeof namespace.$inferSelect | null
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
  })
}

export async function updateEndpoint(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const endpointId = c.req.param("id")
  const updates = (
    c.req as unknown as { valid: (target: "json") => UpdateEndpointInput }
  ).valid("json")

  const ep = (await dbQuery.endpoint.findFirst({
    where: eq(endpoint.id, endpointId),
  })) as typeof endpoint.$inferSelect | undefined

  if (!ep) {
    throw ApiError.notFound("Endpoint not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    ep.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this endpoint")
  }

  const updateData: Partial<typeof endpoint.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (updates.name !== undefined) {
    updateData.name = updates.name
  }
  if (updates.description !== undefined) {
    updateData.description = updates.description
  }
  if (updates.authType !== undefined) {
    updateData.authType = updates.authType
  }
  if (updates.rateLimit !== undefined) {
    updateData.rateLimit = updates.rateLimit
  }
  if (updates.status !== undefined) {
    updateData.status = updates.status
  }

  await db().update(endpoint).set(updateData).where(eq(endpoint.id, endpointId))

  const updated = (await dbQuery.endpoint.findFirst({
    where: eq(endpoint.id, endpointId),
  })) as typeof endpoint.$inferSelect

  const resourceMapping = (await dbQuery.namespaceResource.findFirst({
    where: and(
      eq(namespaceResource.resourceType, "endpoint"),
      eq(namespaceResource.resourceId, endpointId)
    ),
  })) as typeof namespaceResource.$inferSelect | undefined

  return c.json({
    endpoint: {
      ...updated,
      namespaceId: resourceMapping?.namespaceId || null,
    },
  })
}

export async function deleteEndpoint(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const endpointId = c.req.param("id")

  const ep = (await dbQuery.endpoint.findFirst({
    where: eq(endpoint.id, endpointId),
  })) as typeof endpoint.$inferSelect | undefined

  if (!ep) {
    throw ApiError.notFound("Endpoint not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    ep.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this endpoint")
  }

  await db()
    .delete(namespaceResource)
    .where(
      and(
        eq(namespaceResource.resourceType, "endpoint"),
        eq(namespaceResource.resourceId, endpointId)
      )
    )

  await db().delete(endpoint).where(eq(endpoint.id, endpointId))

  return c.json({ message: "Endpoint deleted successfully" })
}
