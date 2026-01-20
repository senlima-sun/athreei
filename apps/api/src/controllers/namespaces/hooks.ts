import type { Context } from "hono"
import { eq, and, desc } from "drizzle-orm"
import { getAuthContext, ApiError } from "../../middleware"
import { db } from "../../lib/db-operations"
import { namespaceHook, skill } from "@athreei/db"
import { getNamespaceWithAccess, generateNamespaceHookId } from "../../services"

interface CreateHookInput {
  event: "PreToolUse" | "PostToolUse" | "SessionStart" | "SessionEnd" | "Stop"
  toolNamePattern?: string
  handler:
    | { type: "skill"; skillRef: string }
    | { type: "script"; command: string; args?: string[] }
    | { type: "rule"; action: "block" | "allow" | "ask"; message?: string }
  priority?: number
  isEnabled?: boolean
}

interface UpdateHookInput {
  event?: "PreToolUse" | "PostToolUse" | "SessionStart" | "SessionEnd" | "Stop"
  toolNamePattern?: string | null
  handler?:
    | { type: "skill"; skillRef: string }
    | { type: "script"; command: string; args?: string[] }
    | { type: "rule"; action: "block" | "allow" | "ask"; message?: string }
  priority?: number
  isEnabled?: boolean
}

export async function createHook(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")
  const input = (
    c.req as unknown as { valid: (target: "json") => CreateHookInput }
  ).valid("json")

  const ns = await getNamespaceWithAccess(namespaceId, auth.userId)

  if (input.handler.type === "skill") {
    const skillRecord = (await dbQuery.skill.findFirst({
      where: eq(skill.id, input.handler.skillRef),
    })) as typeof skill.$inferSelect | null

    if (!skillRecord) {
      throw ApiError.notFound("Skill not found")
    }

    if (skillRecord.organizationId !== ns.organizationId) {
      throw ApiError.forbidden("Skill does not belong to the same organization")
    }
  }

  const hookId = generateNamespaceHookId()
  const now = new Date()

  await db().insert(namespaceHook).values({
    id: hookId,
    namespaceId,
    event: input.event,
    toolNamePattern: input.toolNamePattern || null,
    handler: JSON.stringify(input.handler),
    priority: input.priority ?? 100,
    isEnabled: input.isEnabled ?? true,
    sourcePluginId: null,
    createdAt: now,
    updatedAt: now,
  })

  return c.json(
    {
      hook: {
        id: hookId,
        namespaceId,
        event: input.event,
        toolNamePattern: input.toolNamePattern,
        handler: input.handler,
        priority: input.priority ?? 100,
        isEnabled: input.isEnabled ?? true,
        sourcePluginId: null,
        createdAt: now,
        updatedAt: now,
      },
    },
    201
  )
}

function safeParseHandler(handlerJson: string): unknown {
  try {
    return JSON.parse(handlerJson)
  } catch {
    return null
  }
}

export async function listHooks(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")

  await getNamespaceWithAccess(namespaceId, auth.userId)

  const hooks = (await dbQuery.namespaceHook.findMany({
    where: eq(namespaceHook.namespaceId, namespaceId),
    orderBy: [desc(namespaceHook.priority)],
  })) as Array<typeof namespaceHook.$inferSelect>

  return c.json({
    hooks: hooks.map((hook) => ({
      id: hook.id,
      namespaceId: hook.namespaceId,
      event: hook.event,
      toolNamePattern: hook.toolNamePattern,
      handler: safeParseHandler(hook.handler),
      priority: hook.priority,
      isEnabled: hook.isEnabled,
      sourcePluginId: hook.sourcePluginId,
      createdAt: hook.createdAt,
      updatedAt: hook.updatedAt,
    })),
  })
}

export async function getHook(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")
  const hookId = c.req.param("hookId")

  await getNamespaceWithAccess(namespaceId, auth.userId)

  const hook = (await dbQuery.namespaceHook.findFirst({
    where: and(
      eq(namespaceHook.id, hookId),
      eq(namespaceHook.namespaceId, namespaceId)
    ),
  })) as typeof namespaceHook.$inferSelect | null

  if (!hook) {
    throw ApiError.notFound("Hook not found")
  }

  return c.json({
    hook: {
      id: hook.id,
      namespaceId: hook.namespaceId,
      event: hook.event,
      toolNamePattern: hook.toolNamePattern,
      handler: safeParseHandler(hook.handler),
      priority: hook.priority,
      isEnabled: hook.isEnabled,
      sourcePluginId: hook.sourcePluginId,
      createdAt: hook.createdAt,
      updatedAt: hook.updatedAt,
    },
  })
}

