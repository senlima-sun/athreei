/**
 * Organization service
 *
 * Shared helpers for verifying organization membership and access control.
 * Used across multiple route files to prevent duplication.
 */

import { eq, and } from "drizzle-orm"
import { type DatabaseClient } from "../lib/db"
import { member, namespace } from "@athreei/db"
import { ApiError } from "../middleware"

/**
 * Check if a user is a member of an organization.
 *
 * @param db - Database client instance
 * @param userId - The ID of the user to check
 * @param organizationId - The ID of the organization
 * @returns true if the user is a member, false otherwise
 *
 * @example
 * ```typescript
 * const isMember = await verifyOrganizationMembership(db, userId, orgId)
 * if (!isMember) {
 *   throw ApiError.forbidden("Access denied")
 * }
 * ```
 */
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

/**
 * Get a namespace and verify the user has access to it.
 *
 * @param db - Database client instance
 * @param namespaceId - The ID of the namespace to retrieve
 * @param userId - The ID of the user requesting access
 * @returns The namespace record if found and accessible
 * @throws {ApiError} 404 if namespace not found, 403 if user lacks access
 *
 * @example
 * ```typescript
 * const ns = await getNamespaceWithAccess(db, namespaceId, userId)
 * // ns is guaranteed to exist and user has access
 * ```
 */
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

/**
 * Verify user has organization access and throw if not.
 *
 * Convenience wrapper that throws an ApiError if access is denied,
 * avoiding the need for manual checking in route handlers.
 *
 * @param db - Database client instance
 * @param userId - The ID of the user to check
 * @param organizationId - The ID of the organization
 * @param errorMessage - Optional custom error message
 * @throws {ApiError} 403 if user is not a member of the organization
 *
 * @example
 * ```typescript
 * await requireOrganizationMembership(db, userId, orgId)
 * // If we reach here, access is granted
 * ```
 */
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
