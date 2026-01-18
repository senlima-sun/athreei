import type { Context } from "hono"
import { eq } from "drizzle-orm"
import { getAuthContext, ApiError } from "../../middleware"
import { db } from "../../lib/db-operations"
import { marketplace } from "@athreei/db"
import { verifyOrganizationMembership, syncMarketplace } from "../../services"

export async function syncMarketplaceController(c: Context): Promise<Response> {
  const auth = getAuthContext(c)
  const slug = c.req.param("slug")

  const mkt = await db().query.marketplace.findFirst({
    where: eq(marketplace.slug, slug),
  })

  if (!mkt) {
    throw ApiError.notFound("Marketplace not found")
  }

  if (mkt.ownerType === "organization" && mkt.ownerId) {
    const isMember = await verifyOrganizationMembership(
      auth.userId,
      mkt.ownerId
    )
    if (!isMember) {
      throw ApiError.forbidden("You do not have access to this marketplace")
    }
  } else if (mkt.ownerType === "system") {
    throw ApiError.forbidden("System marketplaces can only be synced by admins")
  }

  if (mkt.sourceType === "internal") {
    throw ApiError.badRequest(
      "Internal marketplaces cannot be synced from external source"
    )
  }

  try {
    const result = await syncMarketplace(mkt.id)

    if (
      result.errors.length > 0 &&
      result.added === 0 &&
      result.updated === 0
    ) {
      throw ApiError.badRequest(
        `Sync failed: ${result.errors.join(", ")}`,
        "SYNC_FAILED"
      )
    }

    return c.json({
      sync: {
        added: result.added,
        updated: result.updated,
        removed: result.removed,
        errors: result.errors,
      },
    })
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw ApiError.internal(
      error instanceof Error ? error.message : "Sync failed"
    )
  }
}
