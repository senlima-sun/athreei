import { createMiddleware } from "hono/factory"
import type { Context } from "hono"
import { verifyOrganizationMembership } from "../services"
import { ApiError } from "./error"
import { getAuthContext } from "./auth"

export interface OrgContext {
  organizationId: string
}

export type OrgVariables = {
  org: OrgContext
}

export function getOrgContext(c: Context): OrgContext {
  const org = c.get("org") as OrgContext | undefined
  if (!org) {
    throw new Error(
      "Organization context not found. Did you forget to add org middleware?"
    )
  }
  return org
}

export const withOrgFromQuery = createMiddleware<{ Variables: OrgVariables }>(
  async (c, next) => {
    const organizationId = c.req.query("organizationId")

    if (!organizationId) {
      throw ApiError.badRequest("organizationId query parameter is required")
    }

    const auth = getAuthContext(c)

    const isMember = await verifyOrganizationMembership(
      auth.userId,
      organizationId
    )

    if (!isMember) {
      throw ApiError.forbidden("You do not have access to this organization")
    }

    c.set("org", { organizationId })
    await next()
  }
)

export const withOptionalOrgFromQuery = createMiddleware<{
  Variables: OrgVariables
}>(async (c, next) => {
  const organizationId = c.req.query("organizationId")

  if (organizationId) {
    const auth = getAuthContext(c)

    const isMember = await verifyOrganizationMembership(
      auth.userId,
      organizationId
    )

    if (!isMember) {
      throw ApiError.forbidden("You do not have access to this organization")
    }

    c.set("org", { organizationId })
  }

  await next()
})
