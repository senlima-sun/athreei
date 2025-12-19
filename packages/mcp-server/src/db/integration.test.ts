/**
 * Integration tests for the database layer
 *
 * Tests that all repositories work correctly together
 */

import { describe, it, expect, beforeEach } from "vitest"
import { Database } from "bun:sqlite"
import { runMigrations } from "./migrations"
import { createPermissionsRepository } from "./repositories/permissions-factory"
import type { PermissionLevel, AuditStatus } from "@athreei/shared"

// We'll use the actual repositories for audit log and sessions since they're simpler
// In a full implementation, we'd create factories for these too
let db: Database

beforeEach(() => {
  db = new Database(":memory:")
  db.exec("PRAGMA journal_mode = WAL")
  db.exec("PRAGMA foreign_keys = ON")
  runMigrations(db)
})

describe("Database Integration", () => {
  it("should create and migrate database successfully", () => {
    // Check that all tables exist
    const tables = db
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
      )
      .all()

    const tableNames = tables.map((t) => t.name)

    expect(tableNames).toContain("permissions")
    expect(tableNames).toContain("audit_log")
    expect(tableNames).toContain("sessions")
    expect(tableNames).toContain("_migrations")
  })

  it("should have correct indexes on permissions table", () => {
    const indexes = db
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='permissions'"
      )
      .all()

    const indexNames = indexes.map((i) => i.name)

    expect(indexNames).toContain("idx_permissions_origin")
    expect(indexNames).toContain("idx_permissions_tool")
    expect(indexNames).toContain("idx_permissions_origin_tool")
  })

  it("should have correct indexes on audit_log table", () => {
    const indexes = db
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='audit_log'"
      )
      .all()

    const indexNames = indexes.map((i) => i.name)

    expect(indexNames).toContain("idx_audit_log_timestamp")
    expect(indexNames).toContain("idx_audit_log_origin")
    expect(indexNames).toContain("idx_audit_log_tool")
    expect(indexNames).toContain("idx_audit_log_status")
    expect(indexNames).toContain("idx_audit_log_ai_app")
  })

  it("should have correct indexes on sessions table", () => {
    const indexes = db
      .query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='sessions'"
      )
      .all()

    const indexNames = indexes.map((i) => i.name)

    expect(indexNames).toContain("idx_sessions_origin")
    expect(indexNames).toContain("idx_sessions_tab_id")
    expect(indexNames).toContain("idx_sessions_started_at")
    expect(indexNames).toContain("idx_sessions_ended_at")
  })

  it("should enforce unique constraint on permissions", () => {
    const permRepo = createPermissionsRepository(db)

    permRepo.upsert({
      origin: "https://example.com",
      tool: "browser_navigate",
      allowed: "allowed" as PermissionLevel,
    })

    // This should update, not create a new record
    permRepo.upsert({
      origin: "https://example.com",
      tool: "browser_navigate",
      allowed: "denied" as PermissionLevel,
    })

    const count = permRepo.count()
    expect(count).toBe(1)

    const perm = permRepo.findByOriginAndTool(
      "https://example.com",
      "browser_navigate"
    )
    expect(perm?.allowed).toBe("denied")
  })

  it("should handle permission lifecycle correctly", () => {
    const permRepo = createPermissionsRepository(db)

    // Create
    const created = permRepo.upsert({
      origin: "https://example.com",
      tool: "browser_click",
      allowed: "ask" as PermissionLevel,
    })

    expect(created.id).toBeDefined()

    // Read
    const found = permRepo.findByOriginAndTool(
      "https://example.com",
      "browser_click"
    )
    expect(found?.id).toBe(created.id)

    // Update
    const updated = permRepo.upsert({
      origin: "https://example.com",
      tool: "browser_click",
      allowed: "allowed" as PermissionLevel,
    })
    expect(updated.allowed).toBe("allowed")

    // Delete
    const deleted = permRepo.delete(created.id)
    expect(deleted).toBe(true)

    const notFound = permRepo.findByOriginAndTool(
      "https://example.com",
      "browser_click"
    )
    expect(notFound).toBeNull()
  })

  it("should handle concurrent database operations", () => {
    const permRepo = createPermissionsRepository(db)

    // Create multiple permissions
    const permissions = [
      { origin: "https://site1.com", tool: "tool1", allowed: "allowed" as PermissionLevel },
      { origin: "https://site2.com", tool: "tool2", allowed: "denied" as PermissionLevel },
      { origin: "https://site3.com", tool: "tool3", allowed: "ask" as PermissionLevel },
    ]

    for (const perm of permissions) {
      permRepo.upsert(perm)
    }

    expect(permRepo.count()).toBe(3)

    // Query different ways
    const byOrigin = permRepo.findByOrigin("https://site1.com")
    expect(byOrigin).toHaveLength(1)

    const all = permRepo.list()
    expect(all.length).toBeGreaterThanOrEqual(3)
  })

  it("should store and retrieve JSON data correctly", () => {
    // Test audit log with complex JSON args and result
    const auditLog = db.query(
      `INSERT INTO audit_log (id, timestamp, ai_app, tool, origin, args, result, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )

    const complexArgs = { url: "https://example.com", options: { timeout: 5000 } }
    const complexResult = { success: true, data: [1, 2, 3] }

    auditLog.run(
      crypto.randomUUID(),
      Date.now(),
      "Claude Desktop",
      "browser_navigate",
      "https://example.com",
      JSON.stringify(complexArgs),
      JSON.stringify(complexResult),
      "success"
    )

    const entry = db
      .query<
        {
          args: string
          result: string
        },
        []
      >("SELECT args, result FROM audit_log LIMIT 1")
      .get()

    expect(entry).toBeDefined()
    expect(JSON.parse(entry!.args)).toEqual(complexArgs)
    expect(JSON.parse(entry!.result)).toEqual(complexResult)
  })

  it("should handle session metadata correctly", () => {
    const metadata = { userAgent: "Chrome", viewport: { width: 1920, height: 1080 } }

    db.query(
      `INSERT INTO sessions (id, tab_id, origin, started_at, metadata)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      crypto.randomUUID(),
      123,
      "https://example.com",
      Date.now(),
      JSON.stringify(metadata)
    )

    const session = db
      .query<{ metadata: string }, []>("SELECT metadata FROM sessions LIMIT 1")
      .get()

    expect(session).toBeDefined()
    expect(JSON.parse(session!.metadata)).toEqual(metadata)
  })

  it("should not run migrations twice", () => {
    // Run migrations again
    runMigrations(db)

    // Check that we only have one migration record
    const migrations = db
      .query<{ id: number }, []>("SELECT id FROM _migrations ORDER BY id")
      .all()

    expect(migrations).toHaveLength(1)
    expect(migrations[0].id).toBe(1)
  })
})
