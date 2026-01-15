import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq, and, desc, sql, isNull, ilike, or } from "drizzle-orm"
import {
  RuleCreateSchema,
  RuleUpdateSchema,
  RuleQuerySchema,
  type RuleResponse,
  type RuleListResponse,
  type ErrorResponse,
} from "../types"
import { getDb } from "../db/client"
import * as schema from "../db/schema"
import { authMiddleware, getAuthContext } from "../middleware/auth"

const rules = new Hono()

rules.use("*", authMiddleware)

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

function ruleToResponse(rule: schema.Rule): RuleResponse {
  return {
    id: rule.id,
    name: rule.name,
    description: rule.description,
    encryptedContent: uint8ArrayToBase64(rule.encrypted_content),
    priority: rule.priority,
    scope: rule.scope,
    isEnabled: rule.is_enabled,
    createdAt: rule.created_at.toISOString(),
    updatedAt: rule.updated_at.toISOString(),
  }
}

rules.get("/", zValidator("query", RuleQuerySchema), async (c) => {
  try {
    const { accountId } = getAuthContext(c)
    const query = c.req.valid("query")
    const db = getDb()

    const conditions = [
      eq(schema.rules.account_id, accountId),
      isNull(schema.rules.deleted_at),
    ]

    if (query.isEnabled !== undefined) {
      conditions.push(eq(schema.rules.is_enabled, query.isEnabled))
    }

    if (query.scope) {
      conditions.push(eq(schema.rules.scope, query.scope))
    }

    if (query.search) {
      conditions.push(
        or(
          ilike(schema.rules.name, `%${query.search}%`),
          ilike(schema.rules.description, `%${query.search}%`)
        )!
      )
    }

    const whereClause = and(...conditions)

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.rules)
      .where(whereClause)

    const total = countResult?.count ?? 0

    const ruleResults = await db
      .select()
      .from(schema.rules)
      .where(whereClause)
      .orderBy(desc(schema.rules.priority), desc(schema.rules.updated_at))
      .limit(query.limit)
      .offset(query.offset)

    const response: RuleListResponse = {
      rules: ruleResults.map(ruleToResponse),
      total,
      hasMore: query.offset + ruleResults.length < total,
    }

    return c.json(response, 200)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list rules"
    return c.json<ErrorResponse>({ error: message }, 500)
  }
})

rules.get("/:id", async (c) => {
  try {
    const { accountId } = getAuthContext(c)
    const ruleId = c.req.param("id")
    const db = getDb()

    const rule = await db.query.rules.findFirst({
      where: and(
        eq(schema.rules.id, ruleId),
        eq(schema.rules.account_id, accountId),
        isNull(schema.rules.deleted_at)
      ),
    })

    if (!rule) {
      return c.json<ErrorResponse>({ error: "Rule not found" }, 404)
    }

    return c.json<RuleResponse>(ruleToResponse(rule), 200)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get rule"
    return c.json<ErrorResponse>({ error: message }, 500)
  }
})

rules.post("/", zValidator("json", RuleCreateSchema), async (c) => {
  try {
    const { accountId } = getAuthContext(c)
    const input = c.req.valid("json")
    const db = getDb()

    const [created] = await db
      .insert(schema.rules)
      .values({
        account_id: accountId,
        name: input.name,
        description: input.description ?? null,
        encrypted_content: base64ToUint8Array(input.encryptedContent),
        priority: input.priority ?? 0,
        scope: input.scope ?? "global",
        is_enabled: input.isEnabled ?? true,
      })
      .returning()

    return c.json<RuleResponse>(ruleToResponse(created), 201)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create rule"
    return c.json<ErrorResponse>({ error: message }, 500)
  }
})

rules.patch("/:id", zValidator("json", RuleUpdateSchema), async (c) => {
  try {
    const { accountId } = getAuthContext(c)
    const ruleId = c.req.param("id")
    const input = c.req.valid("json")
    const db = getDb()

    const existing = await db.query.rules.findFirst({
      where: and(
        eq(schema.rules.id, ruleId),
        eq(schema.rules.account_id, accountId),
        isNull(schema.rules.deleted_at)
      ),
    })

    if (!existing) {
      return c.json<ErrorResponse>({ error: "Rule not found" }, 404)
    }

    const updateData: Partial<schema.NewRule> = {
      updated_at: new Date(),
    }

    if (input.name !== undefined) updateData.name = input.name
    if (input.description !== undefined)
      updateData.description = input.description
    if (input.encryptedContent !== undefined) {
      updateData.encrypted_content = base64ToUint8Array(input.encryptedContent)
    }
    if (input.priority !== undefined) updateData.priority = input.priority
    if (input.scope !== undefined) updateData.scope = input.scope
    if (input.isEnabled !== undefined) updateData.is_enabled = input.isEnabled

    const [updated] = await db
      .update(schema.rules)
      .set(updateData)
      .where(eq(schema.rules.id, ruleId))
      .returning()

    return c.json<RuleResponse>(ruleToResponse(updated), 200)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update rule"
    return c.json<ErrorResponse>({ error: message }, 500)
  }
})

rules.delete("/:id", async (c) => {
  try {
    const { accountId } = getAuthContext(c)
    const ruleId = c.req.param("id")
    const db = getDb()

    const existing = await db.query.rules.findFirst({
      where: and(
        eq(schema.rules.id, ruleId),
        eq(schema.rules.account_id, accountId),
        isNull(schema.rules.deleted_at)
      ),
    })

    if (!existing) {
      return c.json<ErrorResponse>({ error: "Rule not found" }, 404)
    }

    await db
      .update(schema.rules)
      .set({ deleted_at: new Date() })
      .where(eq(schema.rules.id, ruleId))

    return c.json({ success: true }, 200)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete rule"
    return c.json<ErrorResponse>({ error: message }, 500)
  }
})

export default rules
