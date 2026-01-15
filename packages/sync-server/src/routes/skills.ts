import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq, and, desc, sql, isNull, ilike, or } from "drizzle-orm"
import {
  SkillCreateSchema,
  SkillUpdateSchema,
  SkillQuerySchema,
  type SkillResponse,
  type SkillListResponse,
  type ErrorResponse,
} from "../types"
import { getDb } from "../db/client"
import * as schema from "../db/schema"
import { authMiddleware, getAuthContext } from "../middleware/auth"

const skills = new Hono()

skills.use("*", authMiddleware)

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function skillToResponse(skill: schema.Skill): SkillResponse {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    encryptedContent: uint8ArrayToBase64(skill.encrypted_content),
    tags: skill.tags ?? [],
    isEnabled: skill.is_enabled,
    version: skill.version,
    createdAt: skill.created_at.toISOString(),
    updatedAt: skill.updated_at.toISOString(),
  }
}

skills.get("/", zValidator("query", SkillQuerySchema), async (c) => {
  try {
    const { accountId } = getAuthContext(c)
    const query = c.req.valid("query")
    const db = getDb()

    const conditions = [
      eq(schema.skills.account_id, accountId),
      isNull(schema.skills.deleted_at),
    ]

    if (query.isEnabled !== undefined) {
      conditions.push(eq(schema.skills.is_enabled, query.isEnabled))
    }

    if (query.search) {
      conditions.push(
        or(
          ilike(schema.skills.name, `%${query.search}%`),
          ilike(schema.skills.description, `%${query.search}%`)
        )!
      )
    }

    const whereClause = and(...conditions)

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.skills)
      .where(whereClause)

    const total = countResult?.count ?? 0

    const skillResults = await db
      .select()
      .from(schema.skills)
      .where(whereClause)
      .orderBy(desc(schema.skills.updated_at))
      .limit(query.limit)
      .offset(query.offset)

    const response: SkillListResponse = {
      skills: skillResults.map(skillToResponse),
      total,
      hasMore: query.offset + skillResults.length < total,
    }

    return c.json(response, 200)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list skills"
    return c.json<ErrorResponse>({ error: message }, 500)
  }
})

skills.get("/:id", async (c) => {
  try {
    const { accountId } = getAuthContext(c)
    const skillId = c.req.param("id")
    const db = getDb()

    const skill = await db.query.skills.findFirst({
      where: and(
        eq(schema.skills.id, skillId),
        eq(schema.skills.account_id, accountId),
        isNull(schema.skills.deleted_at)
      ),
    })

    if (!skill) {
      return c.json<ErrorResponse>({ error: "Skill not found" }, 404)
    }

    return c.json<SkillResponse>(skillToResponse(skill), 200)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get skill"
    return c.json<ErrorResponse>({ error: message }, 500)
  }
})

skills.post("/", zValidator("json", SkillCreateSchema), async (c) => {
  try {
    const { accountId } = getAuthContext(c)
    const input = c.req.valid("json")
    const db = getDb()

    const [created] = await db
      .insert(schema.skills)
      .values({
        account_id: accountId,
        name: input.name,
        description: input.description ?? null,
        encrypted_content: base64ToUint8Array(input.encryptedContent),
        tags: input.tags ?? [],
        is_enabled: input.isEnabled ?? true,
        version: 1,
      })
      .returning()

    return c.json<SkillResponse>(skillToResponse(created), 201)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create skill"
    return c.json<ErrorResponse>({ error: message }, 500)
  }
})

skills.patch("/:id", zValidator("json", SkillUpdateSchema), async (c) => {
  try {
    const { accountId } = getAuthContext(c)
    const skillId = c.req.param("id")
    const input = c.req.valid("json")
    const db = getDb()

    const existing = await db.query.skills.findFirst({
      where: and(
        eq(schema.skills.id, skillId),
        eq(schema.skills.account_id, accountId),
        isNull(schema.skills.deleted_at)
      ),
    })

    if (!existing) {
      return c.json<ErrorResponse>({ error: "Skill not found" }, 404)
    }

    const updateData: Partial<schema.NewSkill> = {
      updated_at: new Date(),
    }

    if (input.name !== undefined) updateData.name = input.name
    if (input.description !== undefined)
      updateData.description = input.description
    if (input.encryptedContent !== undefined) {
      updateData.encrypted_content = base64ToUint8Array(input.encryptedContent)
      updateData.version = existing.version + 1
    }
    if (input.tags !== undefined) updateData.tags = input.tags
    if (input.isEnabled !== undefined) updateData.is_enabled = input.isEnabled

    const [updated] = await db
      .update(schema.skills)
      .set(updateData)
      .where(eq(schema.skills.id, skillId))
      .returning()

    return c.json<SkillResponse>(skillToResponse(updated), 200)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update skill"
    return c.json<ErrorResponse>({ error: message }, 500)
  }
})

skills.delete("/:id", async (c) => {
  try {
    const { accountId } = getAuthContext(c)
    const skillId = c.req.param("id")
    const db = getDb()

    const existing = await db.query.skills.findFirst({
      where: and(
        eq(schema.skills.id, skillId),
        eq(schema.skills.account_id, accountId),
        isNull(schema.skills.deleted_at)
      ),
    })

    if (!existing) {
      return c.json<ErrorResponse>({ error: "Skill not found" }, 404)
    }

    await db
      .update(schema.skills)
      .set({ deleted_at: new Date() })
      .where(eq(schema.skills.id, skillId))

    return c.json({ success: true }, 200)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete skill"
    return c.json<ErrorResponse>({ error: message }, 500)
  }
})

export default skills
