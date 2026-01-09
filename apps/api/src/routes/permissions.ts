import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { getDb, type DatabaseClient } from "../lib/db"
import { permission } from "@athreei/db"
import { verifyOrganizationMembership } from "../services"

const permissions = new Hono()

permissions.use("*", authMiddleware)

const updatePermissionSchema = z.object({
  allowed: z.enum(["allowed", "denied", "ask"]),
})

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

permissions.get("/", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const organizationId = c.req.query("organizationId")

  if (!organizationId) {
    throw ApiError.badRequest("organizationId query parameter is required")
  }

  const isMember = await verifyOrganizationMembership(
    db,
    auth.userId,
    organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const perms = await (db as any).query.permission.findMany({
    where: eq(permission.organizationId, organizationId),
  })

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

permissions.put(
  "/:id",
  zValidator("json", updatePermissionSchema),
  async (c) => {
    const db = getDb()
    const auth = getAuthContext(c)
    const permissionId = c.req.param("id")
    const body = c.req.valid("json")

    const perm = await verifyPermissionAccess(db, permissionId, auth.userId)

    const now = new Date()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any)
      .update(permission)
      .set({
        allowed: body.allowed,
        updatedAt: now,
      })
      .where(eq(permission.id, permissionId))

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

permissions.delete("/:id", async (c) => {
  const db = getDb()
  const auth = getAuthContext(c)
  const permissionId = c.req.param("id")

  await verifyPermissionAccess(db, permissionId, auth.userId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).delete(permission).where(eq(permission.id, permissionId))

  return c.json({ message: "Permission deleted successfully" })
})

export default permissions
