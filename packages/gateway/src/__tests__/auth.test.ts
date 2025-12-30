/**
 * Tests for API Key Authentication
 */

import { describe, it, expect } from "vitest";
import {
  validateApiKeyFormat,
  getKeyPrefix,
  createAuthHeader,
  parseAuthHeader,
} from "../auth";

describe("validateApiKeyFormat", () => {
  it("validates correct API key format", () => {
    // API key: ak_ prefix + 43 characters of base64url
    const validKey = "ak_" + "a".repeat(43);
    const result = validateApiKeyFormat(validKey);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects empty API key", () => {
    const result = validateApiKeyFormat("");

    expect(result.valid).toBe(false);
    expect(result.error).toBe("API key is required");
  });

  it("rejects API key without prefix", () => {
    const result = validateApiKeyFormat("a".repeat(43));

    expect(result.valid).toBe(false);
    expect(result.error).toContain('start with "ak_"');
  });

  it("rejects API key that is too short", () => {
    const result = validateApiKeyFormat("ak_short");

    expect(result.valid).toBe(false);
    expect(result.error).toBe("API key is too short");
  });

  it("rejects API key with invalid characters", () => {
    const result = validateApiKeyFormat("ak_" + "a".repeat(30) + "!!!!");

    expect(result.valid).toBe(false);
    expect(result.error).toBe("API key contains invalid characters");
  });

  it("accepts API key with valid base64url characters", () => {
    // Base64url uses: A-Z, a-z, 0-9, -, _
    const validKey = "ak_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijkl_-0123456789";
    const result = validateApiKeyFormat(validKey);

    expect(result.valid).toBe(true);
  });
});

describe("getKeyPrefix", () => {
  it("returns first 12 characters with ellipsis", () => {
    const key = "ak_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef";
    const result = getKeyPrefix(key);

    // getKeyPrefix returns first 12 chars + "..."
    expect(result).toBe("ak_ABCDEFGHI...");
    expect(result.length).toBe(15); // 12 chars + "..."
  });

  it("masks long keys appropriately", () => {
    const key = "ak_" + "x".repeat(100);
    const result = getKeyPrefix(key);

    expect(result).toBe("ak_xxxxxxxxx...");
    expect(result).not.toContain("x".repeat(20));
  });
});

describe("createAuthHeader", () => {
  it("creates Bearer token header", () => {
    const key = "ak_testkey123";
    const result = createAuthHeader(key);

    expect(result).toBe("Bearer ak_testkey123");
  });
});

describe("parseAuthHeader", () => {
  it("extracts API key from valid Bearer header", () => {
    const header = "Bearer ak_testkey123";
    const result = parseAuthHeader(header);

    expect(result).toBe("ak_testkey123");
  });

  it("returns null for empty header", () => {
    const result = parseAuthHeader("");

    expect(result).toBeNull();
  });

  it("returns null for non-Bearer scheme", () => {
    const result = parseAuthHeader("Basic dXNlcjpwYXNz");

    expect(result).toBeNull();
  });

  it("returns null for malformed header", () => {
    const result = parseAuthHeader("Bearer");

    expect(result).toBeNull();
  });

  it("handles case-insensitive Bearer scheme", () => {
    const result = parseAuthHeader("bearer ak_testkey123");

    expect(result).toBe("ak_testkey123");
  });

  it("returns null for header with extra parts", () => {
    const result = parseAuthHeader("Bearer ak_test extra");

    expect(result).toBeNull();
  });
});
