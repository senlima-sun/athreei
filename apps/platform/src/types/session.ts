/**
 * Session-related type definitions
 */

/**
 * A user authentication session
 */
export interface Session {
  id: string
  device?: string
  browser?: string
  lastActive: string
  current: boolean
  ipAddress?: string
  userAgent?: string
  createdAt: string
}
