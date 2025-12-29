/**
 * Tests for the auth schema structure
 *
 * These tests verify the schema definitions without requiring a database connection.
 * We use Drizzle's introspection capabilities to verify table structures.
 */
import { describe, it, expect } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import { SQLiteColumn } from "drizzle-orm/sqlite-core";
import {
  user,
  session,
  account,
  verification,
  organization,
  member,
  invitation,
  userRelations,
  sessionRelations,
  accountRelations,
  organizationRelations,
  memberRelations,
  invitationRelations,
} from "../../schema/sqlite/auth";

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

describe("auth schema", () => {
  describe("user table", () => {
    it("should have correct table name", () => {
      expect(getTableName(user)).toBe("user");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(user);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("email");
      expect(columnNames).toContain("emailVerified");
      expect(columnNames).toContain("image");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
    });

    it("should have id as primary key", () => {
      const columns = getTableColumns(user);
      const config = getColumnConfig(columns.id as SQLiteColumn);
      expect(config.primary).toBe(true);
    });

    it("should have email as unique", () => {
      const columns = getTableColumns(user);
      const config = getColumnConfig(columns.email as SQLiteColumn);
      expect(config.isUnique).toBe(true);
    });

    it("should have required fields marked as not null", () => {
      const columns = getTableColumns(user);

      expect(getColumnConfig(columns.id as SQLiteColumn).notNull).toBe(true);
      expect(getColumnConfig(columns.name as SQLiteColumn).notNull).toBe(true);
      expect(getColumnConfig(columns.email as SQLiteColumn).notNull).toBe(true);
      expect(
        getColumnConfig(columns.emailVerified as SQLiteColumn).notNull
      ).toBe(true);
      expect(getColumnConfig(columns.createdAt as SQLiteColumn).notNull).toBe(
        true
      );
      expect(getColumnConfig(columns.updatedAt as SQLiteColumn).notNull).toBe(
        true
      );
    });

    it("should have optional image field", () => {
      const columns = getTableColumns(user);
      expect(getColumnConfig(columns.image as SQLiteColumn).notNull).toBe(
        false
      );
    });

    it("should have emailVerified with default value", () => {
      const columns = getTableColumns(user);
      expect(
        getColumnConfig(columns.emailVerified as SQLiteColumn).hasDefault
      ).toBe(true);
    });
  });

  describe("session table", () => {
    it("should have correct table name", () => {
      expect(getTableName(session)).toBe("session");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(session);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("userId");
      expect(columnNames).toContain("token");
      expect(columnNames).toContain("expiresAt");
      expect(columnNames).toContain("ipAddress");
      expect(columnNames).toContain("userAgent");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
    });

    it("should have id as primary key", () => {
      const columns = getTableColumns(session);
      expect(getColumnConfig(columns.id as SQLiteColumn).primary).toBe(true);
    });

    it("should have token as unique", () => {
      const columns = getTableColumns(session);
      expect(getColumnConfig(columns.token as SQLiteColumn).isUnique).toBe(
        true
      );
    });

    it("should have userId as not null (foreign key)", () => {
      const columns = getTableColumns(session);
      expect(getColumnConfig(columns.userId as SQLiteColumn).notNull).toBe(
        true
      );
    });
  });

  describe("account table", () => {
    it("should have correct table name", () => {
      expect(getTableName(account)).toBe("account");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(account);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("userId");
      expect(columnNames).toContain("accountId");
      expect(columnNames).toContain("providerId");
      expect(columnNames).toContain("accessToken");
      expect(columnNames).toContain("refreshToken");
      expect(columnNames).toContain("accessTokenExpiresAt");
      expect(columnNames).toContain("refreshTokenExpiresAt");
      expect(columnNames).toContain("scope");
      expect(columnNames).toContain("idToken");
      expect(columnNames).toContain("password");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
    });

    it("should have id as primary key", () => {
      const columns = getTableColumns(account);
      expect(getColumnConfig(columns.id as SQLiteColumn).primary).toBe(true);
    });

    it("should have required core fields as not null", () => {
      const columns = getTableColumns(account);
      expect(getColumnConfig(columns.userId as SQLiteColumn).notNull).toBe(
        true
      );
      expect(getColumnConfig(columns.accountId as SQLiteColumn).notNull).toBe(
        true
      );
      expect(getColumnConfig(columns.providerId as SQLiteColumn).notNull).toBe(
        true
      );
    });

    it("should have optional token fields", () => {
      const columns = getTableColumns(account);
      expect(getColumnConfig(columns.accessToken as SQLiteColumn).notNull).toBe(
        false
      );
      expect(
        getColumnConfig(columns.refreshToken as SQLiteColumn).notNull
      ).toBe(false);
      expect(getColumnConfig(columns.password as SQLiteColumn).notNull).toBe(
        false
      );
    });
  });

  describe("verification table", () => {
    it("should have correct table name", () => {
      expect(getTableName(verification)).toBe("verification");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(verification);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("identifier");
      expect(columnNames).toContain("value");
      expect(columnNames).toContain("expiresAt");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
    });

    it("should have id as primary key", () => {
      const columns = getTableColumns(verification);
      expect(getColumnConfig(columns.id as SQLiteColumn).primary).toBe(true);
    });

    it("should have all core fields as not null", () => {
      const columns = getTableColumns(verification);
      expect(getColumnConfig(columns.identifier as SQLiteColumn).notNull).toBe(
        true
      );
      expect(getColumnConfig(columns.value as SQLiteColumn).notNull).toBe(true);
      expect(getColumnConfig(columns.expiresAt as SQLiteColumn).notNull).toBe(
        true
      );
    });
  });

  describe("organization table", () => {
    it("should have correct table name", () => {
      expect(getTableName(organization)).toBe("organization");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(organization);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("slug");
      expect(columnNames).toContain("logo");
      expect(columnNames).toContain("metadata");
      expect(columnNames).toContain("createdAt");
    });

    it("should have id as primary key", () => {
      const columns = getTableColumns(organization);
      expect(getColumnConfig(columns.id as SQLiteColumn).primary).toBe(true);
    });

    it("should have slug as unique", () => {
      const columns = getTableColumns(organization);
      expect(getColumnConfig(columns.slug as SQLiteColumn).isUnique).toBe(true);
    });

    it("should have optional metadata and logo fields", () => {
      const columns = getTableColumns(organization);
      expect(getColumnConfig(columns.logo as SQLiteColumn).notNull).toBe(false);
      expect(getColumnConfig(columns.metadata as SQLiteColumn).notNull).toBe(
        false
      );
    });
  });

  describe("member table", () => {
    it("should have correct table name", () => {
      expect(getTableName(member)).toBe("member");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(member);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("userId");
      expect(columnNames).toContain("organizationId");
      expect(columnNames).toContain("role");
      expect(columnNames).toContain("createdAt");
    });

    it("should have id as primary key", () => {
      const columns = getTableColumns(member);
      expect(getColumnConfig(columns.id as SQLiteColumn).primary).toBe(true);
    });

    it("should have foreign key fields as not null", () => {
      const columns = getTableColumns(member);
      expect(getColumnConfig(columns.userId as SQLiteColumn).notNull).toBe(
        true
      );
      expect(
        getColumnConfig(columns.organizationId as SQLiteColumn).notNull
      ).toBe(true);
    });
  });

  describe("invitation table", () => {
    it("should have correct table name", () => {
      expect(getTableName(invitation)).toBe("invitation");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(invitation);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("email");
      expect(columnNames).toContain("inviterId");
      expect(columnNames).toContain("organizationId");
      expect(columnNames).toContain("role");
      expect(columnNames).toContain("status");
      expect(columnNames).toContain("expiresAt");
      expect(columnNames).toContain("createdAt");
    });

    it("should have id as primary key", () => {
      const columns = getTableColumns(invitation);
      expect(getColumnConfig(columns.id as SQLiteColumn).primary).toBe(true);
    });

    it("should have all core fields as not null", () => {
      const columns = getTableColumns(invitation);
      expect(getColumnConfig(columns.email as SQLiteColumn).notNull).toBe(true);
      expect(getColumnConfig(columns.inviterId as SQLiteColumn).notNull).toBe(
        true
      );
      expect(
        getColumnConfig(columns.organizationId as SQLiteColumn).notNull
      ).toBe(true);
      expect(getColumnConfig(columns.role as SQLiteColumn).notNull).toBe(true);
      expect(getColumnConfig(columns.status as SQLiteColumn).notNull).toBe(
        true
      );
    });
  });

  describe("relations", () => {
    it("should define userRelations", () => {
      expect(userRelations).toBeDefined();
    });

    it("should define sessionRelations", () => {
      expect(sessionRelations).toBeDefined();
    });

    it("should define accountRelations", () => {
      expect(accountRelations).toBeDefined();
    });

    it("should define organizationRelations", () => {
      expect(organizationRelations).toBeDefined();
    });

    it("should define memberRelations", () => {
      expect(memberRelations).toBeDefined();
    });

    it("should define invitationRelations", () => {
      expect(invitationRelations).toBeDefined();
    });
  });
});
