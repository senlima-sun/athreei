import { eq, and } from "drizzle-orm"
import { db } from "../lib/db-operations"
import { member, namespace } from "@athreei/db"
import { ApiError } from "../middleware"

export async function verifyOrganizationMembership(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const membership = await db().query.member.findFirst({
    where: and(
      eq(member.userId, userId),
      eq(member.organizationId, organizationId)
    ),
  })
  return !!membership
}

export async function getNamespaceWithAccess(
  namespaceId: string,
  userId: string
): Promise<typeof namespace.$inferSelect> {
  const ns = await db().query.namespace.findFirst({
    where: eq(namespace.id, namespaceId),
  })

  if (!ns) {
    throw ApiError.notFound("Namespace not found")
  }

  const isMember = await verifyOrganizationMembership(userId, ns.organizationId)
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this namespace")
  }

  return ns
}

export async function requireOrganizationMembership(
  userId: string,
  organizationId: string,
  errorMessage = "You do not have access to this organization"
): Promise<void> {
  const isMember = await verifyOrganizationMembership(userId, organizationId)
  if (!isMember) {
    throw ApiError.forbidden(errorMessage)
  }
}
