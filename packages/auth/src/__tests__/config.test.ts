import { describe, it, expect, vi, beforeEach } from "vitest"
import { createAuthConfig, type AuthConfigOptions } from "../config.ts"

// Mock better-auth/adapters/drizzle
vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: vi.fn((db, options) => ({
    type: "drizzle",
    db,
    options,
  })),
}))

// Mock better-auth/plugins
vi.mock("better-auth/plugins", () => ({
  organization: vi.fn((options) => ({
    id: "organization",
    ...options,
  })),
}))

describe("createAuthConfig", () => {
  const mockDb = { query: vi.fn() } as unknown as Parameters<
    typeof createAuthConfig
  >[0]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns correct structure with required fields", () => {
    const config = createAuthConfig(mockDb)

    expect(config).toHaveProperty("database")
    expect(config).toHaveProperty("emailAndPassword")
    expect(config).toHaveProperty("socialProviders")
    expect(config).toHaveProperty("plugins")
  })

  it("uses sqlite as default provider", async () => {
    const { drizzleAdapter } = await import("better-auth/adapters/drizzle")
    createAuthConfig(mockDb)

    expect(drizzleAdapter).toHaveBeenCalledWith(mockDb, {
      provider: "sqlite",
    })
  })

  it("allows provider to be set to pg", async () => {
    const { drizzleAdapter } = await import("better-auth/adapters/drizzle")
    createAuthConfig(mockDb, { provider: "pg" })

    expect(drizzleAdapter).toHaveBeenCalledWith(mockDb, {
      provider: "pg",
    })
  })

  it("allows provider to be set to mysql", async () => {
    const { drizzleAdapter } = await import("better-auth/adapters/drizzle")
    createAuthConfig(mockDb, { provider: "mysql" })

    expect(drizzleAdapter).toHaveBeenCalledWith(mockDb, {
      provider: "mysql",
    })
  })

  it("enables emailAndPassword by default", () => {
    const config = createAuthConfig(mockDb)

    expect(config.emailAndPassword).toEqual({
      enabled: true,
    })
  })

  it("includes organization plugin", async () => {
    const { organization } = await import("better-auth/plugins")
    const config = createAuthConfig(mockDb)

    expect(organization).toHaveBeenCalledWith({
      creatorRole: "owner",
      allowUserToCreateOrganization: true,
    })
    expect(config.plugins).toBeDefined()
    expect(config.plugins).toHaveLength(1)
    expect(config.plugins![0]).toHaveProperty("id", "organization")
  })

  it("merges additional options correctly", () => {
    const additionalOptions: AuthConfigOptions = {
      trustedOrigins: ["https://example.com"],
      rateLimit: {
        enabled: true,
      },
    }

    const config = createAuthConfig(mockDb, additionalOptions)

    expect(config.trustedOrigins).toEqual(["https://example.com"])
    expect(config.rateLimit).toEqual({ enabled: true })
  })

  it("allows overriding default options", () => {
    const config = createAuthConfig(mockDb, {
      emailAndPassword: {
        enabled: false,
      },
    })

    expect(config.emailAndPassword).toEqual({
      enabled: false,
    })
  })

  it("preserves social providers configuration", () => {
    const config = createAuthConfig(mockDb)

    expect(config.socialProviders).toBeDefined()
    expect(config.socialProviders).toEqual({})
  })

  it("creates drizzle adapter with provided database", async () => {
    const { drizzleAdapter } = await import("better-auth/adapters/drizzle")
    const config = createAuthConfig(mockDb)

    expect(drizzleAdapter).toHaveBeenCalledWith(mockDb, expect.any(Object))
    expect(config.database).toEqual({
      type: "drizzle",
      db: mockDb,
      options: { provider: "sqlite" },
    })
  })
})
