/**
 * Tests for auth-server helper
 *
 * Tests the getServerSession function that:
 * - Reads cookies from Next.js cookies()
 * - Forwards them to the API at ${API_URL}/api/auth/get-session
 * - Returns { user, session } on success
 * - Returns { user: null, session: null } on failure
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock data
const mockUser = {
  id: "user_123",
  name: "Test User",
  email: "test@example.com",
}

const mockSession = {
  id: "session_123",
}

const mockCookies = [
  { name: "session_token", value: "abc123" },
  { name: "csrf_token", value: "xyz789" },
]

// Store original fetch
const originalFetch = global.fetch

// Mock cookies function
let mockCookiesReturnValue = mockCookies

// Mock next/headers module
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      getAll: () => mockCookiesReturnValue,
    }),
}))

describe("getServerSession", () => {
  beforeEach(() => {
    mockCookiesReturnValue = mockCookies
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("returns user and session when API returns valid session", async () => {
    // @ts-expect-error - mock type doesn't match full fetch signature
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ user: mockUser, session: mockSession }),
      } as Response)
    )

    const { getServerSession } = await import("./auth-server")
    const result = await getServerSession()

    expect(result.user).toEqual(mockUser)
    expect(result.session).toEqual(mockSession)
  })

  it("returns null user/session when API returns 401", async () => {
    // @ts-expect-error - mock type doesn't match full fetch signature
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
      } as Response)
    )

    const { getServerSession } = await import("./auth-server")
    const result = await getServerSession()

    expect(result.user).toBeNull()
    expect(result.session).toBeNull()
  })

  it("returns null user/session when API returns 500", async () => {
    // @ts-expect-error - mock type doesn't match full fetch signature
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 500,
      } as Response)
    )

    const { getServerSession } = await import("./auth-server")
    const result = await getServerSession()

    expect(result.user).toBeNull()
    expect(result.session).toBeNull()
  })

  it("returns null user/session when fetch throws network error", async () => {
    // @ts-expect-error - mock type doesn't match full fetch signature
    global.fetch = vi.fn(() => Promise.reject(new Error("Network error")))

    const originalError = console.error
    console.error = vi.fn(() => {})

    const { getServerSession } = await import("./auth-server")
    const result = await getServerSession()

    expect(result.user).toBeNull()
    expect(result.session).toBeNull()

    console.error = originalError
  })

  it("properly forwards cookies to API", async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ user: mockUser, session: mockSession }),
      } as Response)
    )
    // @ts-expect-error - mock type doesn't match full fetch signature
    global.fetch = mockFetch

    const { getServerSession } = await import("./auth-server")
    await getServerSession()

    expect(mockFetch).toHaveBeenCalled()
    const call = mockFetch.mock.calls[0] as unknown as [
      string,
      RequestInit & { cache?: string },
    ]
    const [url, options] = call
    expect(url).toContain("/api/auth/get-session")
    expect((options?.headers as Record<string, string>)?.Cookie).toBe(
      "session_token=abc123; csrf_token=xyz789"
    )
    expect((options?.headers as Record<string, string>)?.["Content-Type"]).toBe(
      "application/json"
    )
    expect(options?.cache).toBe("no-store")
  })

  it("uses correct API URL", async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ user: mockUser, session: mockSession }),
      } as Response)
    )
    // @ts-expect-error - mock type doesn't match full fetch signature
    global.fetch = mockFetch

    const { getServerSession } = await import("./auth-server")
    await getServerSession()

    const call = mockFetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(call[0]).toMatch(/\/api\/auth\/get-session$/)
  })

  it("handles empty cookies array", async () => {
    mockCookiesReturnValue = []

    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ user: mockUser, session: mockSession }),
      } as Response)
    )
    // @ts-expect-error - mock type doesn't match full fetch signature
    global.fetch = mockFetch

    const { getServerSession } = await import("./auth-server")
    await getServerSession()

    const call = mockFetch.mock.calls[0] as unknown as [string, RequestInit]
    const options = call[1]
    expect((options?.headers as Record<string, string>)?.Cookie).toBe("")
  })

  it("handles malformed JSON response", async () => {
    // @ts-expect-error - mock type doesn't match full fetch signature
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON")),
      } as Response)
    )

    const originalError = console.error
    console.error = vi.fn(() => {})

    const { getServerSession } = await import("./auth-server")
    const result = await getServerSession()

    expect(result.user).toBeNull()
    expect(result.session).toBeNull()

    console.error = originalError
  })
})
