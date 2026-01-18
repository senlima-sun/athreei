/**
 * Permissions API Routes
 *
 * Provides endpoints for managing site permissions.
 */

import { Hono } from "hono"
import {
  listPermissions,
  countPermissions,
  upsertPermission,
  deletePermission,
} from "../../db/repositories/permissions"
import type { PermissionLevel } from "@athreei/shared"

export const permissionsRoutes = new Hono()

/**
 * GET /api/permissions - List all permissions
 */
permissionsRoutes.get("/", async (c) => {
  const query = c.req.query()

  const limit = Math.min(parseInt(query.limit || "100", 10), 500)
  const offset = parseInt(query.offset || "0", 10)

  const data = listPermissions({ limit, offset })
  const count = countPermissions()

  return c.json({
    data,
    count,
  })
})

/**
 * PUT /api/permissions - Create or update a permission
 */
permissionsRoutes.put("/", async (c) => {
  const body = await c.req.json<{
    origin: string
    tool: string
    allowed: PermissionLevel
  }>()

  if (!body.origin || !body.tool || !body.allowed) {
    return c.json({ error: "Missing required fields" }, 400)
  }

  const permission = upsertPermission({
    origin: body.origin,
    tool: body.tool,
    allowed: body.allowed,
  })

  return c.json({ success: true, permission })
})

/**
 * DELETE /api/permissions/:id - Delete a permission
 */
permissionsRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id")

  const deleted = deletePermission(id)

  if (!deleted) {
    return c.json({ error: "Permission not found" }, 404)
  }

  return c.json({ success: true })
})
