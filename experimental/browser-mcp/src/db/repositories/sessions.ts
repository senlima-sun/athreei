/**
 * Sessions repository
 *
 * Handles CRUD operations for session tracking.
 */

import type { Session } from "@athreei/shared"
import { db } from "../db-instance"

/**
 * Database row type
 */
interface SessionRow {
  id: string
  tab_id: number | null
  origin: string
  started_at: number
  ended_at: number | null
  metadata: string | null
}

/**
 * Convert database row to Session type
 */
function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    tabId: row.tab_id ?? undefined,
    origin: row.origin,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? undefined,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  }
}

/**
 * Create a new session
 */
export function createSession(
  session: Omit<Session, "id" | "startedAt"> & {
    id?: string
    startedAt?: number
  }
): Session {
  const id = session.id || crypto.randomUUID()
  const startedAt = session.startedAt || Date.now()

  db.query(
    `INSERT INTO sessions (id, tab_id, origin, started_at, ended_at, metadata)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    session.tabId ?? null,
    session.origin,
    startedAt,
    session.endedAt ?? null,
    session.metadata ? JSON.stringify(session.metadata) : null
  )

  // Return the created session
  const result = findSessionById(id)
  if (!result) {
    throw new Error("Failed to create session")
  }

  return result
}

/**
 * Find session by ID
 */
export function findSessionById(id: string): Session | null {
  const row = db
    .query<SessionRow, [string]>("SELECT * FROM sessions WHERE id = ?")
    .get(id)

  return row ? rowToSession(row) : null
}

/**
 * Find all active sessions (where ended_at is null)
 */
export function findActiveSessions(): Session[] {
  const rows = db
    .query<
      SessionRow,
      []
    >("SELECT * FROM sessions WHERE ended_at IS NULL ORDER BY started_at DESC")
    .all()

  return rows.map(rowToSession)
}

/**
 * Find active sessions by origin
 */
export function findActiveSessionsByOrigin(origin: string): Session[] {
  const rows = db
    .query<
      SessionRow,
      [string]
    >("SELECT * FROM sessions WHERE origin = ? AND ended_at IS NULL ORDER BY started_at DESC")
    .all(origin)

  return rows.map(rowToSession)
}

/**
 * Find session by tab ID (returns the most recent active session for that tab)
 */
export function findActiveSessionByTabId(tabId: number): Session | null {
  const row = db
    .query<SessionRow, [number]>(
      `SELECT * FROM sessions
       WHERE tab_id = ? AND ended_at IS NULL
       ORDER BY started_at DESC
       LIMIT 1`
    )
    .get(tabId)

  return row ? rowToSession(row) : null
}

/**
 * End a session by setting ended_at to now
 */
export function endSession(id: string, endedAt?: number): boolean {
  const timestamp = endedAt || Date.now()

  const result = db
    .query("UPDATE sessions SET ended_at = ? WHERE id = ?")
    .run(timestamp, id)

  return result.changes > 0
}

/**
 * End all active sessions for a tab
 */
export function endSessionsByTabId(tabId: number, endedAt?: number): number {
  const timestamp = endedAt || Date.now()

  const result = db
    .query(
      "UPDATE sessions SET ended_at = ? WHERE tab_id = ? AND ended_at IS NULL"
    )
    .run(timestamp, tabId)

  return result.changes
}

/**
 * Update session metadata
 */
export function updateSessionMetadata(
  id: string,
  metadata: Record<string, unknown>
): boolean {
  const result = db
    .query("UPDATE sessions SET metadata = ? WHERE id = ?")
    .run(JSON.stringify(metadata), id)

  return result.changes > 0
}

/**
 * List sessions with optional filters and pagination
 */
export function listSessions(options?: {
  limit?: number
  offset?: number
  origin?: string
  tabId?: number
  activeOnly?: boolean
}): Session[] {
  const limit = options?.limit ?? 100
  const offset = options?.offset ?? 0

  // Build query dynamically based on filters
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (options?.origin) {
    conditions.push("origin = ?")
    params.push(options.origin)
  }

  if (options?.tabId !== undefined) {
    conditions.push("tab_id = ?")
    params.push(options.tabId)
  }

  if (options?.activeOnly) {
    conditions.push("ended_at IS NULL")
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  const query = `
    SELECT * FROM sessions
    ${whereClause}
    ORDER BY started_at DESC
    LIMIT ? OFFSET ?
  `

  params.push(limit, offset)

  const rows = db.query<SessionRow, (string | number)[]>(query).all(...params)

  return rows.map(rowToSession)
}

/**
 * Count sessions with optional filters
 */
export function countSessions(options?: {
  origin?: string
  tabId?: number
  activeOnly?: boolean
}): number {
  // Build query dynamically based on filters
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (options?.origin) {
    conditions.push("origin = ?")
    params.push(options.origin)
  }

  if (options?.tabId !== undefined) {
    conditions.push("tab_id = ?")
    params.push(options.tabId)
  }

  if (options?.activeOnly) {
    conditions.push("ended_at IS NULL")
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  const query = `SELECT COUNT(*) as count FROM sessions ${whereClause}`

  const result = db
    .query<{ count: number }, (string | number)[]>(query)
    .get(...params)

  return result?.count ?? 0
}

/**
 * Delete a session by ID
 */
export function deleteSession(id: string): boolean {
  const result = db.query("DELETE FROM sessions WHERE id = ?").run(id)
  return result.changes > 0
}

/**
 * Delete sessions older than a timestamp
 */
export function deleteSessionsOlderThan(timestamp: number): number {
  const result = db
    .query("DELETE FROM sessions WHERE started_at < ?")
    .run(timestamp)

  return result.changes
}

/**
 * Delete all sessions
 */
export function clearSessions(): number {
  const result = db.query("DELETE FROM sessions").run()
  return result.changes
}
