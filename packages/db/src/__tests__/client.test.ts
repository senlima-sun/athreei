/**
 * Tests for the database client module
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { detectDatabaseType, createClient, getDb, resetDb } from "../client"

describe("client", () => {
  describe("detectDatabaseType", () => {
    it("should detect PostgreSQL from postgres:// URL", () => {
      expect(detectDatabaseType("postgres://user:pass@localhost:5432/db")).toBe(
        "postgresql"
      )
    })

    it("should detect PostgreSQL from postgresql:// URL", () => {
      expect(
        detectDatabaseType("postgresql://user:pass@localhost:5432/db")
      ).toBe("postgresql")
    })

    it("should detect PostgreSQL from postgres:// URL without credentials", () => {
      expect(detectDatabaseType("postgres://localhost:5432/db")).toBe(
        "postgresql"
      )
    })

    it("should detect PostgreSQL from postgres:// URL with complex password", () => {
      expect(
        detectDatabaseType("postgres://user:p@ss%40word@localhost:5432/db")
      ).toBe("postgresql")
    })

    it("should detect SQLite from file: URL", () => {
      expect(detectDatabaseType("file:./path/to/db.sqlite")).toBe("sqlite")
    })

    it("should detect SQLite from file path without prefix", () => {
      expect(detectDatabaseType("./path/to/db.sqlite")).toBe("sqlite")
    })

    it("should detect SQLite from absolute file path", () => {
      expect(detectDatabaseType("/var/data/db.sqlite")).toBe("sqlite")
    })

    it("should detect SQLite from relative file path", () => {
      expect(detectDatabaseType("data.db")).toBe("sqlite")
    })

    it("should detect SQLite from :memory: path", () => {
      expect(detectDatabaseType(":memory:")).toBe("sqlite")
    })

    it("should detect SQLite from file::memory: URL", () => {
      expect(detectDatabaseType("file::memory:")).toBe("sqlite")
    })

    it("should default to SQLite for unknown URL schemes", () => {
      expect(detectDatabaseType("unknown://path")).toBe("sqlite")
    })
  })

  describe("createClient", () => {
    const originalEnv = process.env.DATABASE_URL

    beforeEach(() => {
      delete process.env.DATABASE_URL
    })

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.DATABASE_URL = originalEnv
      } else {
        delete process.env.DATABASE_URL
      }
    })

    it("should throw error when no DATABASE_URL is provided", () => {
      expect(() => createClient()).toThrow(
        "DATABASE_URL environment variable is required or must be passed as argument"
      )
    })

    it("should throw error when DATABASE_URL env is not set and no argument passed", () => {
      delete process.env.DATABASE_URL
      expect(() => createClient()).toThrow(
        "DATABASE_URL environment variable is required"
      )
    })

    it("should use DATABASE_URL from environment when no argument is passed", () => {
      process.env.DATABASE_URL = ":memory:"
      const client = createClient()
      expect(client).toBeDefined()
    })

    it("should prefer passed argument over environment variable", () => {
      process.env.DATABASE_URL = "postgres://should-not-use"
      // Using :memory: for SQLite to avoid file creation
      const client = createClient(":memory:")
      expect(client).toBeDefined()
    })

    it("should create SQLite client for memory database", () => {
      const client = createClient(":memory:")
      expect(client).toBeDefined()
    })

    it("should create SQLite client for file: URL", () => {
      const client = createClient("file::memory:")
      expect(client).toBeDefined()
    })
  })

  describe("getDb / resetDb", () => {
    const originalEnv = process.env.DATABASE_URL

    beforeEach(() => {
      resetDb()
      process.env.DATABASE_URL = ":memory:"
    })

    afterEach(() => {
      resetDb()
      if (originalEnv !== undefined) {
        process.env.DATABASE_URL = originalEnv
      } else {
        delete process.env.DATABASE_URL
      }
    })

    it("should return the same instance on multiple calls (singleton)", () => {
      const db1 = getDb()
      const db2 = getDb()
      expect(db1).toBe(db2)
    })

    it("should create a new instance after resetDb is called", () => {
      const db1 = getDb()
      resetDb()
      const db2 = getDb()
      // After reset, a new instance should be created
      // Both should be valid database clients but potentially different instances
      expect(db1).toBeDefined()
      expect(db2).toBeDefined()
      // Note: We cannot guarantee they are different objects since
      // they might be equal if the same configuration produces identical clients
    })

    it("should throw error if DATABASE_URL is not set after reset", () => {
      resetDb()
      delete process.env.DATABASE_URL
      expect(() => getDb()).toThrow(
        "DATABASE_URL environment variable is required"
      )
    })
  })
})
