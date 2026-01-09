import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { getDb } from "../lib/db"
import { getAuth } from "../lib/auth"
import { detectDatabaseType, getSchema } from "@athreei/db"

const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128

const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name too long")
    .optional(),
  avatarUrl: z.string().url("Invalid URL").nullable().optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required")
      .max(MAX_PASSWORD_LENGTH, "Password too long"),
    newPassword: z
      .string()
      .min(
        MIN_PASSWORD_LENGTH,
        `New password must be at least ${MIN_PASSWORD_LENGTH} characters`
      )
      .max(MAX_PASSWORD_LENGTH, "Password too long"),
    revokeOtherSessions: z.boolean().optional().default(false),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

const profile = new Hono()

profile.use("*", authMiddleware)

profile.patch("/", zValidator("json", updateProfileSchema), async (c) => {
  const auth = getAuthContext(c)
  const updates = c.req.valid("json")

  if (updates.name === undefined && updates.avatarUrl === undefined) {
    throw ApiError.badRequest(
      "At least one field (name or avatarUrl) is required"
    )
  }

  const db = getDb()
  const databaseUrl = process.env.DATABASE_URL
  const dbType = databaseUrl ? detectDatabaseType(databaseUrl) : "sqlite"
  const schema = getSchema(dbType)

  const updateData: { name?: string; image?: string | null; updatedAt: Date } =
    {
      updatedAt: new Date(),
    }

  if (updates.name !== undefined) {
    updateData.name = updates.name
  }

  if (updates.avatarUrl !== undefined) {
    updateData.image = updates.avatarUrl
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .update(schema.user)
    .set(updateData)
    .where(eq(schema.user.id, auth.userId))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatedUser = await (db as any).query.user.findFirst({
    where: eq(schema.user.id, auth.userId),
    columns: {
      id: true,
      name: true,
      email: true,
      image: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!updatedUser) {
    throw ApiError.notFound("User not found")
  }

  return c.json({
    id: updatedUser.id,
    name: updatedUser.name,
    email: updatedUser.email,
    avatarUrl: updatedUser.image,
    emailVerified: updatedUser.emailVerified,
    createdAt: updatedUser.createdAt,
    updatedAt: updatedUser.updatedAt,
  })
})

profile.post(
  "/password",
  zValidator("json", changePasswordSchema),
  async (c) => {
    getAuthContext(c)
    const body = c.req.valid("json")
    const authInstance = getAuth()

    try {
      const result = await authInstance.api.changePassword({
        body: {
          currentPassword: body.currentPassword,
          newPassword: body.newPassword,
          revokeOtherSessions: body.revokeOtherSessions ?? false,
        },
        headers: c.req.raw.headers,
      })

      if (!result) {
        throw ApiError.internal("Failed to change password")
      }

      return c.json({
        message: "Password changed successfully",
        revokedSessions: body.revokeOtherSessions ?? false,
      })
    } catch (error) {
      if (error instanceof Error) {
        const message = error.message.toLowerCase()

        if (
          message.includes("invalid") ||
          message.includes("incorrect") ||
          message.includes("wrong")
        ) {
          throw ApiError.badRequest(
            "Current password is incorrect",
            "INVALID_CURRENT_PASSWORD"
          )
        }

        if (message.includes("no password") || message.includes("credential")) {
          throw ApiError.badRequest(
            "Account does not have a password. Please use the forgot password flow to set one.",
            "NO_PASSWORD_SET"
          )
        }

        if (error instanceof ApiError) {
          throw error
        }
      }

      console.error("Password change error:", error)
      throw ApiError.internal("Failed to change password")
    }
  }
)

export default profile
