import { createAccessControl, type Role } from "better-auth/plugins/access"

/**
 * Base permissions for user management
 * Other features extend this with their own permissions
 */
export const baseStatement = {
  user: ["ban", "unban", "set-role", "impersonate", "delete", "list"],
} as const

/**
 * Access control instance
 * Features can extend with: ac.newRole({ ...baseAdmin, customPerm: [...] })
 */
export const ac = createAccessControl(baseStatement)

/**
 * Base admin role - full user management
 */
export const baseAdminRole = ac.newRole({
  user: ["ban", "unban", "set-role", "impersonate", "delete", "list"],
})

/**
 * Base moderator role - limited user management
 * Features extend this with specific permissions
 */
export const baseModeratorRole = ac.newRole({
  user: ["list"],
})

/**
 * Roles configuration for admin plugin
 */
export const roles = {
  admin: baseAdminRole,
  moderator: baseModeratorRole,
} as const satisfies Record<string, Role>

/**
 * Type helper for extending permissions
 */
export type BaseStatement = typeof baseStatement
