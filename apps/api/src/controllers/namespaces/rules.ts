import type { Context } from "hono"
import { eq, and } from "drizzle-orm"
import { getAuthContext, ApiError } from "../../middleware"
import { db } from "../../lib/db-operations"
import { namespaceResource, rule } from "@athreei/db"
import {
  getNamespaceWithAccess,
  generateNamespaceResourceId,
} from "../../services"

interface AddRuleInput {
  ruleId: string
}

export async function addRule(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")
  const { ruleId } = (
    c.req as unknown as { valid: (target: "json") => AddRuleInput }
  ).valid("json")

  const ns = await getNamespaceWithAccess(namespaceId, auth.userId)

  const ruleRecord = (await dbQuery.rule.findFirst({
    where: eq(rule.id, ruleId),
  })) as typeof rule.$inferSelect | null

  if (!ruleRecord) {
    throw ApiError.notFound("Rule not found")
  }

  if (ruleRecord.organizationId !== ns.organizationId) {
    throw ApiError.forbidden("Rule does not belong to the same organization")
  }

  const existingMapping = await dbQuery.namespaceResource.findFirst({
    where: and(
      eq(namespaceResource.namespaceId, namespaceId),
      eq(namespaceResource.resourceType, "rule"),
      eq(namespaceResource.resourceId, ruleId)
    ),
  })

  if (existingMapping) {
    throw ApiError.conflict("Rule is already in this namespace")
  }

  const mappingId = generateNamespaceResourceId()
  const now = new Date()

  await db().insert(namespaceResource).values({
    id: mappingId,
    namespaceId,
    resourceType: "rule",
    resourceId: ruleId,
    createdAt: now,
  })

  return c.json(
    {
      mapping: {
        id: mappingId,
        namespaceId,
        ruleId,
        createdAt: now,
      },
      rule: {
        id: ruleRecord.id,
        name: ruleRecord.name,
        description: ruleRecord.description,
        priority: ruleRecord.priority,
        scope: ruleRecord.scope,
        isEnabled: ruleRecord.isEnabled === "true",
        mappingId,
        addedAt: now,
      },
    },
    201
  )
}

export async function removeRule(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")
  const ruleId = c.req.param("ruleId")

  await getNamespaceWithAccess(namespaceId, auth.userId)

  const mapping = (await dbQuery.namespaceResource.findFirst({
    where: and(
      eq(namespaceResource.namespaceId, namespaceId),
      eq(namespaceResource.resourceType, "rule"),
      eq(namespaceResource.resourceId, ruleId)
    ),
  })) as typeof namespaceResource.$inferSelect | null

  if (!mapping) {
    throw ApiError.notFound("Rule is not in this namespace")
  }

  await db()
    .delete(namespaceResource)
    .where(eq(namespaceResource.id, mapping.id))

  return c.json({ message: "Rule removed from namespace successfully" })
}

export async function listRules(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")

  await getNamespaceWithAccess(namespaceId, auth.userId)

  const resourceMappings = (await dbQuery.namespaceResource.findMany({
    where: and(
      eq(namespaceResource.namespaceId, namespaceId),
      eq(namespaceResource.resourceType, "rule")
    ),
  })) as Array<typeof namespaceResource.$inferSelect>

  const rules = await Promise.all(
    resourceMappings.map(async (mapping) => {
      const ruleRecord = (await dbQuery.rule.findFirst({
        where: eq(rule.id, mapping.resourceId),
      })) as typeof rule.$inferSelect | null

      if (!ruleRecord) return null

      return {
        id: ruleRecord.id,
        name: ruleRecord.name,
        description: ruleRecord.description,
        content: ruleRecord.content,
        priority: ruleRecord.priority,
        scope: ruleRecord.scope,
        isEnabled: ruleRecord.isEnabled === "true",
        mappingId: mapping.id,
        addedAt: mapping.createdAt,
        enabled: mapping.enabled ?? true,
      }
    })
  )

  const sortedRules = rules.filter(Boolean).sort((a, b) => {
    if (a && b) {
      return b.priority - a.priority
    }
    return 0
  })

  return c.json({
    rules: sortedRules,
  })
}

interface UpdateRuleMappingInput {
  enabled: boolean
}

export async function updateRuleMapping(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")
  const ruleId = c.req.param("ruleId")
  const { enabled } = (
    c.req as unknown as { valid: (target: "json") => UpdateRuleMappingInput }
  ).valid("json")

  await getNamespaceWithAccess(namespaceId, auth.userId)

  const mapping = (await dbQuery.namespaceResource.findFirst({
    where: and(
      eq(namespaceResource.namespaceId, namespaceId),
      eq(namespaceResource.resourceType, "rule"),
      eq(namespaceResource.resourceId, ruleId)
    ),
  })) as typeof namespaceResource.$inferSelect | null

  if (!mapping) {
    throw ApiError.notFound("Rule is not in this namespace")
  }

  await db()
    .update(namespaceResource)
    .set({ enabled })
    .where(eq(namespaceResource.id, mapping.id))

  return c.json({
    mapping: {
      id: mapping.id,
      namespaceId,
      ruleId,
      enabled,
    },
    message: `Rule ${enabled ? "enabled" : "disabled"} successfully`,
  })
}
