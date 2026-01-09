import { eq, and } from "drizzle-orm"
import { type DatabaseClient } from "../lib/db"
import { member, namespace } from "@athreei/db"
import { ApiError } from "../middleware"

export async function verifyOrganizationMembership(
  db: DatabaseClient,
  userId: string,
  organizationId: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membership = await (db as any).query.member.findFirst({
    where: and(
      eq(member.userId, userId),
      eq(member.organizationId, organizationId)
    ),
  })
  return !!membership
}

export async function getNamespaceWithAccess(
  db: DatabaseClient,
  namespaceId: string,
  userId: string
): Promise<typeof namespace.$inferSelect> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ns = await (db as any).query.namespace.findFirst({
    where: eq(namespace.id, namespaceId),
  })

  if (!ns) {
    throw ApiError.notFound("Namespace not found")
  }

  const isMember = await verifyOrganizationMembership(
    db,
    userId,
    ns.organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden("You do not have access to this namespace")
  }

  return ns
}

export async function requireOrganizationMembership(
  db: DatabaseClient,
  userId: string,
  organizationId: string,
  errorMessage = "You do not have access to this organization"
): Promise<void> {
  const isMember = await verifyOrganizationMembership(
    db,
    userId,
    organizationId
  )
  if (!isMember) {
    throw ApiError.forbidden(errorMessage)
  }
}
