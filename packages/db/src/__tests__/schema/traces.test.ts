/**
 * Tests for the traces schema structure
 *
 * These tests verify the schema definitions without requiring a database connection.
 */
import { describe, it, expect } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import {
  trace,
  log,
  metric,
  traceRelations,
  logRelations,
  metricRelations,
} from "../../schema/sqlite/traces";

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

describe("traces schema", () => {
  describe("trace table", () => {
    it("should have correct table name", () => {
      expect(getTableName(trace)).toBe("trace");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(trace);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("organizationId");
      expect(columnNames).toContain("userId");
      expect(columnNames).toContain("mcpServerId");
      expect(columnNames).toContain("traceId");
      expect(columnNames).toContain("parentSpanId");
      expect(columnNames).toContain("spanId");
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("kind");
      expect(columnNames).toContain("status");
      expect(columnNames).toContain("statusMessage");
      expect(columnNames).toContain("startTime");
      expect(columnNames).toContain("endTime");
      expect(columnNames).toContain("durationMs");
      expect(columnNames).toContain("attributes");
      expect(columnNames).toContain("events");
      expect(columnNames).toContain("createdAt");
    });

    it("should have id as primary key", () => {
      const columns = getTableColumns(trace);
      expect(getColumnConfig(columns.id as SQLiteColumn).primary).toBe(true);
    });

    it("should have required fields as not null", () => {
      const columns = getTableColumns(trace);

      expect(
        getColumnConfig(columns.organizationId as SQLiteColumn).notNull
      ).toBe(true);
      expect(getColumnConfig(columns.traceId as SQLiteColumn).notNull).toBe(
        true
      );
      expect(getColumnConfig(columns.spanId as SQLiteColumn).notNull).toBe(
        true
      );
      expect(getColumnConfig(columns.name as SQLiteColumn).notNull).toBe(true);
      expect(getColumnConfig(columns.kind as SQLiteColumn).notNull).toBe(true);
      expect(getColumnConfig(columns.status as SQLiteColumn).notNull).toBe(
        true
      );
      expect(getColumnConfig(columns.startTime as SQLiteColumn).notNull).toBe(
        true
      );
      expect(getColumnConfig(columns.createdAt as SQLiteColumn).notNull).toBe(
        true
      );
    });

    it("should have optional fields", () => {
      const columns = getTableColumns(trace);

      expect(getColumnConfig(columns.userId as SQLiteColumn).notNull).toBe(
        false
      );
      expect(getColumnConfig(columns.mcpServerId as SQLiteColumn).notNull).toBe(
        false
      );
      expect(
        getColumnConfig(columns.parentSpanId as SQLiteColumn).notNull
      ).toBe(false);
      expect(
        getColumnConfig(columns.statusMessage as SQLiteColumn).notNull
      ).toBe(false);
      expect(getColumnConfig(columns.endTime as SQLiteColumn).notNull).toBe(
        false
      );
      expect(getColumnConfig(columns.durationMs as SQLiteColumn).notNull).toBe(
        false
      );
      expect(getColumnConfig(columns.attributes as SQLiteColumn).notNull).toBe(
        false
      );
      expect(getColumnConfig(columns.events as SQLiteColumn).notNull).toBe(
        false
      );
    });

    it("should have kind with default value", () => {
      const columns = getTableColumns(trace);
      expect(getColumnConfig(columns.kind as SQLiteColumn).hasDefault).toBe(
        true
      );
    });

    it("should have correct data types", () => {
      const columns = getTableColumns(trace);

      expect(getColumnConfig(columns.traceId as SQLiteColumn).dataType).toBe(
        "string"
      );
      expect(getColumnConfig(columns.spanId as SQLiteColumn).dataType).toBe(
        "string"
      );
      expect(getColumnConfig(columns.durationMs as SQLiteColumn).dataType).toBe(
        "number"
      );
    });
  });

  describe("log table", () => {
    it("should have correct table name", () => {
      expect(getTableName(log)).toBe("log");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(log);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("organizationId");
      expect(columnNames).toContain("traceId");
      expect(columnNames).toContain("userId");
      expect(columnNames).toContain("level");
      expect(columnNames).toContain("message");
      expect(columnNames).toContain("attributes");
      expect(columnNames).toContain("source");
      expect(columnNames).toContain("timestamp");
      expect(columnNames).toContain("createdAt");
    });

    it("should have id as primary key", () => {
      const columns = getTableColumns(log);
      expect(getColumnConfig(columns.id as SQLiteColumn).primary).toBe(true);
    });

    it("should have required fields as not null", () => {
      const columns = getTableColumns(log);

      expect(
        getColumnConfig(columns.organizationId as SQLiteColumn).notNull
      ).toBe(true);
      expect(getColumnConfig(columns.level as SQLiteColumn).notNull).toBe(true);
      expect(getColumnConfig(columns.message as SQLiteColumn).notNull).toBe(
        true
      );
      expect(getColumnConfig(columns.timestamp as SQLiteColumn).notNull).toBe(
        true
      );
      expect(getColumnConfig(columns.createdAt as SQLiteColumn).notNull).toBe(
        true
      );
    });

    it("should have optional fields", () => {
      const columns = getTableColumns(log);

      expect(getColumnConfig(columns.traceId as SQLiteColumn).notNull).toBe(
        false
      );
      expect(getColumnConfig(columns.userId as SQLiteColumn).notNull).toBe(
        false
      );
      expect(getColumnConfig(columns.attributes as SQLiteColumn).notNull).toBe(
        false
      );
      expect(getColumnConfig(columns.source as SQLiteColumn).notNull).toBe(
        false
      );
    });

    it("should have correct data types", () => {
      const columns = getTableColumns(log);

      expect(getColumnConfig(columns.level as SQLiteColumn).dataType).toBe(
        "string"
      );
      expect(getColumnConfig(columns.message as SQLiteColumn).dataType).toBe(
        "string"
      );
    });
  });

  describe("metric table", () => {
    it("should have correct table name", () => {
      expect(getTableName(metric)).toBe("metric");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(metric);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("organizationId");
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("type");
      expect(columnNames).toContain("value");
      expect(columnNames).toContain("dimensions");
      expect(columnNames).toContain("timestamp");
      expect(columnNames).toContain("createdAt");
    });

    it("should have id as primary key", () => {
      const columns = getTableColumns(metric);
      expect(getColumnConfig(columns.id as SQLiteColumn).primary).toBe(true);
    });

    it("should have required fields as not null", () => {
      const columns = getTableColumns(metric);

      expect(
        getColumnConfig(columns.organizationId as SQLiteColumn).notNull
      ).toBe(true);
      expect(getColumnConfig(columns.name as SQLiteColumn).notNull).toBe(true);
      expect(getColumnConfig(columns.type as SQLiteColumn).notNull).toBe(true);
      expect(getColumnConfig(columns.value as SQLiteColumn).notNull).toBe(true);
      expect(getColumnConfig(columns.timestamp as SQLiteColumn).notNull).toBe(
        true
      );
      expect(getColumnConfig(columns.createdAt as SQLiteColumn).notNull).toBe(
        true
      );
    });

    it("should have optional dimensions field", () => {
      const columns = getTableColumns(metric);
      expect(getColumnConfig(columns.dimensions as SQLiteColumn).notNull).toBe(
        false
      );
    });

    it("should have correct data types", () => {
      const columns = getTableColumns(metric);

      expect(getColumnConfig(columns.name as SQLiteColumn).dataType).toBe(
        "string"
      );
      expect(getColumnConfig(columns.type as SQLiteColumn).dataType).toBe(
        "string"
      );
      expect(getColumnConfig(columns.value as SQLiteColumn).dataType).toBe(
        "number"
      );
    });
  });

  describe("relations", () => {
    it("should define traceRelations", () => {
      expect(traceRelations).toBeDefined();
    });

    it("should define logRelations", () => {
      expect(logRelations).toBeDefined();
    });

    it("should define metricRelations", () => {
      expect(metricRelations).toBeDefined();
    });
  });

  describe("schema relationships", () => {
    it("trace should reference organization", () => {
      const columns = getTableColumns(trace);
      expect(columns.organizationId).toBeDefined();
    });

    it("trace should reference user (optional)", () => {
      const columns = getTableColumns(trace);
      expect(columns.userId).toBeDefined();
    });

    it("trace should reference mcpServer (optional)", () => {
      const columns = getTableColumns(trace);
      expect(columns.mcpServerId).toBeDefined();
    });

    it("log should reference organization", () => {
      const columns = getTableColumns(log);
      expect(columns.organizationId).toBeDefined();
    });

    it("log should reference user (optional)", () => {
      const columns = getTableColumns(log);
      expect(columns.userId).toBeDefined();
    });

    it("metric should reference organization", () => {
      const columns = getTableColumns(metric);
      expect(columns.organizationId).toBeDefined();
    });
  });
});