export async function updateHook(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")
  const hookId = c.req.param("hookId")
  const input = (
    c.req as unknown as { valid: (target: "json") => UpdateHookInput }
  ).valid("json")

  const ns = await getNamespaceWithAccess(namespaceId, auth.userId)

  const hook = (await dbQuery.namespaceHook.findFirst({
    where: and(
      eq(namespaceHook.id, hookId),
      eq(namespaceHook.namespaceId, namespaceId)
    ),
  })) as typeof namespaceHook.$inferSelect | null

  if (!hook) {
    throw ApiError.notFound("Hook not found")
  }

  if (hook.sourcePluginId) {
    throw ApiError.forbidden(
      "Cannot modify hooks installed by plugins. Disable or uninstall the plugin instead."
    )
  }

  if (input.handler !== undefined && input.handler.type === "skill") {
    const skillRecord = (await dbQuery.skill.findFirst({
      where: eq(skill.id, input.handler.skillRef),
    })) as typeof skill.$inferSelect | null

    if (!skillRecord) {
      throw ApiError.notFound("Skill not found")
    }

    if (skillRecord.organizationId !== ns.organizationId) {
      throw ApiError.forbidden("Skill does not belong to the same organization")
    }
  }

  const updates: Partial<typeof namespaceHook.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (input.event !== undefined) {
    updates.event = input.event
  }

  if (input.toolNamePattern !== undefined) {
    updates.toolNamePattern = input.toolNamePattern
  }

  if (input.handler !== undefined) {
    updates.handler = JSON.stringify(input.handler)
  }

  if (input.priority !== undefined) {
    updates.priority = input.priority
  }

  if (input.isEnabled !== undefined) {
    updates.isEnabled = input.isEnabled
  }

  await db()
    .update(namespaceHook)
    .set(updates)
    .where(eq(namespaceHook.id, hookId))

  const updated = (await dbQuery.namespaceHook.findFirst({
    where: eq(namespaceHook.id, hookId),
  })) as typeof namespaceHook.$inferSelect

  return c.json({
    hook: {
      id: updated.id,
      namespaceId: updated.namespaceId,
      event: updated.event,
      toolNamePattern: updated.toolNamePattern,
      handler: safeParseHandler(updated.handler),
      priority: updated.priority,
      isEnabled: updated.isEnabled,
      sourcePluginId: updated.sourcePluginId,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  })
}

export async function deleteHook(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")
  const hookId = c.req.param("hookId")

  await getNamespaceWithAccess(namespaceId, auth.userId)

  const hook = (await dbQuery.namespaceHook.findFirst({
    where: and(
      eq(namespaceHook.id, hookId),
      eq(namespaceHook.namespaceId, namespaceId)
    ),
  })) as typeof namespaceHook.$inferSelect | null

  if (!hook) {
    throw ApiError.notFound("Hook not found")
  }

  if (hook.sourcePluginId) {
    throw ApiError.forbidden(
      "Cannot delete hooks installed by plugins. Uninstall the plugin instead."
    )
  }

  await db().delete(namespaceHook).where(eq(namespaceHook.id, hookId))

  return c.json({ message: "Hook deleted successfully" })
}

export async function toggleHook(c: Context): Promise<Response> {
  const dbQuery = db().query
  const auth = getAuthContext(c)
  const namespaceId = c.req.param("id")
  const hookId = c.req.param("hookId")

  await getNamespaceWithAccess(namespaceId, auth.userId)

  const hook = (await dbQuery.namespaceHook.findFirst({
    where: and(
      eq(namespaceHook.id, hookId),
      eq(namespaceHook.namespaceId, namespaceId)
    ),
  })) as typeof namespaceHook.$inferSelect | null

  if (!hook) {
    throw ApiError.notFound("Hook not found")
  }

  const newEnabled = !hook.isEnabled

  await db()
    .update(namespaceHook)
    .set({
      isEnabled: newEnabled,
      updatedAt: new Date(),
    })
    .where(eq(namespaceHook.id, hookId))

  return c.json({
    hook: {
      id: hook.id,
      isEnabled: newEnabled,
    },
    message: `Hook ${newEnabled ? "enabled" : "disabled"} successfully`,
  })
}
