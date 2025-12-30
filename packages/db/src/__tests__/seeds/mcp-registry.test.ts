/**
 * Tests for MCP Registry seed data
 */
import { describe, it, expect } from "vitest";
import {
  openSourceMcpServers,
  getMcpServerSeedData,
  validateSeedData,
  type McpServerInsert,
} from "../../seeds/mcp-registry";

describe("MCP Registry Seed Data", () => {
  describe("openSourceMcpServers", () => {
    it("should contain 5 MCP servers", () => {
      expect(openSourceMcpServers).toHaveLength(5);
    });

    it("should include filesystem MCP", () => {
      const filesystem = openSourceMcpServers.find((s) => s.name === "filesystem");
      expect(filesystem).toBeDefined();
      expect(filesystem?.transport).toBe("STDIO");
      expect(filesystem?.command).toBe("npx");
      expect(filesystem?.status).toBe("active");
    });

    it("should include all required MCP servers", () => {
      const names = openSourceMcpServers.map((s) => s.name);
      expect(names).toContain("filesystem");
      expect(names).toContain("github");
      expect(names).toContain("puppeteer");
      expect(names).toContain("sqlite");
      expect(names).toContain("fetch");
    });

    it("should have valid JSON args for all servers", () => {
      for (const server of openSourceMcpServers) {
        if (server.args) {
          expect(() => JSON.parse(server.args)).not.toThrow();
        }
      }
    });

    it("should have valid JSON capabilities for all servers", () => {
      for (const server of openSourceMcpServers) {
        if (server.capabilities) {
          expect(() => JSON.parse(server.capabilities)).not.toThrow();
          const caps = JSON.parse(server.capabilities);
          expect(Array.isArray(caps)).toBe(true);
        }
      }
    });
  });

  describe("getMcpServerSeedData", () => {
    it("should generate seed data with IDs and timestamps", () => {
      const organizationId = "test-org-123";
      const seedData = getMcpServerSeedData(organizationId);

      expect(seedData).toHaveLength(5);
      for (const server of seedData) {
        expect(server.id).toBeDefined();
        expect(server.organizationId).toBe(organizationId);
        expect(server.createdAt).toBeInstanceOf(Date);
        expect(server.updatedAt).toBeInstanceOf(Date);
      }
    });

    it("should use custom ID generator when provided", () => {
      let counter = 0;
      const customIdGenerator = () => `custom-id-${++counter}`;
      const seedData = getMcpServerSeedData("test-org", customIdGenerator);
      expect(seedData[0].id).toBe("custom-id-1");
    });
  });

  describe("validateSeedData", () => {
    it("should validate the default seed data successfully", () => {
      const result = validateSeedData(openSourceMcpServers);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid transport type", () => {
      const invalidData: McpServerInsert[] = [
        { name: "test", transport: "INVALID", status: "active" },
      ];
      const result = validateSeedData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("invalid transport"))).toBe(true);
    });

    it("should detect invalid status", () => {
      const invalidData: McpServerInsert[] = [
        { name: "test", transport: "STDIO", status: "unknown" },
      ];
      const result = validateSeedData(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("invalid status"))).toBe(true);
    });

    it("should detect invalid JSON in capabilities", () => {
      const invalidData: McpServerInsert[] = [
        { name: "test", transport: "STDIO", status: "active", capabilities: "{bad" },
      ];
      const result = validateSeedData(invalidData);
      expect(result.valid).toBe(false);
    });
  });
});
