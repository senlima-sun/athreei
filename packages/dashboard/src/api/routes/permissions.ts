/**
 * Permissions API routes
 *
 * Endpoints for managing tool permissions per origin.
 * Currently uses mock data - will integrate with SQLite later.
 */

import { Hono } from "hono"
import type { Permission, PermissionLevel } from "@athreei/shared"

export const permissionsRouter = new Hono()

// Mock permissions data
const mockPermissions: Permission[] = [
  {
    id: "perm-001",
    origin: "https://example.com",
    tool: "aiii:navigate",
    allowed: "allowed",
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
  {
    id: "perm-002",
    origin: "https://example.com",
    tool: "aiii:click",
    allowed: "allowed",
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000,
  },
  {
    id: "perm-003",
    origin: "https://test.com",
    tool: "aiii:type",
    allowed: "denied",
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now() - 259200000,
  },
  {
    id: "perm-004",
    origin: "https://example.com",
    tool: "aiii:screenshot",
    allowed: "ask",
    createdAt: Date.now() - 345600000,
    updatedAt: Date.now() - 345600000,
  },
  {
    id: "perm-005",
    origin: "https://app.example.com",
    tool: "aiii:form",
    allowed: "allowed",
    createdAt: Date.now() - 432000000,
    updatedAt: Date.now() - 432000000,
  },
]

/**
 * GET /api/permissions
 * List all permissions with optional filtering
 *
 * Query params:
 * - origin: Filter by origin
 * - tool: Filter by tool name
 * - allowed: Filter by permission level
 */
permissionsRouter.get("/", (c) => {
  const origin = c.req.query("origin")
  const tool = c.req.query("tool")
  const allowed = c.req.query("allowed")

  let filtered = [...mockPermissions]

  if (origin) {
    filtered = filtered.filter((p) => p.origin === origin)
  }

  if (tool) {
    filtered = filtered.filter((p) => p.tool === tool)
  }

  if (allowed) {
    filtered = filtered.filter((p) => p.allowed === allowed)
  }

  // Sort by updatedAt descending (most recent first)
  filtered.sort((a, b) => b.updatedAt - a.updatedAt)

  return c.json({ data: filtered })
})

/**
 * GET /api/permissions/:origin
 * Get all permissions for a specific origin
 */
permissionsRouter.get("/:origin", (c) => {
  const origin = c.req.param("origin")
  const permissions = mockPermissions.filter((p) => p.origin === origin)

  return c.json({ data: permissions })
})

/**
 * PUT /api/permissions/:id
 * Update a permission
 *
 * Body:
 * - allowed: New permission level (denied|allowed|ask)
 */
permissionsRouter.put("/:id", async (c) => {
  const id = c.req.param("id")
  const body = await c.req.json()

  const index = mockPermissions.findIndex((p) => p.id === id)

  if (index === -1) {
    return c.json({ error: "Permission not found" }, 404)
  }

  const { allowed } = body as { allowed?: PermissionLevel }

  if (!allowed || !["denied", "allowed", "ask"].includes(allowed)) {
    return c.json(
      { error: "Invalid permission level. Must be: denied, allowed, or ask" },
      400
    )
  }

  // Update permission
  mockPermissions[index] = {
    ...mockPermissions[index],
    allowed,
    updatedAt: Date.now(),
  }

  return c.json(mockPermissions[index])
})

/**
 * DELETE /api/permissions/:id
 * Delete a permission
 */
permissionsRouter.delete("/:id", (c) => {
  const id = c.req.param("id")
  const index = mockPermissions.findIndex((p) => p.id === id)

  if (index === -1) {
    return c.json({ error: "Permission not found" }, 404)
  }

  const deleted = mockPermissions.splice(index, 1)[0]

  return c.json({ deleted, message: "Permission deleted successfully" })
})
