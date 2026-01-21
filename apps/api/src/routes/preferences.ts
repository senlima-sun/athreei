import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { eq } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { db } from "../lib/db-operations"
import { user as pgUser } from "@athreei/db"

const notificationPreferencesSchema = z.object({
  email: z.boolean(),
  securityAlerts: z.boolean(),
  productUpdates: z.boolean(),
  usageAlerts: z.boolean(),
})

const userPreferencesSchema = z.object({
  notifications: notificationPreferencesSchema,
})

export type UserPreferences = z.infer<typeof userPreferencesSchema>

const updatePreferencesSchema = z.object({
  notifications: notificationPreferencesSchema.partial().optional(),
})

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>

const DEFAULT_PREFERENCES: UserPreferences = {
  notifications: {
    email: true,
    securityAlerts: true,
    productUpdates: false,
    usageAlerts: true,
  },
}

function parsePreferences(raw: string | null): UserPreferences {
  if (!raw) {
    return DEFAULT_PREFERENCES
  }
  try {
    const parsed = JSON.parse(raw)
    return userPreferencesSchema.parse(parsed)
  } catch {
    return DEFAULT_PREFERENCES
  }
}

const preferences = new Hono()

preferences.use("*", authMiddleware)

preferences.get("/", async (c) => {
  const auth = getAuthContext(c)

  const userRecord = await db().query.user.findFirst({
    where: eq(pgUser.id, auth.userId),
    columns: {
      preferences: true,
    },
  })

  if (!userRecord) {
    throw ApiError.notFound("User not found")
  }

  const prefs = parsePreferences(userRecord.preferences)

  return c.json(prefs)
})

preferences.patch(
  "/",
  zValidator("json", updatePreferencesSchema),
  async (c) => {
    const auth = getAuthContext(c)
    const updates = c.req.valid("json")

    const userRecord = await db().query.user.findFirst({
      where: eq(pgUser.id, auth.userId),
      columns: {
        preferences: true,
      },
    })

    if (!userRecord) {
      throw ApiError.notFound("User not found")
    }

    const currentPrefs = parsePreferences(userRecord.preferences)

    const newPrefs: UserPreferences = {
      ...currentPrefs,
      notifications: {
        ...currentPrefs.notifications,
        ...updates.notifications,
      },
    }

    await db()
      .update(pgUser)
      .set({
        preferences: JSON.stringify(newPrefs),
        updatedAt: new Date(),
      })
      .where(eq(pgUser.id, auth.userId))

    return c.json(newPrefs)
  }
)

export default preferences
