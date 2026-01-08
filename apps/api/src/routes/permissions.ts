/**
 * Permissions routes
 *
 * Routes for managing tool access permissions per origin.
 * Controls which AI applications can access specific tools.
 *
 * Routes:
 * - GET /permissions - List all permissions for an organization
 * - PUT /permissions/:id - Update a permission's level
 * - DELETE /permissions/:id - Delete a permission
 */

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { getDb, type DatabaseClient } from "../lib/db"
import { permission } from "@athreei/db"
import { verifyOrganizationMembership } from "../services"

const permissions = new Hono()

// Apply auth middleware to all permission routes
permissions.use("*", authMiddleware)

// =============================================================================
// Schemas
// =============================================================================

const updatePermissionSchema = z.object({
  allowed: z.enum(["allowed", "denied", "ask"]),
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Verify user has access to the permission's organization
 */
async function verifyPermissionAccess(
  db: DatabaseClient,
  permissionId: string,
  userId: string
): Promise<typeof permission.$inferSelect> {
  // Get the permission
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const perm = await (db as any).query.permission.findFirst({
    where: eq(permission.id, permissionId),
  })

  if (!perm) {
    throw ApiError.notFound("Permission not found")
  }

  // Check if user is a member of the organization that owns this permission
  const isMember = await verifyOrganizationMembership(
    db,
    userId,
    perm.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this permission")
  }

  return perm
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /permissions
 * List all permissions for an organization
 */
permissions.get("/", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const organizationId = c.req.query("organizationId")

  if (!organizationId) {
    throw ApiError.badRequest("organizationId query parameter is required")
  }

  // Verify user has access to this organization
  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  // Get all permissions for this organization
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const perms = await (db as any).query.permission.findMany({
    where: eq(permission.organizationId, organizationId),
  })

  // Transform to match expected response format
  const data = perms.map((p: typeof permission.$inferSelect) => ({
    id: p.id,
    origin: p.origin,
    tool: p.tool,
    allowed: p.allowed,
    createdAt:
      p.createdAt instanceof Date ? p.createdAt.getTime() : Number(p.createdAt),
    updatedAt:
      p.updatedAt instanceof Date ? p.updatedAt.getTime() : Number(p.updatedAt),
  }))

  return c.json({
    data,
    count: data.length,
  })
})

/**
 * PUT /permissions/:id
 * Update a permission's level
 */
permissions.put(
  "/:id",
  zValidator("json", updatePermissionSchema),
  async (c) => {
    const db = getDb()
    const auth = getAuthContext(c)
    const permissionId = c.req.param("id")
    const body = c.req.valid("json")

    // Verify access to permission
    const perm = await verifyPermissionAccess(db, permissionId, auth.userId)

    // Update the permission
    const now = new Date()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .update(permission)
      .set({
        allowed: body.allowed,
        updatedAt: now,
      })
      .where(eq(permission.id, permissionId))

    // Return updated permission
    return c.json({
      id: perm.id,
      origin: perm.origin,
      tool: perm.tool,
      allowed: body.allowed,
      createdAt:
        perm.createdAt instanceof Date
          ? perm.createdAt.getTime()
          : Number(perm.createdAt),
      updatedAt: now.getTime(),
    })
  }
)

/**
 * DELETE /permissions/:id
 * Delete a permission
 */
permissions.delete("/:id", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const permissionId = c.req.param("id")

  // Verify access to permission
  await verifyPermissionAccess(db, permissionId, auth.userId)

  // Delete the permission
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).delete(permission).where(eq(permission.id, permissionId))

  return c.json({ message: "Permission deleted successfully" })
})

export default permissions
