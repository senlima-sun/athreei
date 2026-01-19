/**
 * Audit Log repository
 *
 * Handles CRUD operations for audit log entries.
 */

import type { AuditLogEntry, AuditStatus } from "@athreei/shared"
import { db } from "../db-instance"

/**
 * Database row type
 */
interface AuditLogRow {
  id: string
  timestamp: number
  ai_app: string | null
  tool: string
  origin: string | null
  args: string | null
  result: string | null
  status: string
}

/**
 * Convert database row to AuditLogEntry type
 */
function rowToAuditLogEntry(row: AuditLogRow): AuditLogEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    aiApp: row.ai_app ?? undefined,
    tool: row.tool,
    origin: row.origin ?? undefined,
    args: row.args ? JSON.parse(row.args) : undefined,
    result: row.result ? JSON.parse(row.result) : undefined,
    status: row.status as AuditStatus,
  }
}

/**
 * Create a new audit log entry
 */
export function createAuditLogEntry(
  entry: Omit<AuditLogEntry, "id" | "timestamp"> & {
    id?: string
    timestamp?: number
  }
): AuditLogEntry {
  const id = entry.id || crypto.randomUUID()
  const timestamp = entry.timestamp || Date.now()

  db.query(
    `INSERT INTO audit_log (id, timestamp, ai_app, tool, origin, args, result, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    timestamp,
    entry.aiApp ?? null,
    entry.tool,
    entry.origin ?? null,
    entry.args ? JSON.stringify(entry.args) : null,
    entry.result ? JSON.stringify(entry.result) : null,
    entry.status
  )

  const result = findAuditLogEntryById(id)
  if (!result) {
    throw new Error("Failed to create audit log entry")
  }

  return result
}

/**
 * Find audit log entry by ID
 */
export function findAuditLogEntryById(id: string): AuditLogEntry | null {
  const row = db
    .query<AuditLogRow, [string]>("SELECT * FROM audit_log WHERE id = ?")
    .get(id)

  return row ? rowToAuditLogEntry(row) : null
}

/**
 * List audit log entries with optional filters
 */
export function listAuditLogEntries(options?: {
  limit?: number
  offset?: number
  origin?: string
  tool?: string
  status?: AuditStatus
  aiApp?: string
  from?: number
  to?: number
}): AuditLogEntry[] {
  const limit = options?.limit ?? 100
  const offset = options?.offset ?? 0

  // Build query dynamically based on filters
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (options?.origin) {
    conditions.push("origin = ?")
    params.push(options.origin)
  }

  if (options?.tool) {
    conditions.push("tool = ?")
    params.push(options.tool)
  }

  if (options?.status) {
    conditions.push("status = ?")
    params.push(options.status)
  }

  if (options?.aiApp) {
    conditions.push("ai_app = ?")
    params.push(options.aiApp)
  }

  if (options?.from) {
    conditions.push("timestamp >= ?")
    params.push(options.from)
  }

  if (options?.to) {
    conditions.push("timestamp <= ?")
    params.push(options.to)
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  const query = `
    SELECT * FROM audit_log
    ${whereClause}
    ORDER BY timestamp DESC
    LIMIT ? OFFSET ?
  `

  params.push(limit, offset)

  const rows = db.query<AuditLogRow, (string | number)[]>(query).all(...params)

  return rows.map(rowToAuditLogEntry)
}

/**
 * Count audit log entries with optional filters
 */
export function countAuditLogEntries(options?: {
  origin?: string
  tool?: string
  status?: AuditStatus
  aiApp?: string
  from?: number
  to?: number
}): number {
  // Build query dynamically based on filters
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (options?.origin) {
    conditions.push("origin = ?")
    params.push(options.origin)
  }

  if (options?.tool) {
    conditions.push("tool = ?")
    params.push(options.tool)
  }

  if (options?.status) {
    conditions.push("status = ?")
    params.push(options.status)
  }

  if (options?.aiApp) {
    conditions.push("ai_app = ?")
    params.push(options.aiApp)
  }

  if (options?.from) {
    conditions.push("timestamp >= ?")
    params.push(options.from)
  }

  if (options?.to) {
    conditions.push("timestamp <= ?")
    params.push(options.to)
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""
  const query = `SELECT COUNT(*) as count FROM audit_log ${whereClause}`

  const result = db
    .query<{ count: number }, (string | number)[]>(query)
    .get(...params)

  return result?.count ?? 0
}

/**
 * Delete audit log entries older than a timestamp
 */
export function deleteAuditLogEntriesOlderThan(timestamp: number): number {
  const result = db
    .query("DELETE FROM audit_log WHERE timestamp < ?")
    .run(timestamp)

  return result.changes
}

/**
 * Delete all audit log entries
 */
export function clearAuditLog(): number {
  const result = db.query("DELETE FROM audit_log").run()
  return result.changes
}

/**
 * Get recent audit log entries (last N entries)
 */
export function getRecentAuditLogEntries(count: number = 50): AuditLogEntry[] {
  const rows = db
    .query<
      AuditLogRow,
      [number]
    >("SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ?")
    .all(count)

  return rows.map(rowToAuditLogEntry)
}
