/**
 * Permission-related type definitions
 */

/**
 * Permission levels for tool access
 */
export type PermissionLevel = "allowed" | "denied" | "ask"

/**
 * A permission record controlling tool access for an origin
 */
export interface Permission {
  id: string
  origin: string
  tool: string
  allowed: PermissionLevel
  createdAt: number
  updatedAt: number
}

/**
 * Response from the permissions API
 */
export interface PermissionsResponse {
  data: Permission[]
  count: number
}
