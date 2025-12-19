/**
 * Tests for permissions repository
 */

import { describe, it, expect, beforeEach } from "vitest"
import { Database } from "bun:sqlite"
import { runMigrations } from "../migrations"
import { createPermissionsRepository } from "./permissions-factory"
import type { PermissionLevel } from "@athreei/shared"

let db: Database
let repo: ReturnType<typeof createPermissionsRepository>

beforeEach(() => {
  db = new Database(":memory:")
  db.exec("PRAGMA journal_mode = WAL")
  db.exec("PRAGMA foreign_keys = ON")
  runMigrations(db)
  repo = createPermissionsRepository(db)
})

describe("Permissions Repository", () => {
  describe("upsert", () => {
    it("should create a new permission", () => {
      const permission = repo.upsert({
        origin: "https://example.com",
        tool: "browser_navigate",
        allowed: "allowed" as PermissionLevel,
      })

      expect(permission).toBeDefined()
      expect(permission.id).toBeDefined()
      expect(permission.origin).toBe("https://example.com")
      expect(permission.tool).toBe("browser_navigate")
      expect(permission.allowed).toBe("allowed")
      expect(permission.createdAt).toBeGreaterThan(0)
      expect(permission.updatedAt).toBeGreaterThan(0)
    })

    it("should update existing permission", () => {
      const initial = repo.upsert({
        origin: "https://example.com",
        tool: "browser_navigate",
        allowed: "ask" as PermissionLevel,
      })

      const updated = repo.upsert({
        origin: "https://example.com",
        tool: "browser_navigate",
        allowed: "allowed" as PermissionLevel,
      })

      expect(updated.id).toBe(initial.id)
      expect(updated.allowed).toBe("allowed")
      expect(updated.updatedAt).toBeGreaterThanOrEqual(initial.updatedAt)
    })

    it("should handle all permission levels", () => {
      const levels: PermissionLevel[] = ["denied", "allowed", "ask"]

      for (const level of levels) {
        const permission = repo.upsert({
          origin: `https://${level}.com`,
          tool: "browser_navigate",
          allowed: level,
        })

        expect(permission.allowed).toBe(level)
      }
    })
  })

  describe("findByOriginAndTool", () => {
    it("should find existing permission", () => {
      const created = repo.upsert({
        origin: "https://example.com",
        tool: "browser_navigate",
        allowed: "allowed" as PermissionLevel,
      })

      const found = repo.findByOriginAndTool("https://example.com", "browser_navigate")

      expect(found).toBeDefined()
      expect(found?.id).toBe(created.id)
    })

    it("should return null for non-existent permission", () => {
      const found = repo.findByOriginAndTool(
        "https://nonexistent.com",
        "browser_navigate"
      )

      expect(found).toBeNull()
    })
  })

  describe("findByOrigin", () => {
    it("should find all permissions for an origin", () => {
      repo.upsert({
        origin: "https://example.com",
        tool: "browser_navigate",
        allowed: "allowed" as PermissionLevel,
      })

      repo.upsert({
        origin: "https://example.com",
        tool: "browser_click",
        allowed: "ask" as PermissionLevel,
      })

      repo.upsert({
        origin: "https://other.com",
        tool: "browser_navigate",
        allowed: "denied" as PermissionLevel,
      })

      const permissions = repo.findByOrigin("https://example.com")

      expect(permissions).toHaveLength(2)
      expect(permissions.every((p) => p.origin === "https://example.com")).toBe(true)
    })

    it("should return empty array for origin with no permissions", () => {
      const permissions = repo.findByOrigin("https://nonexistent.com")
      expect(permissions).toHaveLength(0)
    })
  })

  describe("delete", () => {
    it("should delete a permission by ID", () => {
      const permission = repo.upsert({
        origin: "https://example.com",
        tool: "browser_navigate",
        allowed: "allowed" as PermissionLevel,
      })

      const deleted = repo.delete(permission.id)
      expect(deleted).toBe(true)

      const found = repo.findByOriginAndTool("https://example.com", "browser_navigate")
      expect(found).toBeNull()
    })

    it("should return false for non-existent ID", () => {
      const deleted = repo.delete("non-existent-id")
      expect(deleted).toBe(false)
    })
  })

  describe("list", () => {
    it("should list all permissions", () => {
      repo.upsert({
        origin: "https://example1.com",
        tool: "browser_navigate",
        allowed: "allowed" as PermissionLevel,
      })

      repo.upsert({
        origin: "https://example2.com",
        tool: "browser_click",
        allowed: "ask" as PermissionLevel,
      })

      const permissions = repo.list()
      expect(permissions.length).toBeGreaterThanOrEqual(2)
    })

    it("should support pagination", () => {
      for (let i = 0; i < 5; i++) {
        repo.upsert({
          origin: `https://example${i}.com`,
          tool: "browser_navigate",
          allowed: "allowed" as PermissionLevel,
        })
      }

      const page1 = repo.list({ limit: 2, offset: 0 })
      const page2 = repo.list({ limit: 2, offset: 2 })

      expect(page1).toHaveLength(2)
      expect(page2).toHaveLength(2)
      expect(page1[0].id).not.toBe(page2[0].id)
    })
  })

  describe("count", () => {
    it("should count total permissions", () => {
      const initialCount = repo.count()

      repo.upsert({
        origin: "https://example1.com",
        tool: "browser_navigate",
        allowed: "allowed" as PermissionLevel,
      })

      repo.upsert({
        origin: "https://example2.com",
        tool: "browser_click",
        allowed: "ask" as PermissionLevel,
      })

      const finalCount = repo.count()
      expect(finalCount).toBe(initialCount + 2)
    })
  })

  describe("deleteByOrigin", () => {
    it("should delete all permissions for an origin", () => {
      repo.upsert({
        origin: "https://example.com",
        tool: "browser_navigate",
        allowed: "allowed" as PermissionLevel,
      })

      repo.upsert({
        origin: "https://example.com",
        tool: "browser_click",
        allowed: "ask" as PermissionLevel,
      })

      repo.upsert({
        origin: "https://other.com",
        tool: "browser_navigate",
        allowed: "denied" as PermissionLevel,
      })

      const deleted = repo.deleteByOrigin("https://example.com")
      expect(deleted).toBe(2)

      const remaining = repo.findByOrigin("https://example.com")
      expect(remaining).toHaveLength(0)

      const other = repo.findByOrigin("https://other.com")
      expect(other).toHaveLength(1)
    })
  })
})
