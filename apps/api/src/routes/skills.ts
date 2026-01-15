import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq, and } from "drizzle-orm"
import {
  authMiddleware,
  getAuthContext,
  ApiError,
  withOrgFromQuery,
  getOrgContext,
} from "../middleware"
import { db } from "../lib/db-operations"
import { skill } from "@athreei/db"
import {
  createSkillSchema,
  updateSkillSchema,
  listSkillsQuerySchema,
} from "../schemas/skills"
import { verifyOrganizationMembership } from "../services"

const skills = new Hono()

skills.use("*", authMiddleware)

skills.get(
  "/",
  withOrgFromQuery,
  zValidator("query", listSkillsQuerySchema),
  async (c) => {
    const { organizationId } = getOrgContext(c)
    const { search, isEnabled, tag } = c.req.valid("query")

    const conditions = [eq(skill.organizationId, organizationId)]

    if (isEnabled !== undefined) {
      conditions.push(eq(skill.isEnabled, isEnabled))
    }

    const skillsList = await db().query.skill.findMany({
      where: and(...conditions),
    })

    let filteredSkills = skillsList

    if (search) {
      const searchLower = search.toLowerCase()
      filteredSkills = filteredSkills.filter(
        (s) =>
          s.name.toLowerCase().includes(searchLower) ||
          (s.description && s.description.toLowerCase().includes(searchLower))
      )
    }

    if (tag) {
      filteredSkills = filteredSkills.filter((s) => {
        if (!s.tags) return false
        try {
          const tags = JSON.parse(s.tags) as string[]
          return tags.includes(tag)
        } catch {
          return false
        }
      })
    }

    return c.json({
      skills: filteredSkills.map((s) => ({
        id: s.id,
        organizationId: s.organizationId,
        name: s.name,
        description: s.description,
        content: s.content,
        tags: (() => {
          if (!s.tags) return []
          try {
            return JSON.parse(s.tags) as string[]
          } catch {
            return []
          }
        })(),
        isEnabled: s.isEnabled === "true",
        version: s.version,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
    })
  }
)

skills.get("/:id", async (c) => {
  const auth = getAuthContext(c)
  const { id } = c.req.param()

  const foundSkill = await db().query.skill.findFirst({
    where: eq(skill.id, id),
  })

  if (!foundSkill) {
    throw ApiError.notFound("Skill not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    foundSkill.organizationId
  )

  if (!isMember) {
    throw ApiError.forbidden("Access denied")
  }

  return c.json({
    skill: {
      id: foundSkill.id,
      organizationId: foundSkill.organizationId,
      name: foundSkill.name,
      description: foundSkill.description,
      content: foundSkill.content,
      tags: (() => {
        if (!foundSkill.tags) return []
        try {
          return JSON.parse(foundSkill.tags) as string[]
        } catch {
          return []
        }
      })(),
      isEnabled: foundSkill.isEnabled === "true",
      version: foundSkill.version,
      createdAt: foundSkill.createdAt,
      updatedAt: foundSkill.updatedAt,
    },
  })
})

skills.post(
  "/",
  withOrgFromQuery,
  zValidator("json", createSkillSchema),
  async (c) => {
    const { organizationId } = getOrgContext(c)
    const input = c.req.valid("json")

    const now = new Date()
    const newSkill = {
      id: crypto.randomUUID(),
      organizationId,
      name: input.name,
      description: input.description ?? null,
      content: input.content,
      tags: input.tags ? JSON.stringify(input.tags) : null,
      isEnabled: input.isEnabled ? "true" : "false",
      version: 1,
      createdAt: now,
      updatedAt: now,
    }

    const [created] = await db().insert(skill).values(newSkill).returning()

    return c.json(
      {
        skill: {
          id: created.id,
          organizationId: created.organizationId,
          name: created.name,
          description: created.description,
          content: created.content,
          tags: (() => {
            if (!created.tags) return []
            try {
              return JSON.parse(created.tags) as string[]
            } catch {
              return []
            }
          })(),
          isEnabled: created.isEnabled === "true",
          version: created.version,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
      },
      201
    )
  }
)

skills.patch("/:id", zValidator("json", updateSkillSchema), async (c) => {
  const auth = getAuthContext(c)
  const { id } = c.req.param()
  const updates = c.req.valid("json")

  const foundSkill = await db().query.skill.findFirst({
    where: eq(skill.id, id),
  })

  if (!foundSkill) {
    throw ApiError.notFound("Skill not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    foundSkill.organizationId
  )

  if (!isMember) {
    throw ApiError.forbidden("Access denied")
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (updates.name !== undefined) {
    updateData.name = updates.name
  }
  if (updates.description !== undefined) {
    updateData.description = updates.description
  }
  if (updates.content !== undefined) {
    updateData.content = updates.content
  }
  if (updates.tags !== undefined) {
    updateData.tags = JSON.stringify(updates.tags)
  }
  if (updates.isEnabled !== undefined) {
    updateData.isEnabled = updates.isEnabled ? "true" : "false"
  }

  const [updated] = await db()
    .update(skill)
    .set(updateData)
    .where(eq(skill.id, id))
    .returning()

  return c.json({
    skill: {
      id: updated.id,
      organizationId: updated.organizationId,
      name: updated.name,
      description: updated.description,
      content: updated.content,
      tags: (() => {
        if (!updated.tags) return []
        try {
          return JSON.parse(updated.tags) as string[]
        } catch {
          return []
        }
      })(),
      isEnabled: updated.isEnabled === "true",
      version: updated.version,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  })
})

skills.delete("/:id", async (c) => {
  const auth = getAuthContext(c)
  const { id } = c.req.param()

  const foundSkill = await db().query.skill.findFirst({
    where: eq(skill.id, id),
  })

  if (!foundSkill) {
    throw ApiError.notFound("Skill not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    foundSkill.organizationId
  )

  if (!isMember) {
    throw ApiError.forbidden("Access denied")
  }

  await db().delete(skill).where(eq(skill.id, id))

  return c.json({ success: true })
})

export default skills
