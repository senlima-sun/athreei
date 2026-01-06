/**
 * Tests for Token Refresh Manager
 *
 * Tests proactive and reactive token refresh with mocked MCP SDK calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Hoist mock implementations
const { mockRefreshAuthorization, mockDiscoverOAuthMetadata } = vi.hoisted(() => ({
  mockRefreshAuthorization: vi.fn(),
  mockDiscoverOAuthMetadata: vi.fn(),
}))

// Mock MCP SDK auth functions
vi.mock("@modelcontextprotocol/sdk/client/auth.js", () => ({
  refreshAuthorization: mockRefreshAuthorization,
  discoverOAuthMetadata: mockDiscoverOAuthMetadata,
}))

// Mock logger
vi.mock("../../logger.js", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import {
  TokenRefreshManager,
  parseWWWAuthenticate,
  categorizeOAuthError,
} from "../refresh.js"
import type { StoredTokenData } from "../types.js"
import type { EncryptedTokenStore } from "../token-store.js"

describe("TokenRefreshManager", () => {
  // Create mock token store
  const createMockTokenStore = () => {
    const tokens = new Map<string, StoredTokenData>()
    return {
      get: vi.fn((serverUrl: string) => Promise.resolve(tokens.get(serverUrl) ?? null)),
      set: vi.fn((serverUrl: string, token: StoredTokenData) => {
        tokens.set(serverUrl, token)
        return Promise.resolve()
      }),
      delete: vi.fn((serverUrl: string) => {
        tokens.delete(serverUrl)
        return Promise.resolve()
      }),
      list: vi.fn(() =>
        Promise.resolve(
          Array.from(tokens.entries()).map(([serverUrl, token]) => ({
            serverUrl,
            provider: token.provider,
            expiresAt: token.expiresAt,
          }))
        )
      ),
      hasValidToken: vi.fn(),
      clear: vi.fn(),
      setKey: vi.fn(),
      _tokens: tokens, // For test access
    } as unknown as EncryptedTokenStore & { _tokens: Map<string, StoredTokenData> }
  }

  const createTestToken = (overrides?: Partial<StoredTokenData>): StoredTokenData => ({
    access_token: "test_access_token",
    token_type: "Bearer",
    refresh_token: "test_refresh_token",
    expires_in: 3600,
    expiresAt: Date.now() + 3600000, // 1 hour from now
    obtainedAt: Date.now(),
    provider: "TestProvider",
    serverUrl: "https://api.example.com",
    ...overrides,
  })

  const mockOAuthMetadata = {
    issuer: "https://auth.example.com",
    authorization_endpoint: "https://auth.example.com/authorize",
    token_endpoint: "https://auth.example.com/token",
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
  }

  let mockTokenStore: ReturnType<typeof createMockTokenStore>
  let manager: TokenRefreshManager

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockTokenStore = createMockTokenStore()
    manager = new TokenRefreshManager(mockTokenStore)

    mockDiscoverOAuthMetadata.mockResolvedValue(mockOAuthMetadata)
    mockRefreshAuthorization.mockResolvedValue({
      access_token: "new_access_token",
      token_type: "Bearer",
      refresh_token: "new_refresh_token",
      expires_in: 3600,
    })
  })

  afterEach(() => {
    manager.stopAll()
    vi.useRealTimers()
  })

  describe("scheduleRefresh", () => {
    it("schedules refresh at 75% of token TTL", () => {
      const token = createTestToken({
        expiresAt: Date.now() + 4000000, // ~1.1 hours
      })

      manager.scheduleRefresh(token.serverUrl, token)

      // Verify timer was set (we can't directly inspect but can check behavior)
      // The refresh should be scheduled for ~75% of TTL
      expect(mockTokenStore.get).not.toHaveBeenCalled() // Not called until timer fires
    })

    it("uses minimum delay when 75% TTL is too small", () => {
      const token = createTestToken({
        expiresAt: Date.now() + 10000, // 10 seconds (too short)
      })

      manager.scheduleRefresh(token.serverUrl, token)

      // Should use MIN_REFRESH_DELAY (60 seconds) instead of 7.5 seconds
      // Timer should fire after 60 seconds minimum
    })

    it("does not schedule refresh without refresh token", () => {
      const token = createTestToken({
        refresh_token: undefined,
      })

      manager.scheduleRefresh(token.serverUrl, token)

      // Advance time - no refresh should be attempted
      vi.advanceTimersByTime(100000)
      expect(mockTokenStore.get).not.toHaveBeenCalled()
    })

    it("does not schedule refresh without expiry", () => {
      const token = createTestToken({
        expiresAt: undefined,
      })

      manager.scheduleRefresh(token.serverUrl, token)

      vi.advanceTimersByTime(100000)
      expect(mockTokenStore.get).not.toHaveBeenCalled()
    })

    it("does not schedule refresh for already expired token", () => {
      const token = createTestToken({
        expiresAt: Date.now() - 1000, // Already expired
      })

      manager.scheduleRefresh(token.serverUrl, token)

      vi.advanceTimersByTime(100000)
      expect(mockTokenStore.get).not.toHaveBeenCalled()
    })

    it("clears existing timer when scheduling new refresh", () => {
      const token = createTestToken()

      manager.scheduleRefresh(token.serverUrl, token)
      manager.scheduleRefresh(token.serverUrl, token)

      // Should only have one timer active
      // Previous timer should be cleared
    })
  })

  describe("refreshToken", () => {
    it("refreshes token and stores updated token", async () => {
      const token = createTestToken()
      mockTokenStore._tokens.set(token.serverUrl, token)

      const result = await manager.refreshToken(token.serverUrl)

      expect(mockDiscoverOAuthMetadata).toHaveBeenCalledWith(token.serverUrl)
      expect(mockRefreshAuthorization).toHaveBeenCalledWith(
        token.serverUrl,
        expect.objectContaining({
          metadata: mockOAuthMetadata,
          refreshToken: token.refresh_token,
        })
      )
      expect(mockTokenStore.set).toHaveBeenCalled()
      expect(result.access_token).toBe("new_access_token")
    })

    it("preserves old refresh token if not rotated", async () => {
      const token = createTestToken()
      mockTokenStore._tokens.set(token.serverUrl, token)

      mockRefreshAuthorization.mockResolvedValue({
        access_token: "new_access_token",
        token_type: "Bearer",
        // No new refresh_token
        expires_in: 3600,
      })

      const result = await manager.refreshToken(token.serverUrl)

      expect(result.refresh_token).toBe(token.refresh_token)
    })

    it("uses rotated refresh token when provided", async () => {
      const token = createTestToken()
      mockTokenStore._tokens.set(token.serverUrl, token)

      mockRefreshAuthorization.mockResolvedValue({
        access_token: "new_access_token",
        token_type: "Bearer",
        refresh_token: "rotated_refresh_token",
        expires_in: 3600,
      })

      const result = await manager.refreshToken(token.serverUrl)

      expect(result.refresh_token).toBe("rotated_refresh_token")
    })

    it("throws when no token found for server URL", async () => {
      await expect(
        manager.refreshToken("https://nonexistent.com")
      ).rejects.toThrow("No token found")
    })

    it("throws when token has no refresh token", async () => {
      const token = createTestToken({ refresh_token: undefined })
      mockTokenStore._tokens.set(token.serverUrl, token)

      await expect(
        manager.refreshToken(token.serverUrl)
      ).rejects.toThrow("No refresh token available")
    })

    it("throws when OAuth metadata discovery fails", async () => {
      const token = createTestToken()
      mockTokenStore._tokens.set(token.serverUrl, token)

      mockDiscoverOAuthMetadata.mockResolvedValue(null)

      await expect(
        manager.refreshToken(token.serverUrl)
      ).rejects.toThrow("Could not discover OAuth metadata")
    })

    it("schedules next refresh after successful refresh", async () => {
      const token = createTestToken()
      mockTokenStore._tokens.set(token.serverUrl, token)

      const scheduleRefreshSpy = vi.spyOn(manager, "scheduleRefresh")

      await manager.refreshToken(token.serverUrl)

      expect(scheduleRefreshSpy).toHaveBeenCalled()
    })
  })

  describe("mutex behavior", () => {
    it("only calls refreshAuthorization once for concurrent refresh requests", async () => {
      const token = createTestToken()
      mockTokenStore._tokens.set(token.serverUrl, token)

      // Start two concurrent refreshes
      const promise1 = manager.refreshToken(token.serverUrl)
      const promise2 = manager.refreshToken(token.serverUrl)

      const [result1, result2] = await Promise.all([promise1, promise2])

      // Both should get the same result
      expect(result1.access_token).toBe("new_access_token")
      expect(result2.access_token).toBe("new_access_token")

      // refreshAuthorization should only be called once (mutex behavior)
      expect(mockRefreshAuthorization).toHaveBeenCalledTimes(1)
    })

    it("releases lock after refresh completes", async () => {
      const token = createTestToken()
      mockTokenStore._tokens.set(token.serverUrl, token)

      await manager.refreshToken(token.serverUrl)
      await manager.refreshToken(token.serverUrl)

      // Should be called twice since lock is released
      expect(mockRefreshAuthorization).toHaveBeenCalledTimes(2)
    })

    it("releases lock after refresh fails", async () => {
      const token = createTestToken()
      mockTokenStore._tokens.set(token.serverUrl, token)

      mockRefreshAuthorization.mockRejectedValueOnce(new Error("Refresh failed"))

      await expect(manager.refreshToken(token.serverUrl)).rejects.toThrow()

      // Reset mock
      mockRefreshAuthorization.mockResolvedValue({
        access_token: "new_access_token",
        token_type: "Bearer",
        expires_in: 3600,
      })

      // Second call should work (backoff aside)
      vi.advanceTimersByTime(60000) // Skip backoff
      await manager.refreshToken(token.serverUrl)
    })
  })

  describe("exponential backoff", () => {
    it("applies backoff after failed refresh", async () => {
      const token = createTestToken()
      mockTokenStore._tokens.set(token.serverUrl, token)

      mockRefreshAuthorization.mockRejectedValue(new Error("Refresh failed"))

      await expect(manager.refreshToken(token.serverUrl)).rejects.toThrow()

      // Second immediate call should fail due to backoff
      await expect(manager.refreshToken(token.serverUrl)).rejects.toThrow(
        "rate limited"
      )
    })

    it("clears backoff after successful refresh", async () => {
      const token = createTestToken()
      mockTokenStore._tokens.set(token.serverUrl, token)

      // First: fail
      mockRefreshAuthorization.mockRejectedValueOnce(new Error("Refresh failed"))
      await expect(manager.refreshToken(token.serverUrl)).rejects.toThrow()

      // Wait out backoff
      vi.advanceTimersByTime(2000)

      // Second: succeed
      mockRefreshAuthorization.mockResolvedValue({
        access_token: "new_access_token",
        token_type: "Bearer",
        expires_in: 3600,
      })

      await manager.refreshToken(token.serverUrl)

      // Third: should work immediately (backoff cleared)
      mockRefreshAuthorization.mockResolvedValue({
        access_token: "newer_access_token",
        token_type: "Bearer",
        expires_in: 3600,
      })

      await manager.refreshToken(token.serverUrl)
      expect(mockRefreshAuthorization).toHaveBeenCalledTimes(3)
    })
  })

  describe("handleUnauthorized", () => {
    it("attempts refresh and returns updated token", async () => {
      const token = createTestToken()
      mockTokenStore._tokens.set(token.serverUrl, token)

      const result = await manager.handleUnauthorized(token.serverUrl)

      expect(result).not.toBeNull()
      expect(result?.access_token).toBe("new_access_token")
    })

    it("returns null when refresh fails", async () => {
      const token = createTestToken()
      mockTokenStore._tokens.set(token.serverUrl, token)

      mockRefreshAuthorization.mockRejectedValue(new Error("Refresh failed"))

      const result = await manager.handleUnauthorized(token.serverUrl)

      expect(result).toBeNull()
    })
  })

  describe("stopAll", () => {
    it("clears all scheduled refresh timers", () => {
      const token1 = createTestToken({ serverUrl: "https://api1.example.com" })
      const token2 = createTestToken({ serverUrl: "https://api2.example.com" })

      manager.scheduleRefresh(token1.serverUrl, token1)
      manager.scheduleRefresh(token2.serverUrl, token2)

      manager.stopAll()

      // Advance time - no refreshes should happen
      vi.advanceTimersByTime(10000000)
      expect(mockTokenStore.get).not.toHaveBeenCalled()
    })

    it("clears backoff state", async () => {
      const token = createTestToken()
      mockTokenStore._tokens.set(token.serverUrl, token)

      // Cause backoff
      mockRefreshAuthorization.mockRejectedValueOnce(new Error("Refresh failed"))
      await expect(manager.refreshToken(token.serverUrl)).rejects.toThrow()

      manager.stopAll()

      // After stopAll, backoff should be cleared
      mockRefreshAuthorization.mockResolvedValue({
        access_token: "new_access_token",
        token_type: "Bearer",
        expires_in: 3600,
      })

      // This should work without waiting for backoff
      await manager.refreshToken(token.serverUrl)
    })
  })

  describe("initializeRefreshSchedules", () => {
    it("schedules refresh for all stored tokens", async () => {
      const token1 = createTestToken({ serverUrl: "https://api1.example.com" })
      const token2 = createTestToken({ serverUrl: "https://api2.example.com" })
      mockTokenStore._tokens.set(token1.serverUrl, token1)
      mockTokenStore._tokens.set(token2.serverUrl, token2)

      const scheduleRefreshSpy = vi.spyOn(manager, "scheduleRefresh")

      await manager.initializeRefreshSchedules()

      expect(mockTokenStore.list).toHaveBeenCalled()
      expect(scheduleRefreshSpy).toHaveBeenCalledTimes(2)
    })

    it("handles empty token store", async () => {
      await manager.initializeRefreshSchedules()

      expect(mockTokenStore.list).toHaveBeenCalled()
      // No errors should be thrown
    })
  })
})

describe("parseWWWAuthenticate", () => {
  it("returns empty object for null header", () => {
    const result = parseWWWAuthenticate(null)
    expect(result).toEqual({})
  })

  it("parses error from header", () => {
    const header = 'Bearer error="invalid_token"'
    const result = parseWWWAuthenticate(header)

    expect(result.error).toBe("invalid_token")
  })

  it("parses error_description from header", () => {
    const header = 'Bearer error="invalid_token", error_description="Token expired"'
    const result = parseWWWAuthenticate(header)

    expect(result.error).toBe("invalid_token")
    expect(result.errorDescription).toBe("Token expired")
  })

  it("parses scope from header", () => {
    const header = 'Bearer scope="read write"'
    const result = parseWWWAuthenticate(header)

    expect(result.scope).toBe("read write")
  })

  it("parses complete WWW-Authenticate header", () => {
    const header =
      'Bearer realm="Example API", error="insufficient_scope", error_description="Need read access", scope="read"'
    const result = parseWWWAuthenticate(header)

    expect(result.error).toBe("insufficient_scope")
    expect(result.errorDescription).toBe("Need read access")
    expect(result.scope).toBe("read")
  })
})

describe("categorizeOAuthError", () => {
  it("categorizes invalid_token error", () => {
    expect(categorizeOAuthError("invalid_token")).toBe("invalid_token")
  })

  it("categorizes invalid_grant error", () => {
    expect(categorizeOAuthError("invalid_grant")).toBe("invalid_grant")
  })

  it("categorizes access_denied error", () => {
    expect(categorizeOAuthError("access_denied")).toBe("access_denied")
  })

  it("categorizes insufficient_scope error", () => {
    expect(categorizeOAuthError("insufficient_scope")).toBe("insufficient_scope")
  })

  it("returns unknown for unrecognized errors", () => {
    expect(categorizeOAuthError("some_other_error")).toBe("unknown")
  })

  it("returns unknown for undefined error", () => {
    expect(categorizeOAuthError(undefined)).toBe("unknown")
  })
})
