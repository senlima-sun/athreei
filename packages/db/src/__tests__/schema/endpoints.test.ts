/**
 * Tests for the endpoints schema structure
 *
 * These tests verify the schema definitions without requiring a database connection.
 */
import { describe, it, expect } from "vitest"
import { getTableName, getTableColumns } from "drizzle-orm"
import { SQLiteColumn } from "drizzle-orm/sqlite-core"
import {
  apiKey,
  endpoint,
  apiKeyRelations,
  endpointRelations,
} from "../../schema/sqlite/endpoints"

/**
 * Helper to get column configuration from a Drizzle column
 */
function getColumnConfig(column: SQLiteColumn) {
  return {
    name: column.name,
    dataType: column.dataType,
    notNull: column.notNull,
    hasDefault: column.hasDefault,
    primary: column.primary,
    isUnique: column.isUnique,
  }
}

describe("endpoints schema", () => {
  describe("apiKey table", () => {
    it("should have correct table name", () => {
      expect(getTableName(apiKey)).toBe("api_key")
    })

    it("should have all required columns", () => {
      const columns = getTableColumns(apiKey)
      const columnNames = Object.keys(columns)

      expect(columnNames).toContain("id")
      expect(columnNames).toContain("organizationId")
      expect(columnNames).toContain("createdById")
      expect(columnNames).toContain("name")
      expect(columnNames).toContain("keyHash")
      expect(columnNames).toContain("keyPrefix")
      expect(columnNames).toContain("scopes")
      expect(columnNames).toContain("expiresAt")
      expect(columnNames).toContain("lastUsedAt")
      expect(columnNames).toContain("usageCount")
      expect(columnNames).toContain("revokedAt")
      expect(columnNames).toContain("revokedById")
      expect(columnNames).toContain("createdAt")
      expect(columnNames).toContain("updatedAt")
    })

    it("should have id as primary key", () => {
      const columns = getTableColumns(apiKey)
      expect(getColumnConfig(columns.id as SQLiteColumn).primary).toBe(true)
    })

    it("should have required fields as not null", () => {
      const columns = getTableColumns(apiKey)

      expect(
        getColumnConfig(columns.organizationId as SQLiteColumn).notNull
      ).toBe(true)
      expect(getColumnConfig(columns.createdById as SQLiteColumn).notNull).toBe(
        true
      )
      expect(getColumnConfig(columns.name as SQLiteColumn).notNull).toBe(true)
      expect(getColumnConfig(columns.keyHash as SQLiteColumn).notNull).toBe(
        true
      )
      expect(getColumnConfig(columns.keyPrefix as SQLiteColumn).notNull).toBe(
        true
      )
      expect(getColumnConfig(columns.usageCount as SQLiteColumn).notNull).toBe(
        true
      )
      expect(getColumnConfig(columns.createdAt as SQLiteColumn).notNull).toBe(
        true
      )
      expect(getColumnConfig(columns.updatedAt as SQLiteColumn).notNull).toBe(
        true
      )
    })

    it("should have optional fields", () => {
      const columns = getTableColumns(apiKey)

      expect(getColumnConfig(columns.scopes as SQLiteColumn).notNull).toBe(
        false
      )
      expect(getColumnConfig(columns.expiresAt as SQLiteColumn).notNull).toBe(
        false
      )
      expect(getColumnConfig(columns.lastUsedAt as SQLiteColumn).notNull).toBe(
        false
      )
      expect(getColumnConfig(columns.revokedAt as SQLiteColumn).notNull).toBe(
        false
      )
      expect(getColumnConfig(columns.revokedById as SQLiteColumn).notNull).toBe(
        false
      )
    })

    it("should have usageCount with default value", () => {
      const columns = getTableColumns(apiKey)
      expect(
        getColumnConfig(columns.usageCount as SQLiteColumn).hasDefault
      ).toBe(true)
    })

    it("should have correct data types for key fields", () => {
      const columns = getTableColumns(apiKey)

      expect(getColumnConfig(columns.keyHash as SQLiteColumn).dataType).toBe(
        "string"
      )
      expect(getColumnConfig(columns.keyPrefix as SQLiteColumn).dataType).toBe(
        "string"
      )
      expect(getColumnConfig(columns.usageCount as SQLiteColumn).dataType).toBe(
        "number"
      )
    })
  })

  describe("endpoint table", () => {
    it("should have correct table name", () => {
      expect(getTableName(endpoint)).toBe("endpoint")
    })

    it("should have all required columns", () => {
      const columns = getTableColumns(endpoint)
      const columnNames = Object.keys(columns)

      expect(columnNames).toContain("id")
      expect(columnNames).toContain("organizationId")
      expect(columnNames).toContain("name")
      expect(columnNames).toContain("description")
      expect(columnNames).toContain("url")
      expect(columnNames).toContain("method")
      expect(columnNames).toContain("authType")
      expect(columnNames).toContain("rateLimit")
      expect(columnNames).toContain("status")
      expect(columnNames).toContain("createdAt")
      expect(columnNames).toContain("updatedAt")
    })

    it("should have id as primary key", () => {
      const columns = getTableColumns(endpoint)
      expect(getColumnConfig(columns.id as SQLiteColumn).primary).toBe(true)
    })

    it("should have required fields as not null", () => {
      const columns = getTableColumns(endpoint)

      expect(
        getColumnConfig(columns.organizationId as SQLiteColumn).notNull
      ).toBe(true)
      expect(getColumnConfig(columns.name as SQLiteColumn).notNull).toBe(true)
      expect(getColumnConfig(columns.url as SQLiteColumn).notNull).toBe(true)
      expect(getColumnConfig(columns.method as SQLiteColumn).notNull).toBe(true)
      expect(getColumnConfig(columns.authType as SQLiteColumn).notNull).toBe(
        true
      )
      expect(getColumnConfig(columns.status as SQLiteColumn).notNull).toBe(true)
      expect(getColumnConfig(columns.createdAt as SQLiteColumn).notNull).toBe(
        true
      )
      expect(getColumnConfig(columns.updatedAt as SQLiteColumn).notNull).toBe(
        true
      )
    })

    it("should have optional fields", () => {
      const columns = getTableColumns(endpoint)

      expect(getColumnConfig(columns.description as SQLiteColumn).notNull).toBe(
        false
      )
      expect(getColumnConfig(columns.rateLimit as SQLiteColumn).notNull).toBe(
        false
      )
    })

    it("should have fields with default values", () => {
      const columns = getTableColumns(endpoint)

      expect(getColumnConfig(columns.method as SQLiteColumn).hasDefault).toBe(
        true
      )
      expect(getColumnConfig(columns.authType as SQLiteColumn).hasDefault).toBe(
        true
      )
      expect(getColumnConfig(columns.status as SQLiteColumn).hasDefault).toBe(
        true
      )
    })

    it("should have correct data types", () => {
      const columns = getTableColumns(endpoint)

      expect(getColumnConfig(columns.url as SQLiteColumn).dataType).toBe(
        "string"
      )
      expect(getColumnConfig(columns.method as SQLiteColumn).dataType).toBe(
        "string"
      )
      expect(getColumnConfig(columns.rateLimit as SQLiteColumn).dataType).toBe(
        "number"
      )
    })
  })

  describe("relations", () => {
    it("should define apiKeyRelations", () => {
      expect(apiKeyRelations).toBeDefined()
    })

    it("should define endpointRelations", () => {
      expect(endpointRelations).toBeDefined()
    })
  })

  describe("schema relationships", () => {
    it("apiKey should reference organization", () => {
      const columns = getTableColumns(apiKey)
      expect(columns.organizationId).toBeDefined()
    })

    it("apiKey should reference user for creator", () => {
      const columns = getTableColumns(apiKey)
      expect(columns.createdById).toBeDefined()
    })

    it("apiKey should reference user for revoker", () => {
      const columns = getTableColumns(apiKey)
      expect(columns.revokedById).toBeDefined()
    })

    it("endpoint should reference organization", () => {
      const columns = getTableColumns(endpoint)
      expect(columns.organizationId).toBeDefined()
    })
  })
})
