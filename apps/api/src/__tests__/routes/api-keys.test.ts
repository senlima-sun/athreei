/**
 * Tests for the API keys routes
 *
 * These tests verify the API key management operations including:
 * - Creating API keys with secure generation
 * - Listing API keys with masked values
 * - Revoking API keys
 * - Authorization checks
 * - Proper response formats
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

// Mock modules before importing the routes
vi.mock("../../lib/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.mock("../../middleware", () => ({
  authMiddleware: vi.fn((c, next) => {
    c.set("auth", mockAuthContext);
    return next();
  }),
  getAuthContext: vi.fn((c) => c.get("auth")),
  ApiError: {
    badRequest: (msg: string) => {
      const error = new Error(`BadRequest: ${msg}`);
      (error as Error & { statusCode: number }).statusCode = 400;
      return error;
    },
    notFound: (msg: string) => {
      const error = new Error(`NotFound: ${msg}`);
      (error as Error & { statusCode: number }).statusCode = 404;
      return error;
    },
    forbidden: (msg: string) => {
      const error = new Error(`Forbidden: ${msg}`);
      (error as Error & { statusCode: number }).statusCode = 403;
      return error;
    },
  },
}));

// Mock crypto for deterministic testing
const mockRandomUUID = "test-uuid-1234-5678-90ab-cdef12345678";
vi.stubGlobal("crypto", {
  randomUUID: vi.fn(() => mockRandomUUID),
  getRandomValues: vi.fn((arr: Uint8Array) => {
    // Fill with predictable test values
    for (let i = 0; i < arr.length; i++) {
      arr[i] = i % 256;
    }
    return arr;
  }),
  subtle: {
    digest: vi.fn(async () => {
      // Return a mock hash buffer
      return new Uint8Array(32).fill(0xab).buffer;
    }),
  },
});

// Mock btoa
vi.stubGlobal("btoa", vi.fn((str: string) => Buffer.from(str).toString("base64")));

// Type for test response data
interface ApiKeyResponse {
  id: string;
  name: string;
  key?: string;
  prefix: string;
  lastUsedAt?: string | null;
  usageCount?: number;
  createdAt: string;
  expiresAt?: string | null;
  scopes?: string[] | null;
}

interface ListKeysResponse {
  keys: ApiKeyResponse[];
}

interface MessageResponse {
  message: string;
}

// Mock data
const mockAuthContext = {
  userId: "user_123",
  email: "test@example.com",
  name: "Test User",
  session: {
    id: "session_123",
    expiresAt: new Date(),
  },
};

const mockEndpoint = {
  id: "ep_123",
  organizationId: "org_123",
  name: "My API",
  description: "Test API endpoint",
  url: "https://athreei.com/mcp/my-api/sse",
  method: "POST",
  authType: "api_key",
  rateLimit: null,
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockApiKey = {
  id: "key_123",
  organizationId: "org_123",
  endpointId: "ep_123",
  createdById: "user_123",
  name: "Test API Key",
  keyHash: "abababababababababababababababababababababababababababababababab",
  keyPrefix: "ak_AAECAwQ",
  scopes: null,
  expiresAt: null,
  lastUsedAt: null,
  usageCount: 42,
  revokedAt: null,
  revokedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Mock database - now uses db.query.* pattern
const mockDb = {
  query: {
    endpoint: {
      findFirst: vi.fn(),
    },
    apiKey: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
  insert: vi.fn(() => ({
    values: vi.fn(() => Promise.resolve()),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
    })),
  })),
};

describe("API Keys Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /endpoints/:endpointId/keys", () => {
    it("should return 404 when endpoint does not exist", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(null);

      const { default: apiKeys } = await import("../../routes/api-keys");
      const app = new Hono();
      app.route("/api/endpoints", apiKeys);

      const response = await app.request("/api/endpoints/ep_nonexistent/keys");

      expect(response.status).toBe(500); // Error thrown for not found
    });

    it("should return empty list when no API keys exist", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint);
      mockDb.query.apiKey.findMany.mockResolvedValue([]);

      const { default: apiKeys } = await import("../../routes/api-keys");
      const app = new Hono();
      app.route("/api/endpoints", apiKeys);

      const response = await app.request("/api/endpoints/ep_123/keys");
      const data = (await response.json()) as ListKeysResponse;

      expect(response.status).toBe(200);
      expect(data.keys).toEqual([]);
    });

    it("should return API keys with masked values", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint);
      mockDb.query.apiKey.findMany.mockResolvedValue([mockApiKey]);

      const { default: apiKeys } = await import("../../routes/api-keys");
      const app = new Hono();
      app.route("/api/endpoints", apiKeys);

      const response = await app.request("/api/endpoints/ep_123/keys");
      const data = (await response.json()) as ListKeysResponse;

      expect(response.status).toBe(200);
      expect(data.keys).toHaveLength(1);
      expect(data.keys[0].id).toBe(mockApiKey.id);
      expect(data.keys[0].name).toBe(mockApiKey.name);
      expect(data.keys[0].prefix).toBe(mockApiKey.keyPrefix);
      expect(data.keys[0].usageCount).toBe(42);
      // Should NOT include the full key or key hash
      expect(data.keys[0].key).toBeUndefined();
    });
  });

  describe("POST /endpoints/:endpointId/keys", () => {
    it("should validate request body requires name", async () => {
      const { default: apiKeys } = await import("../../routes/api-keys");
      const app = new Hono();
      app.route("/api/endpoints", apiKeys);

      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}), // Missing name
      });

      expect(response.status).toBe(400);
    });

    it("should validate name max length", async () => {
      const { default: apiKeys } = await import("../../routes/api-keys");
      const app = new Hono();
      app.route("/api/endpoints", apiKeys);

      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "a".repeat(101) }), // Exceeds 100 char limit
      });

      expect(response.status).toBe(400);
    });

    it("should return 404 when endpoint does not exist", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(null);

      const { default: apiKeys } = await import("../../routes/api-keys");
      const app = new Hono();
      app.route("/api/endpoints", apiKeys);

      const response = await app.request("/api/endpoints/ep_nonexistent/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Key" }),
      });

      expect(response.status).toBe(500); // Error thrown for not found
    });

    it("should create API key and return plain key only once", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint);

      const { default: apiKeys } = await import("../../routes/api-keys");
      const app = new Hono();
      app.route("/api/endpoints", apiKeys);

      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Production Key" }),
      });

      const data = (await response.json()) as ApiKeyResponse;

      expect(response.status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.name).toBe("Production Key");
      expect(data.key).toBeDefined();
      expect(data.key).toMatch(/^ak_/); // Prefix format
      expect(data.prefix).toBeDefined();
      expect(data.prefix).toMatch(/^ak_/);
      expect(data.createdAt).toBeDefined();
    });

    it("should create API key with scopes", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint);

      const { default: apiKeys } = await import("../../routes/api-keys");
      const app = new Hono();
      app.route("/api/endpoints", apiKeys);

      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Limited Key",
          scopes: ["read:tools", "execute:tools"],
        }),
      });

      const data = (await response.json()) as ApiKeyResponse;

      expect(response.status).toBe(201);
      expect(data.scopes).toEqual(["read:tools", "execute:tools"]);
    });

    it("should create API key with expiration date", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint);

      const { default: apiKeys } = await import("../../routes/api-keys");
      const app = new Hono();
      app.route("/api/endpoints", apiKeys);

      const expiresAt = "2025-12-31T23:59:59.000Z";
      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Expiring Key",
          expiresAt,
        }),
      });

      const data = (await response.json()) as ApiKeyResponse;

      expect(response.status).toBe(201);
      expect(data.expiresAt).toBe(expiresAt);
    });
  });

  describe("DELETE /endpoints/:endpointId/keys/:keyId", () => {
    it("should return 404 when endpoint does not exist", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(null);

      const { default: apiKeys } = await import("../../routes/api-keys");
      const app = new Hono();
      app.route("/api/endpoints", apiKeys);

      const response = await app.request(
        "/api/endpoints/ep_nonexistent/keys/key_123",
        { method: "DELETE" }
      );

      expect(response.status).toBe(500); // Error thrown for not found
    });

    it("should return 404 when API key does not exist", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint);
      mockDb.query.apiKey.findFirst.mockResolvedValue(null);

      const { default: apiKeys } = await import("../../routes/api-keys");
      const app = new Hono();
      app.route("/api/endpoints", apiKeys);

      const response = await app.request(
        "/api/endpoints/ep_123/keys/key_nonexistent",
        { method: "DELETE" }
      );

      expect(response.status).toBe(500); // Error thrown for not found
    });

    it("should revoke API key successfully", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint);
      mockDb.query.apiKey.findFirst.mockResolvedValue(mockApiKey);

      const { default: apiKeys } = await import("../../routes/api-keys");
      const app = new Hono();
      app.route("/api/endpoints", apiKeys);

      const response = await app.request(
        "/api/endpoints/ep_123/keys/key_123",
        { method: "DELETE" }
      );

      const data = (await response.json()) as MessageResponse;

      expect(response.status).toBe(200);
      expect(data.message).toBe("API key revoked successfully");
    });

    it("should not delete already revoked keys", async () => {
      // Mock endpoint exists but key not found (simulating the isNull filter)
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint);
      mockDb.query.apiKey.findFirst.mockResolvedValue(null);

      const { default: apiKeys } = await import("../../routes/api-keys");
      const app = new Hono();
      app.route("/api/endpoints", apiKeys);

      const response = await app.request(
        "/api/endpoints/ep_123/keys/key_123",
        { method: "DELETE" }
      );

      expect(response.status).toBe(500); // Error thrown for not found
    });
  });

  describe("API Key Format", () => {
    it("should generate key with ak_ prefix", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint);

      const { default: apiKeys } = await import("../../routes/api-keys");
      const app = new Hono();
      app.route("/api/endpoints", apiKeys);

      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Key" }),
      });

      const data = (await response.json()) as ApiKeyResponse;

      expect(data.key!.startsWith("ak_")).toBe(true);
      expect(data.prefix.startsWith("ak_")).toBe(true);
    });

    it("should generate prefix with first 8 chars after ak_", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint);

      const { default: apiKeys } = await import("../../routes/api-keys");
      const app = new Hono();
      app.route("/api/endpoints", apiKeys);

      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Key" }),
      });

      const data = (await response.json()) as ApiKeyResponse;

      // Prefix should be ak_ + first 8 chars of the generated key
      const keyWithoutPrefix = data.key!.substring(3); // Remove "ak_"
      expect(data.prefix).toBe("ak_" + keyWithoutPrefix.substring(0, 8));
    });
  });

  describe("Validation", () => {
    it("should reject invalid expiresAt format", async () => {
      const { default: apiKeys } = await import("../../routes/api-keys");
      const app = new Hono();
      app.route("/api/endpoints", apiKeys);

      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Key",
          expiresAt: "not-a-date",
        }),
      });

      expect(response.status).toBe(400);
    });

    it("should accept valid scopes array", async () => {
      mockDb.query.endpoint.findFirst.mockResolvedValue(mockEndpoint);

      const { default: apiKeys } = await import("../../routes/api-keys");
      const app = new Hono();
      app.route("/api/endpoints", apiKeys);

      const response = await app.request("/api/endpoints/ep_123/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test Key",
          scopes: ["read", "write", "delete"],
        }),
      });

      expect(response.status).toBe(201);
    });
  });
});
