import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq, and } from "drizzle-orm"
import crypto from "crypto"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { db } from "../lib/db-operations"
import { encryptionKey } from "@athreei/db"
import {
  createEncryptionKeySchema,
  updateEncryptionKeySchema,
  listEncryptionKeysQuerySchema,
} from "../schemas/encryption-keys"
import { verifyOrganizationMembership } from "../services"

const encryptionKeys = new Hono()

encryptionKeys.use("*", authMiddleware)

function generateEncryptionKey(): { key: string; hash: string; prefix: string } {
  const keyBytes = crypto.randomBytes(32)
  const key = keyBytes.toString("base64")
  const hash = crypto.createHash("sha256").update(key).digest("hex")
  const prefix = key.substring(0, 8)
  return { key, hash, prefix }
}

function generateId(): string {
  return `ek_${crypto.randomBytes(12).toString("hex")}`
}

encryptionKeys.get(
  "/",
  zValidator("query", listEncryptionKeysQuerySchema),
  async (c) => {
    const auth = getAuthContext(c)
    const { organizationId, status } = c.req.valid("query")

    const isMember = await verifyOrganizationMembership(
      auth.userId,
      organizationId
    )
    if (!isMember) {
      throw ApiError.forbidden("Access denied")
    }

    const conditions = [eq(encryptionKey.organizationId, organizationId)]
    if (status) {
      conditions.push(eq(encryptionKey.status, status))
    }

    const keys = await db().query.encryptionKey.findMany({
      where: and(...conditions),
      orderBy: (key, { desc }) => [desc(key.createdAt)],
    })

    return c.json({ encryptionKeys: keys })
  }
)

encryptionKeys.post(
  "/",
  zValidator("json", createEncryptionKeySchema),
  async (c) => {
    const auth = getAuthContext(c)
    const body = c.req.valid("json")

    const isMember = await verifyOrganizationMembership(
      auth.userId,
      body.organizationId
    )
    if (!isMember) {
      throw ApiError.forbidden("Access denied")
    }

    const { key, hash, prefix } = generateEncryptionKey()
    const id = generateId()
    const now = new Date()

    await db()
      .insert(encryptionKey)
      .values({
        id,
        organizationId: body.organizationId,
        createdById: auth.userId,
        name: body.name,
        keyHash: hash,
        keyPrefix: prefix,
        version: 1,
        status: "active",
        createdAt: now,
        updatedAt: now,
      })

    const created = await db().query.encryptionKey.findFirst({
      where: eq(encryptionKey.id, id),
    })

    return c.json(
      {
        encryptionKey: created,
        rawKey: key,
      },
      201
    )
  }
)

encryptionKeys.get("/:id", async (c) => {
  const auth = getAuthContext(c)
  const id = c.req.param("id")

  const key = await db().query.encryptionKey.findFirst({
    where: eq(encryptionKey.id, id),
  })

  if (!key) {
    throw ApiError.notFound("Encryption key not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    key.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("Access denied")
  }

  return c.json({ encryptionKey: key })
})

encryptionKeys.patch(
  "/:id",
  zValidator("json", updateEncryptionKeySchema),
  async (c) => {
    const auth = getAuthContext(c)
    const id = c.req.param("id")
    const updates = c.req.valid("json")

    const key = await db().query.encryptionKey.findFirst({
      where: eq(encryptionKey.id, id),
    })

    if (!key) {
      throw ApiError.notFound("Encryption key not found")
    }

    const isMember = await verifyOrganizationMembership(
      auth.userId,
      key.organizationId
    )
    if (!isMember) {
      throw ApiError.forbidden("Access denied")
    }

    if (key.status === "revoked") {
      throw ApiError.badRequest("Cannot update a revoked key")
    }

    const updateData: Partial<typeof encryptionKey.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (updates.name !== undefined) {
      updateData.name = updates.name
    }

    await db()
      .update(encryptionKey)
      .set(updateData)
      .where(eq(encryptionKey.id, id))

    const updated = await db().query.encryptionKey.findFirst({
      where: eq(encryptionKey.id, id),
    })

    return c.json({ encryptionKey: updated })
  }
)

encryptionKeys.post("/:id/rotate", async (c) => {
  const auth = getAuthContext(c)
  const id = c.req.param("id")

  const oldKey = await db().query.encryptionKey.findFirst({
    where: eq(encryptionKey.id, id),
  })

  if (!oldKey) {
    throw ApiError.notFound("Encryption key not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    oldKey.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("Access denied")
  }

  if (oldKey.status !== "active") {
    throw ApiError.badRequest("Can only rotate active keys")
  }

  const { key, hash, prefix } = generateEncryptionKey()
  const newId = generateId()
  const now = new Date()

  const newKey = await db().transaction(async (tx) => {
    await tx
      .update(encryptionKey)
      .set({
        status: "rotated",
        rotatedAt: now,
        updatedAt: now,
      })
      .where(eq(encryptionKey.id, id))

    await tx.insert(encryptionKey).values({
      id: newId,
      organizationId: oldKey.organizationId,
      createdById: auth.userId,
      name: oldKey.name,
      keyHash: hash,
      keyPrefix: prefix,
      version: oldKey.version + 1,
      status: "active",
      createdAt: now,
      updatedAt: now,
    })

    return tx.query.encryptionKey.findFirst({
      where: eq(encryptionKey.id, newId),
    })
  })

  return c.json(
    {
      encryptionKey: newKey,
      rawKey: key,
      rotatedFrom: id,
    },
    201
  )
})

encryptionKeys.delete("/:id", async (c) => {
  const auth = getAuthContext(c)
  const id = c.req.param("id")

  const key = await db().query.encryptionKey.findFirst({
    where: eq(encryptionKey.id, id),
  })

  if (!key) {
    throw ApiError.notFound("Encryption key not found")
  }

  const isMember = await verifyOrganizationMembership(
    auth.userId,
    key.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("Access denied")
  }

  if (key.status === "revoked") {
    throw ApiError.badRequest("Key already revoked")
  }

  const now = new Date()

  await db()
    .update(encryptionKey)
    .set({
      status: "revoked",
      revokedAt: now,
      revokedById: auth.userId,
      updatedAt: now,
    })
    .where(eq(encryptionKey.id, id))

  return c.json({ message: "Encryption key revoked successfully" })
})

export default encryptionKeys
