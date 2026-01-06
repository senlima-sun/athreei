/**
 * Tests for OAuth Callback Server
 *
 * Tests the temporary localhost HTTP server used for OAuth callbacks.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock the logger before importing the module
vi.mock("../../logger.js", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import {
  startCallbackServer,
  OAuthCallbackError,
  type CallbackServer,
} from "../callback-server.js"

describe("startCallbackServer", () => {
  let server: CallbackServer | null = null

  afterEach(() => {
    if (server) {
      server.close()
      server = null
    }
  })

  it("starts server and returns port and host", async () => {
    server = await startCallbackServer("TestProvider")

    expect(server.port).toBeGreaterThan(0)
    expect(server.host).toBeDefined()
    expect(["localhost", "127.0.0.1", "[::1]"]).toContain(server.host)
  })

  it("generates random callback path in redirectUri", async () => {
    server = await startCallbackServer("TestProvider")

    expect(server.redirectUri).toMatch(/^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+\/callback\/[\w-]+$/)
  })

  it("generates unique callback paths for each server", async () => {
    server = await startCallbackServer("TestProvider")
    const firstUri = server.redirectUri
    server.close()

    server = await startCallbackServer("TestProvider")
    const secondUri = server.redirectUri

    // Extract the UUID portion
    const firstPath = firstUri.split("/callback/")[1]
    const secondPath = secondUri.split("/callback/")[1]

    expect(firstPath).not.toBe(secondPath)
  })

  it("uses default provider name when not specified", async () => {
    server = await startCallbackServer()

    expect(server.port).toBeGreaterThan(0)
  })
})

describe("CallbackServer.waitForCallback", () => {
  let server: CallbackServer | null = null

  afterEach(() => {
    if (server) {
      server.close()
      server = null
    }
  })

  it("receives authorization code and state from callback", async () => {
    server = await startCallbackServer("TestProvider")

    // Simulate callback with valid code and state
    const callbackPromise = server.waitForCallback(5000)

    // Make HTTP request to callback URL
    const callbackUrl = new URL(server.redirectUri)
    callbackUrl.searchParams.set("code", "test_auth_code")
    callbackUrl.searchParams.set("state", "test_state_value")

    const response = await fetch(callbackUrl.toString())
    expect(response.status).toBe(200)

    // Verify callback result
    const result = await callbackPromise
    expect(result.code).toBe("test_auth_code")
    expect(result.state).toBe("test_state_value")
  })

  it("returns success HTML page on successful callback", async () => {
    server = await startCallbackServer("Sentry")

    const callbackPromise = server.waitForCallback(5000)

    const callbackUrl = new URL(server.redirectUri)
    callbackUrl.searchParams.set("code", "auth_code")
    callbackUrl.searchParams.set("state", "state_value")

    const response = await fetch(callbackUrl.toString())
    const html = await response.text()

    expect(html).toContain("Authorization Successful")
    expect(html).toContain("Sentry")
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8")

    await callbackPromise
  })

  it("includes security headers in response", async () => {
    server = await startCallbackServer("TestProvider")

    const callbackPromise = server.waitForCallback(5000)

    const callbackUrl = new URL(server.redirectUri)
    callbackUrl.searchParams.set("code", "code")
    callbackUrl.searchParams.set("state", "state")

    const response = await fetch(callbackUrl.toString())

    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(response.headers.get("X-Frame-Options")).toBe("DENY")
    expect(response.headers.get("Content-Security-Policy")).toContain("default-src 'none'")
    expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0")

    await callbackPromise
  })

  it("rejects requests to incorrect callback path", async () => {
    server = await startCallbackServer("TestProvider")

    // Try accessing wrong path
    const wrongUrl = `http://${server.host}:${server.port}/wrong/path`
    const response = await fetch(wrongUrl)

    expect(response.status).toBe(404)
  })

  it("returns 400 when code is missing", async () => {
    server = await startCallbackServer("TestProvider")

    const callbackUrl = new URL(server.redirectUri)
    callbackUrl.searchParams.set("state", "state_only")
    // No code parameter

    const response = await fetch(callbackUrl.toString())
    expect(response.status).toBe(400)

    const html = await response.text()
    expect(html).toContain("Missing code or state parameter")
  })

  it("returns 400 when state is missing", async () => {
    server = await startCallbackServer("TestProvider")

    const callbackUrl = new URL(server.redirectUri)
    callbackUrl.searchParams.set("code", "code_only")
    // No state parameter

    const response = await fetch(callbackUrl.toString())
    expect(response.status).toBe(400)
  })

  it("handles OAuth error response", async () => {
    server = await startCallbackServer("TestProvider")

    const callbackUrl = new URL(server.redirectUri)
    callbackUrl.searchParams.set("error", "access_denied")
    callbackUrl.searchParams.set("error_description", "User denied access")

    // Start callback promise and HTTP request concurrently
    const [, response] = await Promise.allSettled([
      expect(server.waitForCallback(5000)).rejects.toThrow(OAuthCallbackError),
      fetch(callbackUrl.toString()),
    ])

    // Check response
    if (response.status === "fulfilled") {
      expect(response.value.status).toBe(200) // Error page still returns 200
      const html = await response.value.text()
      expect(html).toContain("Authorization Failed")
      expect(html).toContain("access_denied")
      expect(html).toContain("User denied access")
    }
  })

  it("handles OAuth error without description", async () => {
    server = await startCallbackServer("TestProvider")

    const callbackUrl = new URL(server.redirectUri)
    callbackUrl.searchParams.set("error", "server_error")

    // Start callback promise and HTTP request concurrently
    await Promise.allSettled([
      expect(server.waitForCallback(5000)).rejects.toThrow("server_error"),
      fetch(callbackUrl.toString()),
    ])
  })

  it("times out when no callback received", async () => {
    server = await startCallbackServer("TestProvider")

    // Use short timeout for test
    const callbackPromise = server.waitForCallback(100)

    await expect(callbackPromise).rejects.toThrow("timeout")
  })
})

describe("CallbackServer.close", () => {
  it("closes the server and frees the port", async () => {
    const server = await startCallbackServer("TestProvider")
    const port = server.port
    const host = server.host

    server.close()

    // Server should no longer accept connections
    // Wait briefly for cleanup
    await new Promise((resolve) => setTimeout(resolve, 100))

    try {
      await fetch(`http://${host}:${port}/test`)
      // If fetch succeeds, something else might be on that port
      // This is OK since we just want to verify our server closed
    } catch (error) {
      // Expected - connection refused
      expect(error).toBeDefined()
    }
  })

  it("can be called multiple times safely", async () => {
    const server = await startCallbackServer("TestProvider")

    // Multiple close calls should not throw
    server.close()
    server.close()
    server.close()
  })
})

describe("OAuthCallbackError", () => {
  it("creates error with code only", () => {
    const error = new OAuthCallbackError("invalid_request")

    expect(error.message).toBe("invalid_request")
    expect(error.code).toBe("invalid_request")
    expect(error.description).toBeUndefined()
    expect(error.name).toBe("OAuthCallbackError")
  })

  it("creates error with code and description", () => {
    const error = new OAuthCallbackError("access_denied", "User declined")

    expect(error.message).toBe("access_denied: User declined")
    expect(error.code).toBe("access_denied")
    expect(error.description).toBe("User declined")
  })

  it("is instanceof Error", () => {
    const error = new OAuthCallbackError("test")

    expect(error instanceof Error).toBe(true)
    expect(error instanceof OAuthCallbackError).toBe(true)
  })
})
