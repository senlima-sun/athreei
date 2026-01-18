import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq, and, desc, like } from "drizzle-orm"
import {
  authMiddleware,
  getAuthContext,
  ApiError,
  withOrgFromQuery,
  getOrgContext,
} from "../middleware"
import { db } from "../lib/db-operations"
import { rule } from "@athreei/db"
import {
  createRuleSchema,
  updateRuleSchema,
  listRulesQuerySchema,
  updatePrioritySchema,
} from "../schemas/rules"
import { verifyOrganizationMembership } from "../services"

const rules = new Hono()

rules.use("*", authMiddleware)

rules.get(
  "/",
  withOrgFromQuery,
  zValidator("query", listRulesQuerySchema),
  async (c) => {
    const { organizationId } = getOrgContext(c)
    const { search, isEnabled, scope } = c.req.valid("query")

    const conditions = [eq(rule.organizationId, organizationId)]

    if (isEnabled !== undefined) {
      conditions.push(eq(rule.isEnabled, isEnabled))
    }

    if (scope !== undefined) {
      conditions.push(eq(rule.scope, scope))
    }

    if (search !== undefined && search.length > 0) {
      conditions.push(like(rule.name, `%${search}%`))
    }

    const rulesList = await db()
      .select()
      .from(rule)
      .where(and(...conditions))
      .orderBy(desc(rule.priority))

    return c.json({
      rules: rulesList.map((r) => ({
        id: r.id,
        organizationId: r.organizationId,
        name: r.name,
        description: r.description,
        content: r.content,
        priority: r.priority,
        scope: r.scope,
        isEnabled: r.isEnabled === "true",
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
    })
  }
)

rules.get("/:id", async (c) => {
  const auth = getAuthContext(c)
  const { id } = c.req.param()

  const existingRule = await db().query.rule.findFirst({
    where: eq(rule.id, id),
  })

  if (!existingRule) {
    throw ApiError.notFound("Rule not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    existingRule.organizationId
  )

  if (!isMember) {
    throw ApiError.forbidden("Access denied")
  }

  return c.json({
    rule: {
      id: existingRule.id,
      organizationId: existingRule.organizationId,
      name: existingRule.name,
      description: existingRule.description,
      content: existingRule.content,
      priority: existingRule.priority,
      scope: existingRule.scope,
      isEnabled: existingRule.isEnabled === "true",
      createdAt: existingRule.createdAt,
      updatedAt: existingRule.updatedAt,
    },
  })
})

rules.post(
  "/",
  withOrgFromQuery,
  zValidator("json", createRuleSchema),
  async (c) => {
    const { organizationId } = getOrgContext(c)
    const body = c.req.valid("json")

    const now = new Date()
    const id = crypto.randomUUID()

    const [created] = await db()
      .insert(rule)
      .values({
        id,
        organizationId,
        name: body.name,
        description: body.description ?? null,
        content: body.content,
        priority: body.priority,
        scope: body.scope,
        isEnabled: body.isEnabled ? "true" : "false",
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    if (!created) {
      throw ApiError.badRequest("Failed to create rule")
    }

    return c.json(
      {
        rule: {
          id: created.id,
          organizationId: created.organizationId,
          name: created.name,
          description: created.description,
          content: created.content,
          priority: created.priority,
          scope: created.scope,
          isEnabled: created.isEnabled === "true",
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
      },
      201
    )
  }
)

rules.patch("/:id", zValidator("json", updateRuleSchema), async (c) => {
  const auth = getAuthContext(c)
  const { id } = c.req.param()
  const updates = c.req.valid("json")

  const existingRule = await db().query.rule.findFirst({
    where: eq(rule.id, id),
  })

  if (!existingRule) {
    throw ApiError.notFound("Rule not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    existingRule.organizationId
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
  if (updates.priority !== undefined) {
    updateData.priority = updates.priority
  }
  if (updates.scope !== undefined) {
    updateData.scope = updates.scope
  }
  if (updates.isEnabled !== undefined) {
    updateData.isEnabled = updates.isEnabled ? "true" : "false"
  }

  const [updated] = await db()
    .update(rule)
    .set(updateData)
    .where(eq(rule.id, id))
    .returning()

  if (!updated) {
    throw ApiError.notFound("Rule not found")
  }

  return c.json({
    rule: {
      id: updated.id,
      organizationId: updated.organizationId,
      name: updated.name,
      description: updated.description,
      content: updated.content,
      priority: updated.priority,
      scope: updated.scope,
      isEnabled: updated.isEnabled === "true",
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  })
})

rules.patch(
  "/:id/priority",
  zValidator("json", updatePrioritySchema),
  async (c) => {
    const auth = getAuthContext(c)
    const { id } = c.req.param()
    const { priority } = c.req.valid("json")

    const existingRule = await db().query.rule.findFirst({
      where: eq(rule.id, id),
    })

    if (!existingRule) {
      throw ApiError.notFound("Rule not found")
    }

    const isMember = await verifyOrganizationMembership(
      auth.userId,
      existingRule.organizationId
    )

    if (!isMember) {
      throw ApiError.forbidden("Access denied")
    }

    const [updated] = await db()
      .update(rule)
      .set({
        priority,
        updatedAt: new Date(),
      })
      .where(eq(rule.id, id))
      .returning()

    if (!updated) {
      throw ApiError.notFound("Rule not found")
    }

    return c.json({
      rule: {
        id: updated.id,
        organizationId: updated.organizationId,
        name: updated.name,
        description: updated.description,
        content: updated.content,
        priority: updated.priority,
        scope: updated.scope,
        isEnabled: updated.isEnabled === "true",
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    })
  }
)

rules.delete("/:id", async (c) => {
  const auth = getAuthContext(c)
  const { id } = c.req.param()

  const existingRule = await db().query.rule.findFirst({
    where: eq(rule.id, id),
  })

  if (!existingRule) {
    throw ApiError.notFound("Rule not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    existingRule.organizationId
  )

  if (!isMember) {
    throw ApiError.forbidden("Access denied")
  }

  await db().delete(rule).where(eq(rule.id, id))

  return c.json({ success: true })
})

export default rules
