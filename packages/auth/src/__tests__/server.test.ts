import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthConfigOptions } from "../config.ts";

// Use vi.hoisted to properly hoist the mock function
const mockBetterAuth = vi.hoisted(() =>
  vi.fn(() => ({
    handler: vi.fn(),
    api: {},
  }))
);

// Mock better-auth
vi.mock("better-auth", () => ({
  betterAuth: mockBetterAuth,
}));

// Mock better-auth/adapters/drizzle
vi.mock("better-auth/adapters/drizzle", () => ({
  drizzleAdapter: vi.fn((db, options) => ({
    type: "drizzle",
    db,
    options,
  })),
}));

// Mock better-auth/plugins
vi.mock("better-auth/plugins", () => ({
  organization: vi.fn((options) => ({
    id: "organization",
    ...options,
  })),
}));

// Import after mocks are set up
import { createAuth } from "../server.ts";

describe("createAuth", () => {
  const mockDb = { query: vi.fn() } as unknown as Parameters<
    typeof createAuth
  >[0];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls betterAuth with correct config", () => {
    createAuth(mockDb);

    expect(mockBetterAuth).toHaveBeenCalledTimes(1);
    expect(mockBetterAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        database: expect.any(Object),
        emailAndPassword: { enabled: true },
        plugins: expect.any(Array),
      })
    );
  });

  it("returns auth instance with handler", () => {
    const auth = createAuth(mockDb);

    expect(auth).toHaveProperty("handler");
    expect(auth).toHaveProperty("api");
  });

  it("passes provider option to config", () => {
    createAuth(mockDb, { provider: "pg" });

    expect(mockBetterAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        database: expect.objectContaining({
          options: { provider: "pg" },
        }),
      })
    );
  });

  it("passes additional options to betterAuth", () => {
    const options: AuthConfigOptions = {
      trustedOrigins: ["https://example.com"],
    };

    createAuth(mockDb, options);

    expect(mockBetterAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        trustedOrigins: ["https://example.com"],
      })
    );
  });

  it("uses default options when none provided", () => {
    createAuth(mockDb);

    expect(mockBetterAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        database: expect.objectContaining({
          options: { provider: "sqlite" },
        }),
        emailAndPassword: { enabled: true },
      })
    );
  });

  it("includes organization plugin in config", () => {
    createAuth(mockDb);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calledConfig = (mockBetterAuth.mock.calls as any)[0]?.[0];
    expect(calledConfig?.plugins).toHaveLength(1);
    expect(calledConfig?.plugins[0]).toHaveProperty("id", "organization");
  });

  it("can override emailAndPassword setting", () => {
    createAuth(mockDb, {
      emailAndPassword: { enabled: false },
    });

    expect(mockBetterAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        emailAndPassword: { enabled: false },
      })
    );
  });
});
