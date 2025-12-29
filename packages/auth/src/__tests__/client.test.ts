import { describe, it, expect, vi, beforeEach } from "vitest";

// Use vi.hoisted to properly hoist the mock functions
const mockCreateAuthClient = vi.hoisted(() =>
  vi.fn(() => ({
    useSession: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    signUp: vi.fn(),
    organization: {
      list: vi.fn(),
      create: vi.fn(),
    },
  }))
);

const mockOrganizationClient = vi.hoisted(() =>
  vi.fn(() => ({
    id: "organization-client",
  }))
);

// Mock better-auth/react
vi.mock("better-auth/react", () => ({
  createAuthClient: mockCreateAuthClient,
}));

// Mock better-auth/client/plugins
vi.mock("better-auth/client/plugins", () => ({
  organizationClient: mockOrganizationClient,
}));

// Import after mocks are set up
import { createClient } from "../client.ts";

describe("createClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates client with correct baseURL", () => {
    const baseURL = "http://localhost:3000";
    createClient(baseURL);

    expect(mockCreateAuthClient).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL,
      })
    );
  });

  it("includes organizationClient plugin", () => {
    createClient("http://localhost:3000");

    expect(mockOrganizationClient).toHaveBeenCalled();
    expect(mockCreateAuthClient).toHaveBeenCalledWith(
      expect.objectContaining({
        plugins: expect.arrayContaining([
          expect.objectContaining({ id: "organization-client" }),
        ]),
      })
    );
  });

  it("returns auth client with expected methods", () => {
    const client = createClient("http://localhost:3000");

    expect(client).toHaveProperty("useSession");
    expect(client).toHaveProperty("signIn");
    expect(client).toHaveProperty("signOut");
    expect(client).toHaveProperty("signUp");
  });

  it("returns auth client with organization methods", () => {
    const client = createClient("http://localhost:3000");

    expect(client).toHaveProperty("organization");
    // @ts-expect-error - organization is added by plugin at runtime
    expect(client.organization).toHaveProperty("list");
    // @ts-expect-error - organization is added by plugin at runtime
    expect(client.organization).toHaveProperty("create");
  });

  it("accepts different baseURL values", () => {
    const urls = [
      "http://localhost:3000",
      "https://api.example.com",
      "https://auth.myapp.io/api",
    ];

    urls.forEach((url) => {
      vi.clearAllMocks();
      createClient(url);

      expect(mockCreateAuthClient).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: url,
        })
      );
    });
  });

  it("passes plugins array with organization client", () => {
    createClient("http://localhost:3000");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calledConfig = (mockCreateAuthClient.mock.calls as any)[0]?.[0];
    expect(calledConfig?.plugins).toBeDefined();
    expect(Array.isArray(calledConfig?.plugins)).toBe(true);
    expect(calledConfig?.plugins).toHaveLength(1);
  });
});
