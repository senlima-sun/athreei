/**
 * Profile routes
 *
 * Endpoints for managing the authenticated user's profile.
 *
 * Routes:
 * - PATCH /api/profile - Update profile
 * - POST /api/profile/password - Change password
 */

import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { getDb } from "../lib/db"
import { getAuth } from "../lib/auth"
import { detectDatabaseType, getSchema } from "@athreei/db"

// =============================================================================
// Constants
// =============================================================================

const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128

// =============================================================================
// Schemas
// =============================================================================

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

// =============================================================================
// Routes
// =============================================================================

const profile = new Hono()

// Apply auth middleware to all profile routes
profile.use("*", authMiddleware)

/**
 * PATCH /api/profile
 * Update the authenticated user's profile
 */
profile.patch("/", zValidator("json", updateProfileSchema), async (c) => {
  const auth = getAuthContext(c)
  const updates = c.req.valid("json")

  // Validate at least one field is provided
  if (updates.name === undefined && updates.avatarUrl === undefined) {
    throw ApiError.badRequest(
      "At least one field (name or avatarUrl) is required"
    )
  }

  const db = getDb()
  const databaseUrl = process.env.DATABASE_URL
  const dbType = databaseUrl ? detectDatabaseType(databaseUrl) : "sqlite"
  const schema = getSchema(dbType)

  // Build update object
  const updateData: { name?: string; image?: string | null; updatedAt: Date } =
    {
      updatedAt: new Date(),
    }

  if (updates.name !== undefined) {
    updateData.name = updates.name
  }

  if (updates.avatarUrl !== undefined) {
    // Map avatarUrl to image field in the database
    updateData.image = updates.avatarUrl
  }

  // Update user in database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any)
    .update(schema.user)
    .set(updateData)
    .where(eq(schema.user.id, auth.userId))

  // Fetch updated user
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

  // Transform response to use avatarUrl instead of image
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

/**
 * POST /api/profile/password
 * Change the authenticated user's password
 *
 * Requires the current password for verification before allowing change.
 * Optionally revokes all other sessions after password change.
 */
profile.post(
  "/password",
  zValidator("json", changePasswordSchema),
  async (c) => {
    // Verify user is authenticated (getAuthContext throws if no auth)
    getAuthContext(c)
    const body = c.req.valid("json")
    const authInstance = getAuth()

    try {
      // Use Better Auth's changePassword API
      // This requires session headers to be passed
      const result = await authInstance.api.changePassword({
        body: {
          currentPassword: body.currentPassword,
          newPassword: body.newPassword,
          revokeOtherSessions: body.revokeOtherSessions ?? false,
        },
        headers: c.req.raw.headers,
      })

      // Check if the operation was successful
      if (!result) {
        throw ApiError.internal("Failed to change password")
      }

      return c.json({
        message: "Password changed successfully",
        revokedSessions: body.revokeOtherSessions ?? false,
      })
    } catch (error) {
      // Handle Better Auth specific errors
      if (error instanceof Error) {
        const message = error.message.toLowerCase()

        // Current password incorrect
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

        // User doesn't have a password (OAuth-only account)
        if (message.includes("no password") || message.includes("credential")) {
          throw ApiError.badRequest(
            "Account does not have a password. Please use the forgot password flow to set one.",
            "NO_PASSWORD_SET"
          )
        }

        // Re-throw ApiError instances
        if (error instanceof ApiError) {
          throw error
        }
      }

      // Log unexpected errors
      console.error("Password change error:", error)
      throw ApiError.internal("Failed to change password")
    }
  }
)

export default profile
