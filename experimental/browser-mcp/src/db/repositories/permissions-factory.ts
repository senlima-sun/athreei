/**
 * Permissions repository factory
 *
 * Handles CRUD operations for permissions.
 * This factory pattern allows for dependency injection in tests.
 */

import type { Database } from "bun:sqlite"
import type { Permission, PermissionLevel } from "@athreei/shared"

/**
 * Convert PermissionLevel to SQLite integer
 */
function permissionToInt(level: PermissionLevel): number {
  switch (level) {
    case "denied":
      return 0
    case "allowed":
      return 1
    case "ask":
      return 2
  }
}

/**
 * Convert SQLite integer to PermissionLevel
 */
function intToPermission(value: number): PermissionLevel {
  switch (value) {
    case 0:
      return "denied"
    case 1:
      return "allowed"
    case 2:
      return "ask"
    default:
      return "ask" // Default to ask for unknown values
  }
}

/**
 * Database row type
 */
interface PermissionRow {
  id: string
  origin: string
  tool: string
  allowed: number
  created_at: number
  updated_at: number
}

/**
 * Convert database row to Permission type
 */
function rowToPermission(row: PermissionRow): Permission {
  return {
    id: row.id,
    origin: row.origin,
    tool: row.tool,
    allowed: intToPermission(row.allowed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Create permissions repository with the given database instance
 */
export function createPermissionsRepository(db: Database) {
  return {
    findByOriginAndTool(origin: string, tool: string): Permission | null {
      const row = db
        .query<
          PermissionRow,
          [string, string]
        >("SELECT * FROM permissions WHERE origin = ? AND tool = ?")
        .get(origin, tool)

      return row ? rowToPermission(row) : null
    },

    findByOrigin(origin: string): Permission[] {
      const rows = db
        .query<
          PermissionRow,
          [string]
        >("SELECT * FROM permissions WHERE origin = ?")
        .all(origin)

      return rows.map(rowToPermission)
    },

    upsert(
      permission: Omit<Permission, "id" | "createdAt" | "updatedAt"> & {
        id?: string
      }
    ): Permission {
      const id = permission.id || crypto.randomUUID()
      const now = Date.now()
      const allowed = permissionToInt(permission.allowed)

      const updated = db
        .query(
          `UPDATE permissions
           SET allowed = ?, updated_at = ?
           WHERE origin = ? AND tool = ?`
        )
        .run(allowed, now, permission.origin, permission.tool)

      // If no rows were updated, insert
      if (updated.changes === 0) {
        db.query(
          `INSERT INTO permissions (id, origin, tool, allowed, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(id, permission.origin, permission.tool, allowed, now, now)
      }

      const result = this.findByOriginAndTool(
        permission.origin,
        permission.tool
      )
      if (!result) {
        throw new Error("Failed to upsert permission")
      }

      return result
    },

    delete(id: string): boolean {
      const result = db.query("DELETE FROM permissions WHERE id = ?").run(id)
      return result.changes > 0
    },

    list(options?: { limit?: number; offset?: number }): Permission[] {
      const limit = options?.limit ?? 100
      const offset = options?.offset ?? 0

      const rows = db
        .query<
          PermissionRow,
          [number, number]
        >("SELECT * FROM permissions ORDER BY created_at DESC LIMIT ? OFFSET ?")
        .all(limit, offset)

      return rows.map(rowToPermission)
    },

    count(): number {
      const result = db
        .query<
          { count: number },
          []
        >("SELECT COUNT(*) as count FROM permissions")
        .get()

      return result?.count ?? 0
    },

    deleteByOrigin(origin: string): number {
      const result = db
        .query("DELETE FROM permissions WHERE origin = ?")
        .run(origin)

      return result.changes
    },
  }
}

export type PermissionsRepository = ReturnType<
  typeof createPermissionsRepository
>
