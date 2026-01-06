/**
 * Tests for OAuth Client Provider Implementation
 *
 * Tests the AthreeiOAuthProvider that implements MCP SDK's OAuthClientProvider interface.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Hoist mock implementations
const { mockCallbackServer, mockStartCallbackServer, mockOpen } = vi.hoisted(() => {
  const server = {
    port: 12345,
    host: "localhost",
    redirectUri: "http://localhost:12345/callback/test-uuid",
    waitForCallback: vi.fn(),
    close: vi.fn(),
  }
  return {
    mockCallbackServer: server,
    mockStartCallbackServer: vi.fn().mockResolvedValue(server),
    mockOpen: vi.fn().mockResolvedValue(undefined),
  }
})

// Mock the callback server
vi.mock("../callback-server.js", () => ({
  startCallbackServer: mockStartCallbackServer,
}))

// Mock open for browser launching
vi.mock("open", () => ({
  default: mockOpen,
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

import { AthreeiOAuthProvider, detectProvider } from "../provider.js"
import type { OAuthClientInformation } from "@modelcontextprotocol/sdk/shared/auth.js"
import type { StoredTokenData } from "../types.js"
import type { EncryptedTokenStore } from "../token-store.js"

describe("AthreeiOAuthProvider", () => {
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
      list: vi.fn(),
      hasValidToken: vi.fn(),
      clear: vi.fn(),
      setKey: vi.fn(),
      _tokens: tokens,
    } as unknown as EncryptedTokenStore & { _tokens: Map<string, StoredTokenData> }
  }

  let mockTokenStore: ReturnType<typeof createMockTokenStore>
  let provider: AthreeiOAuthProvider

  beforeEach(() => {
    vi.clearAllMocks()
    mockTokenStore = createMockTokenStore()
    provider = new AthreeiOAuthProvider(
      "https://api.example.com",
      mockTokenStore,
      "TestProvider"
    )
    mockCallbackServer.waitForCallback.mockReset()
    mockCallbackServer.close.mockReset()
  })

  afterEach(() => {
    provider.cleanup()
  })

  describe("constructor", () => {
    it("creates provider with server URL and token store", () => {
      const p = new AthreeiOAuthProvider(
        "https://api.example.com",
        mockTokenStore,
        "TestProvider"
      )

      expect(p.getServerUrl()).toBe("https://api.example.com")
      expect(p.getProviderName()).toBe("TestProvider")
    })

    it("uses default provider name when not specified", () => {
      const p = new AthreeiOAuthProvider("https://api.example.com", mockTokenStore)

      expect(p.getProviderName()).toBe("MCP Server")
    })
  })

  describe("redirectUrl", () => {
    it("returns placeholder URL before callback server is started", () => {
      expect(provider.redirectUrl).toBe("http://localhost:0/callback")
    })

    it("returns actual callback URL after server is started", async () => {
      await provider.startCallbackServer()

      expect(provider.redirectUrl).toBe(mockCallbackServer.redirectUri)
    })
  })

  describe("clientMetadata", () => {
    it("returns OAuth client metadata", () => {
      const metadata = provider.clientMetadata

      expect(metadata.client_name).toBe("athreei-gateway")
      expect(metadata.grant_types).toContain("authorization_code")
      expect(metadata.grant_types).toContain("refresh_token")
      expect(metadata.response_types).toContain("code")
      expect(metadata.token_endpoint_auth_method).toBe("none")
    })

    it("includes redirect URI in metadata", async () => {
      await provider.startCallbackServer()
      const metadata = provider.clientMetadata

      expect(metadata.redirect_uris).toContain(mockCallbackServer.redirectUri)
    })
  })

  describe("state", () => {
    it("generates cryptographically random state parameter", async () => {
      const state = await provider.state()

      expect(state).toBeDefined()
      expect(state.length).toBeGreaterThan(20)
    })

    it("generates unique state for each call", async () => {
      const state1 = await provider.state()
      const state2 = await provider.state()

      expect(state1).not.toBe(state2)
    })

    it("generates URL-safe base64 state", async () => {
      const state = await provider.state()

      // Should not contain +, /, or =
      expect(state).not.toMatch(/[+/=]/)
      // Should only contain base64url characters
      expect(state).toMatch(/^[A-Za-z0-9_-]+$/)
    })
  })

  describe("clientInformation", () => {
    it("returns undefined when no client info saved", () => {
      expect(provider.clientInformation()).toBeUndefined()
    })

    it("returns saved client information", () => {
      const clientInfo: OAuthClientInformation = {
        client_id: "test-client-id",
        client_secret: "test-secret",
      }

      provider.saveClientInformation(clientInfo)

      expect(provider.clientInformation()).toEqual(clientInfo)
    })
  })

  describe("saveClientInformation", () => {
    it("stores client information", () => {
      const clientInfo: OAuthClientInformation = {
        client_id: "dynamic-client-id",
      }

      provider.saveClientInformation(clientInfo)

      expect(provider.clientInformation()).toEqual(clientInfo)
    })

    it("overwrites previous client information", () => {
      provider.saveClientInformation({ client_id: "old-id" })
      provider.saveClientInformation({ client_id: "new-id" })

      expect(provider.clientInformation()?.client_id).toBe("new-id")
    })
  })

  describe("tokens", () => {
    it("returns undefined when no tokens stored", async () => {
      const tokens = await provider.tokens()

      expect(tokens).toBeUndefined()
    })

    it("returns stored tokens converted to OAuthTokens format", async () => {
      const storedToken: StoredTokenData = {
        access_token: "test_access_token",
        token_type: "Bearer",
        refresh_token: "test_refresh_token",
        expires_in: 3600,
        expiresAt: Date.now() + 3600000,
        obtainedAt: Date.now(),
        provider: "TestProvider",
        serverUrl: "https://api.example.com",
      }
      mockTokenStore._tokens.set("https://api.example.com", storedToken)

      const tokens = await provider.tokens()

      expect(tokens).toBeDefined()
      expect(tokens?.access_token).toBe("test_access_token")
      expect(tokens?.refresh_token).toBe("test_refresh_token")
      expect(tokens?.token_type).toBe("Bearer")
    })

    it("computes remaining expires_in from expiresAt", async () => {
      const storedToken: StoredTokenData = {
        access_token: "test_access_token",
        token_type: "Bearer",
        expiresAt: Date.now() + 1800000, // 30 minutes from now
        obtainedAt: Date.now(),
        provider: "TestProvider",
        serverUrl: "https://api.example.com",
      }
      mockTokenStore._tokens.set("https://api.example.com", storedToken)

      const tokens = await provider.tokens()

      // Should be approximately 1800 seconds (30 minutes)
      expect(tokens?.expires_in).toBeGreaterThan(1790)
      expect(tokens?.expires_in).toBeLessThanOrEqual(1800)
    })
  })

  describe("saveTokens", () => {
    it("stores tokens with metadata", async () => {
      const tokens = {
        access_token: "new_access_token",
        token_type: "Bearer",
        refresh_token: "new_refresh_token",
        expires_in: 3600,
      }

      await provider.saveTokens(tokens)

      expect(mockTokenStore.set).toHaveBeenCalled()
      const savedToken = mockTokenStore.set.mock.calls[0][1] as StoredTokenData
      expect(savedToken.access_token).toBe("new_access_token")
      expect(savedToken.provider).toBe("TestProvider")
      expect(savedToken.serverUrl).toBe("https://api.example.com")
      expect(savedToken.obtainedAt).toBeDefined()
    })

    it("computes expiresAt from expires_in", async () => {
      const now = Date.now()
      const tokens = {
        access_token: "token",
        token_type: "Bearer",
        expires_in: 3600, // 1 hour
      }

      await provider.saveTokens(tokens)

      const savedToken = mockTokenStore.set.mock.calls[0][1] as StoredTokenData
      // expiresAt should be approximately now + 3600000ms
      expect(savedToken.expiresAt).toBeGreaterThanOrEqual(now + 3600000 - 100)
      expect(savedToken.expiresAt).toBeLessThanOrEqual(now + 3600000 + 100)
    })

    it("handles tokens without expires_in", async () => {
      const tokens = {
        access_token: "token",
        token_type: "Bearer",
        // No expires_in
      }

      await provider.saveTokens(tokens)

      const savedToken = mockTokenStore.set.mock.calls[0][1] as StoredTokenData
      expect(savedToken.expiresAt).toBeUndefined()
    })
  })

  describe("redirectToAuthorization", () => {
    it("opens authorization URL in browser", async () => {
      const authUrl = new URL("https://auth.example.com/authorize?client_id=test")

      await provider.redirectToAuthorization(authUrl)

      expect(mockOpen).toHaveBeenCalledWith(authUrl.toString())
    })
  })

  describe("codeVerifier", () => {
    it("throws when code verifier not set", () => {
      expect(() => provider.codeVerifier()).toThrow("Code verifier not set")
    })

    it("returns saved code verifier", () => {
      provider.saveCodeVerifier("test-verifier-123")

      expect(provider.codeVerifier()).toBe("test-verifier-123")
    })
  })

  describe("saveCodeVerifier", () => {
    it("stores PKCE code verifier", () => {
      provider.saveCodeVerifier("pkce-verifier-abc123")

      expect(provider.codeVerifier()).toBe("pkce-verifier-abc123")
    })
  })

  describe("invalidateCredentials", () => {
    beforeEach(async () => {
      // Set up some credentials
      provider.saveClientInformation({ client_id: "test-id" })
      provider.saveCodeVerifier("test-verifier")
      await provider.state()
    })

    it("invalidates all credentials with scope 'all'", async () => {
      await provider.invalidateCredentials("all")

      expect(mockTokenStore.delete).toHaveBeenCalledWith("https://api.example.com")
      expect(provider.clientInformation()).toBeUndefined()
      expect(() => provider.codeVerifier()).toThrow()
    })

    it("invalidates only tokens with scope 'tokens'", async () => {
      await provider.invalidateCredentials("tokens")

      expect(mockTokenStore.delete).toHaveBeenCalled()
      expect(provider.clientInformation()).toBeDefined()
    })

    it("invalidates only client info with scope 'client'", async () => {
      await provider.invalidateCredentials("client")

      expect(mockTokenStore.delete).not.toHaveBeenCalled()
      expect(provider.clientInformation()).toBeUndefined()
    })

    it("invalidates only verifier with scope 'verifier'", async () => {
      await provider.invalidateCredentials("verifier")

      expect(mockTokenStore.delete).not.toHaveBeenCalled()
      expect(provider.clientInformation()).toBeDefined()
      expect(() => provider.codeVerifier()).toThrow()
    })
  })

  describe("startCallbackServer", () => {
    it("starts and returns callback server", async () => {
      const server = await provider.startCallbackServer()

      expect(mockStartCallbackServer).toHaveBeenCalledWith("TestProvider")
      expect(server).toBe(mockCallbackServer)
    })

    it("reuses existing callback server", async () => {
      await provider.startCallbackServer()
      await provider.startCallbackServer()

      expect(mockStartCallbackServer).toHaveBeenCalledTimes(1)
    })
  })

  describe("waitForCallback", () => {
    it("throws when callback server not started", async () => {
      await expect(provider.waitForCallback()).rejects.toThrow(
        "Callback server not started"
      )
    })

    it("waits for callback and validates state", async () => {
      await provider.startCallbackServer()
      const expectedState = await provider.state()

      mockCallbackServer.waitForCallback.mockResolvedValue({
        code: "auth_code",
        state: expectedState,
      })

      const result = await provider.waitForCallback()

      expect(result.code).toBe("auth_code")
      expect(result.state).toBe(expectedState)
    })

    it("throws on state mismatch (CSRF protection)", async () => {
      await provider.startCallbackServer()
      await provider.state() // Set expected state

      mockCallbackServer.waitForCallback.mockResolvedValue({
        code: "auth_code",
        state: "wrong_state",
      })

      await expect(provider.waitForCallback()).rejects.toThrow(
        "State mismatch - possible CSRF attack"
      )
    })

    it("cleans up callback server after callback", async () => {
      await provider.startCallbackServer()
      const expectedState = await provider.state()

      mockCallbackServer.waitForCallback.mockResolvedValue({
        code: "auth_code",
        state: expectedState,
      })

      await provider.waitForCallback()

      expect(mockCallbackServer.close).toHaveBeenCalled()
    })

    it("cleans up callback server even on error", async () => {
      await provider.startCallbackServer()
      await provider.state()

      mockCallbackServer.waitForCallback.mockRejectedValue(new Error("Timeout"))

      await expect(provider.waitForCallback()).rejects.toThrow("Timeout")
      expect(mockCallbackServer.close).toHaveBeenCalled()
    })

    it("passes timeout parameter to callback server", async () => {
      await provider.startCallbackServer()
      const expectedState = await provider.state()

      mockCallbackServer.waitForCallback.mockResolvedValue({
        code: "auth_code",
        state: expectedState,
      })

      await provider.waitForCallback(60000)

      expect(mockCallbackServer.waitForCallback).toHaveBeenCalledWith(60000)
    })
  })

  describe("cleanup", () => {
    it("closes callback server if running", async () => {
      await provider.startCallbackServer()

      provider.cleanup()

      expect(mockCallbackServer.close).toHaveBeenCalled()
    })

    it("can be called multiple times safely", async () => {
      await provider.startCallbackServer()

      provider.cleanup()
      provider.cleanup()
      provider.cleanup()

      // Should not throw
    })

    it("does nothing when no callback server running", () => {
      // Should not throw
      provider.cleanup()
    })
  })

  describe("getProviderName", () => {
    it("returns provider display name", () => {
      expect(provider.getProviderName()).toBe("TestProvider")
    })
  })

  describe("getServerUrl", () => {
    it("returns server URL", () => {
      expect(provider.getServerUrl()).toBe("https://api.example.com")
    })
  })
})

describe("detectProvider", () => {
  it("detects Sentry from URL", () => {
    expect(detectProvider("https://sentry.io/api/mcp")).toBe("Sentry")
    expect(detectProvider("https://api.sentry.io/oauth")).toBe("Sentry")
  })

  it("detects GitHub from URL", () => {
    expect(detectProvider("https://api.github.com/mcp")).toBe("GitHub")
    expect(detectProvider("https://github.com/oauth")).toBe("GitHub")
  })

  it("detects Linear from URL", () => {
    expect(detectProvider("https://api.linear.app/mcp")).toBe("Linear")
  })

  it("detects Notion from URL", () => {
    expect(detectProvider("https://api.notion.com/mcp")).toBe("Notion")
  })

  it("detects Slack from URL", () => {
    expect(detectProvider("https://slack.com/api/mcp")).toBe("Slack")
  })

  it("detects Figma from URL", () => {
    expect(detectProvider("https://api.figma.com/mcp")).toBe("Figma")
  })

  it("extracts domain name for unknown providers", () => {
    expect(detectProvider("https://api.customservice.com/mcp")).toBe(
      "Customservice"
    )
    expect(detectProvider("https://myapp.io/oauth")).toBe("Myapp")
  })

  it("capitalizes first letter of extracted domain", () => {
    expect(detectProvider("https://example.com/api")).toBe("Example")
  })

  it("returns default for unparseable URLs", () => {
    // Single-part hostname
    expect(detectProvider("https://localhost/api")).toBe("MCP Server")
  })
})
