/**
 * Tests for the MCP servers schema structure
 *
 * These tests verify the schema definitions without requiring a database connection.
 */
import { describe, it, expect } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import {
  mcpServer,
  mcpTool,
  mcpServerRelations,
  mcpToolRelations,
} from "../../schema/sqlite/mcp-servers";

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
  };
}

describe("mcp-servers schema", () => {
  describe("mcpServer table", () => {
    it("should have correct table name", () => {
      expect(getTableName(mcpServer)).toBe("mcp_server");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(mcpServer);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("organizationId");
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("description");
      expect(columnNames).toContain("transport");
      expect(columnNames).toContain("command");
      expect(columnNames).toContain("args");
      expect(columnNames).toContain("url");
      expect(columnNames).toContain("status");
      expect(columnNames).toContain("lastSeenAt");
      expect(columnNames).toContain("version");
      expect(columnNames).toContain("capabilities");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
    });

    it("should have id as primary key", () => {
      const columns = getTableColumns(mcpServer);
      expect(getColumnConfig(columns.id as SQLiteColumn).primary).toBe(true);
    });

    it("should have required fields as not null", () => {
      const columns = getTableColumns(mcpServer);

      expect(
        getColumnConfig(columns.organizationId as SQLiteColumn).notNull
      ).toBe(true);
      expect(getColumnConfig(columns.name as SQLiteColumn).notNull).toBe(true);
      expect(getColumnConfig(columns.transport as SQLiteColumn).notNull).toBe(
        true
      );
      expect(getColumnConfig(columns.status as SQLiteColumn).notNull).toBe(
        true
      );
      expect(getColumnConfig(columns.createdAt as SQLiteColumn).notNull).toBe(
        true
      );
      expect(getColumnConfig(columns.updatedAt as SQLiteColumn).notNull).toBe(
        true
      );
    });

    it("should have optional configuration fields", () => {
      const columns = getTableColumns(mcpServer);

      expect(getColumnConfig(columns.description as SQLiteColumn).notNull).toBe(
        false
      );
      expect(getColumnConfig(columns.command as SQLiteColumn).notNull).toBe(
        false
      );
      expect(getColumnConfig(columns.args as SQLiteColumn).notNull).toBe(false);
      expect(getColumnConfig(columns.url as SQLiteColumn).notNull).toBe(false);
      expect(getColumnConfig(columns.version as SQLiteColumn).notNull).toBe(
        false
      );
      expect(
        getColumnConfig(columns.capabilities as SQLiteColumn).notNull
      ).toBe(false);
    });

    it("should have status with default value", () => {
      const columns = getTableColumns(mcpServer);
      expect(getColumnConfig(columns.status as SQLiteColumn).hasDefault).toBe(
        true
      );
    });

    it("should have correct data types for columns", () => {
      const columns = getTableColumns(mcpServer);

      expect(getColumnConfig(columns.id as SQLiteColumn).dataType).toBe(
        "string"
      );
      expect(
        getColumnConfig(columns.organizationId as SQLiteColumn).dataType
      ).toBe("string");
      expect(getColumnConfig(columns.name as SQLiteColumn).dataType).toBe(
        "string"
      );
      expect(getColumnConfig(columns.transport as SQLiteColumn).dataType).toBe(
        "string"
      );
    });
  });

  describe("mcpTool table", () => {
    it("should have correct table name", () => {
      expect(getTableName(mcpTool)).toBe("mcp_tool");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(mcpTool);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("serverId");
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("description");
      expect(columnNames).toContain("inputSchema");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
    });

    it("should have id as primary key", () => {
      const columns = getTableColumns(mcpTool);
      expect(getColumnConfig(columns.id as SQLiteColumn).primary).toBe(true);
    });

    it("should have required fields as not null", () => {
      const columns = getTableColumns(mcpTool);

      expect(getColumnConfig(columns.serverId as SQLiteColumn).notNull).toBe(
        true
      );
      expect(getColumnConfig(columns.name as SQLiteColumn).notNull).toBe(true);
      expect(getColumnConfig(columns.createdAt as SQLiteColumn).notNull).toBe(
        true
      );
      expect(getColumnConfig(columns.updatedAt as SQLiteColumn).notNull).toBe(
        true
      );
    });

    it("should have optional fields", () => {
      const columns = getTableColumns(mcpTool);

      expect(getColumnConfig(columns.description as SQLiteColumn).notNull).toBe(
        false
      );
      expect(getColumnConfig(columns.inputSchema as SQLiteColumn).notNull).toBe(
        false
      );
    });

    it("should have serverId for foreign key relationship", () => {
      const columns = getTableColumns(mcpTool);
      expect(columns.serverId).toBeDefined();
      expect(getColumnConfig(columns.serverId as SQLiteColumn).dataType).toBe(
        "string"
      );
    });
  });

  describe("relations", () => {
    it("should define mcpServerRelations", () => {
      expect(mcpServerRelations).toBeDefined();
    });

    it("should define mcpToolRelations", () => {
      expect(mcpToolRelations).toBeDefined();
    });
  });

  describe("schema relationships", () => {
    it("mcpServer should reference organization", () => {
      const columns = getTableColumns(mcpServer);
      expect(columns.organizationId).toBeDefined();
    });

    it("mcpTool should reference mcpServer", () => {
      const columns = getTableColumns(mcpTool);
      expect(columns.serverId).toBeDefined();
    });
  });
});
