/**
 * Session-related type definitions
 */

/**
 * A session record representing an AI interaction session
 */
export interface Session {
  id: string
  tabId?: number
  origin: string
  startedAt: number
  endedAt?: number
  metadata?: Record<string, unknown>
}

/**
 * Response from the sessions API
 */
export interface SessionsResponse {
  data: Session[]
  count: number
  total: number
}
