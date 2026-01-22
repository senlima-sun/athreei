import { describe, it, expect, vi, beforeEach } from "vitest"
import { createAuthConfig, type AuthConfigOptions } from "../config.ts"

// Mock better-auth/adapters/drizzle
vi.mock("better-auth/adapters/drizzle", async (importOriginal) => {
  const actual = await importOriginal<typeof import("better-auth/adapters/drizzle")>()
  return {
    ...actual,
    drizzleAdapter: vi.fn((db, options) => ({
      type: "drizzle",
      db,
      options,
    })),
  }
})

// Mock better-auth/plugins
vi.mock("better-auth/plugins", async (importOriginal) => {
  const actual = await importOriginal<typeof import("better-auth/plugins")>()
  return {
    ...actual,
    organization: vi.fn((options) => ({
      id: "organization",
      ...options,
    })),
    admin: vi.fn((options) => ({
      id: "admin",
      ...options,
    })),
  }
})

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

  it("includes organization and admin plugins", async () => {
    const { organization, admin } = await import("better-auth/plugins")
    const config = createAuthConfig(mockDb)

    expect(organization).toHaveBeenCalledWith({
      creatorRole: "owner",
      allowUserToCreateOrganization: true,
    })
    expect(admin).toHaveBeenCalled()
    expect(config.plugins).toBeDefined()
    expect(config.plugins).toHaveLength(2)
    expect(config.plugins![0]).toHaveProperty("id", "organization")
    expect(config.plugins![1]).toHaveProperty("id", "admin")
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
