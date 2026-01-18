import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { eq, and } from "drizzle-orm"
import { authMiddleware, getAuthContext, ApiError } from "../middleware"
import { updateOrgMarketplaceSettingsSchema } from "../schemas/marketplaces"
import { db } from "../lib/db-operations"
import { organizationMarketplaceSetting, member } from "@athreei/db"
import {
  verifyOrganizationMembership,
  generateOrgMarketplaceSettingId,
} from "../services"

const organizationMarketplace = new Hono()

organizationMarketplace.use("*", authMiddleware)

async function requireOrgAdmin(userId: string, organizationId: string) {
  const membership = await db().query.member.findFirst({
    where: and(
      eq(member.userId, userId),
      eq(member.organizationId, organizationId)
    ),
  })

  if (!membership) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  if (membership.role !== "admin") {
    throw ApiError.forbidden("Only admins can manage marketplace settings")
  }
}

organizationMarketplace.get("/:orgId/marketplace-settings", async (c) => {
  const auth = getAuthContext(c)
  const orgId = c.req.param("orgId")

  const isMember = await verifyOrganizationMembership(auth.userId, orgId)
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this organization")
  }

  const settings = await db().query.organizationMarketplaceSetting.findFirst({
    where: eq(organizationMarketplaceSetting.organizationId, orgId),
  })

  if (!settings) {
    return c.json({
      settings: {
        organizationId: orgId,
        restrictMarketplaces: false,
        allowedMarketplaceIds: [],
        restrictPlugins: false,
        allowedPluginIds: [],
        defaultPluginIds: [],
        requireApproval: false,
      },
    })
  }

  return c.json({
    settings: {
      id: settings.id,
      organizationId: settings.organizationId,
      restrictMarketplaces: settings.restrictMarketplaces,
      allowedMarketplaceIds: JSON.parse(settings.allowedMarketplaceIds || "[]"),
      restrictPlugins: settings.restrictPlugins,
      allowedPluginIds: JSON.parse(settings.allowedPluginIds || "[]"),
      defaultPluginIds: JSON.parse(settings.defaultPluginIds || "[]"),
      requireApproval: settings.requireApproval,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    },
  })
})

organizationMarketplace.patch(
  "/:orgId/marketplace-settings",
  zValidator("json", updateOrgMarketplaceSettingsSchema),
  async (c) => {
    const auth = getAuthContext(c)
    const orgId = c.req.param("orgId")
    const updates = c.req.valid("json")

    await requireOrgAdmin(auth.userId, orgId)

    const existing = await db().query.organizationMarketplaceSetting.findFirst({
      where: eq(organizationMarketplaceSetting.organizationId, orgId),
    })

    const now = new Date()

    if (existing) {
      const updateData: Partial<
        typeof organizationMarketplaceSetting.$inferInsert
      > = {
        updatedAt: now,
      }

      if (updates.restrictMarketplaces !== undefined) {
        updateData.restrictMarketplaces = updates.restrictMarketplaces
      }
      if (updates.allowedMarketplaceIds !== undefined) {
        updateData.allowedMarketplaceIds = JSON.stringify(
          updates.allowedMarketplaceIds
        )
      }
      if (updates.restrictPlugins !== undefined) {
        updateData.restrictPlugins = updates.restrictPlugins
      }
      if (updates.allowedPluginIds !== undefined) {
        updateData.allowedPluginIds = JSON.stringify(updates.allowedPluginIds)
      }
      if (updates.defaultPluginIds !== undefined) {
        updateData.defaultPluginIds = JSON.stringify(updates.defaultPluginIds)
      }
      if (updates.requireApproval !== undefined) {
        updateData.requireApproval = updates.requireApproval
      }

      await db()
        .update(organizationMarketplaceSetting)
        .set(updateData)
        .where(eq(organizationMarketplaceSetting.id, existing.id))

      const updated = await db().query.organizationMarketplaceSetting.findFirst(
        {
          where: eq(organizationMarketplaceSetting.id, existing.id),
        }
      )

      return c.json({
        settings: {
          id: updated!.id,
          organizationId: updated!.organizationId,
          restrictMarketplaces: updated!.restrictMarketplaces,
          allowedMarketplaceIds: JSON.parse(
            updated!.allowedMarketplaceIds || "[]"
          ),
          restrictPlugins: updated!.restrictPlugins,
          allowedPluginIds: JSON.parse(updated!.allowedPluginIds || "[]"),
          defaultPluginIds: JSON.parse(updated!.defaultPluginIds || "[]"),
          requireApproval: updated!.requireApproval,
          createdAt: updated!.createdAt,
          updatedAt: updated!.updatedAt,
        },
      })
    }

    const id = generateOrgMarketplaceSettingId()

    await db()
      .insert(organizationMarketplaceSetting)
      .values({
        id,
        organizationId: orgId,
        restrictMarketplaces: updates.restrictMarketplaces ?? false,
        allowedMarketplaceIds: JSON.stringify(
          updates.allowedMarketplaceIds ?? []
        ),
        restrictPlugins: updates.restrictPlugins ?? false,
        allowedPluginIds: JSON.stringify(updates.allowedPluginIds ?? []),
        defaultPluginIds: JSON.stringify(updates.defaultPluginIds ?? []),
        requireApproval: updates.requireApproval ?? false,
        createdAt: now,
        updatedAt: now,
      })

    const created = await db().query.organizationMarketplaceSetting.findFirst({
      where: eq(organizationMarketplaceSetting.id, id),
    })

    return c.json(
      {
        settings: {
          id: created!.id,
          organizationId: created!.organizationId,
          restrictMarketplaces: created!.restrictMarketplaces,
          allowedMarketplaceIds: JSON.parse(
            created!.allowedMarketplaceIds || "[]"
          ),
          restrictPlugins: created!.restrictPlugins,
          allowedPluginIds: JSON.parse(created!.allowedPluginIds || "[]"),
          defaultPluginIds: JSON.parse(created!.defaultPluginIds || "[]"),
          requireApproval: created!.requireApproval,
          createdAt: created!.createdAt,
          updatedAt: created!.updatedAt,
        },
      },
      201
    )
  }
)

export default organizationMarketplace
