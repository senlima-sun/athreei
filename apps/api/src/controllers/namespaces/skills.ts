import type { Context } from "hono"
import { eq, and } from "drizzle-orm"
import { getAuthContext, ApiError } from "../../middleware"
import { db } from "../../lib/db-operations"
import { namespaceResource, skill } from "@athreei/db"
import {
  getNamespaceWithAccess,
  generateNamespaceResourceId,
} from "../../services"

interface AddSkillInput {
  skillId: string
}

export async function addSkill(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")
  const { skillId } = (
    c.req as unknown as { valid: (target: "json") => AddSkillInput }
  ).valid("json")

  const ns = await getNamespaceWithAccess(namespaceId, auth.userId)

  const skillRecord = (await dbQuery.skill.findFirst({
    where: eq(skill.id, skillId),
  })) as typeof skill.$inferSelect | null

  if (!skillRecord) {
    throw ApiError.notFound("Skill not found")
  }

  if (skillRecord.organizationId !== ns.organizationId) {
    throw ApiError.forbidden("Skill does not belong to the same organization")
  }

  const existingMapping = await dbQuery.namespaceResource.findFirst({
    where: and(
      eq(namespaceResource.namespaceId, namespaceId),
      eq(namespaceResource.resourceType, "skill"),
      eq(namespaceResource.resourceId, skillId)
    ),
  })

  if (existingMapping) {
    throw ApiError.conflict("Skill is already in this namespace")
  }

  const mappingId = generateNamespaceResourceId()
  const now = new Date()

  await db().insert(namespaceResource).values({
    id: mappingId,
    namespaceId,
    resourceType: "skill",
    resourceId: skillId,
    createdAt: now,
  })

  return c.json(
    {
      mapping: {
        id: mappingId,
        namespaceId,
        skillId,
        createdAt: now,
      },
      skill: {
        id: skillRecord.id,
        name: skillRecord.name,
        description: skillRecord.description,
        isEnabled: skillRecord.isEnabled === "true",
        mappingId,
        addedAt: now,
      },
    },
    201
  )
}

export async function removeSkill(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")
  const skillId = c.req.param("skillId")

  await getNamespaceWithAccess(namespaceId, auth.userId)

  const mapping = (await dbQuery.namespaceResource.findFirst({
    where: and(
      eq(namespaceResource.namespaceId, namespaceId),
      eq(namespaceResource.resourceType, "skill"),
      eq(namespaceResource.resourceId, skillId)
    ),
  })) as typeof namespaceResource.$inferSelect | null

  if (!mapping) {
    throw ApiError.notFound("Skill is not in this namespace")
  }

  await db()
    .delete(namespaceResource)
    .where(eq(namespaceResource.id, mapping.id))

  return c.json({ message: "Skill removed from namespace successfully" })
}

export async function listSkills(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")

  await getNamespaceWithAccess(namespaceId, auth.userId)

  const resourceMappings = (await dbQuery.namespaceResource.findMany({
    where: and(
      eq(namespaceResource.namespaceId, namespaceId),
      eq(namespaceResource.resourceType, "skill")
    ),
  })) as Array<typeof namespaceResource.$inferSelect>

  const skills = await Promise.all(
    resourceMappings.map(async (mapping) => {
      const skillRecord = (await dbQuery.skill.findFirst({
        where: eq(skill.id, mapping.resourceId),
      })) as typeof skill.$inferSelect | null

      if (!skillRecord) return null

      return {
        id: skillRecord.id,
        name: skillRecord.name,
        description: skillRecord.description,
        content: skillRecord.content,
        tags: (() => {
          if (!skillRecord.tags) return []
          try {
            return JSON.parse(skillRecord.tags) as string[]
          } catch {
            return []
          }
        })(),
        isEnabled: skillRecord.isEnabled === "true",
        version: skillRecord.version,
        mappingId: mapping.id,
        addedAt: mapping.createdAt,
        enabled: mapping.enabled ?? true,
      }
    })
  )

  return c.json({
    skills: skills.filter(Boolean),
  })
}

interface UpdateSkillMappingInput {
  enabled: boolean
}

export async function updateSkillMapping(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")
  const skillId = c.req.param("skillId")
  const { enabled } = (
    c.req as unknown as { valid: (target: "json") => UpdateSkillMappingInput }
  ).valid("json")

  await getNamespaceWithAccess(namespaceId, auth.userId)

  const mapping = (await dbQuery.namespaceResource.findFirst({
    where: and(
      eq(namespaceResource.namespaceId, namespaceId),
      eq(namespaceResource.resourceType, "skill"),
      eq(namespaceResource.resourceId, skillId)
    ),
  })) as typeof namespaceResource.$inferSelect | null

  if (!mapping) {
    throw ApiError.notFound("Skill is not in this namespace")
  }

  await db()
    .update(namespaceResource)
    .set({ enabled })
    .where(eq(namespaceResource.id, mapping.id))

  return c.json({
    mapping: {
      id: mapping.id,
      namespaceId,
      skillId,
      enabled,
    },
    message: `Skill ${enabled ? "enabled" : "disabled"} successfully`,
  })
}
