/**
 * Registry API route tests
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { Hono } from "hono"
import type { RegistryMcpServer } from "@athreei/shared"

const MOCK_SERVERS: RegistryMcpServer[] = [
  {
    slug: "figma",
    name: "Figma",
    description: "Access Figma designs",
    publisher: "Anthropic",
    iconUrl: "https://www.figma.com/favicon.ico",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@anthropic/mcp-figma"],
    docsUrl: "https://github.com/anthropics/mcp-figma",
    envVars: [
      {
        name: "FIGMA_ACCESS_TOKEN",
        description: "Personal access token",
        required: true,
      },
    ],
    categories: ["design", "productivity"],
    verified: true,
  },
  {
    slug: "sentry",
    name: "Sentry",
    description: "Query error reports",
    publisher: "Sentry",
    iconUrl: "https://sentry.io/favicon.ico",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@sentry/mcp-server"],
    docsUrl: "https://github.com/getsentry/sentry-mcp",
    envVars: [
      {
        name: "SENTRY_AUTH_TOKEN",
        description: "Auth token",
        required: true,
      },
    ],
    categories: ["monitoring", "developer-tools"],
    verified: true,
  },
  {
    slug: "unverified-server",
    name: "Unverified Server",
    description: "An unverified community server",
    publisher: "Community",
    transport: "stdio",
    command: "npx",
    args: ["-y", "unverified-mcp"],
    docsUrl: "https://example.com",
    envVars: [],
    categories: ["other"],
    verified: false,
  },
]

vi.mock("../../services/registry-loader", () => ({
  getRegistryServers: vi.fn(() => Promise.resolve(MOCK_SERVERS)),
  getRegistryServerBySlug: vi.fn((slug: string) =>
    Promise.resolve(MOCK_SERVERS.find((s) => s.slug === slug))
  ),
  getRegistryCategories: vi.fn(() =>
    Promise.resolve(
      [...new Set(MOCK_SERVERS.flatMap((s) => s.categories))].sort()
    )
  ),
}))

interface RegistryListResponse {
  servers: RegistryMcpServer[]
  total: number
  categories: string[]
}

interface ErrorResponse {
  error: string
}

let app: Hono

beforeAll(async () => {
  const { default: registry } = await import("../../routes/registry")
  app = new Hono()
  app.route("/api/registry", registry)
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe("Registry Routes", () => {
  describe("GET /api/registry", () => {
    it("should return all registry servers", async () => {
      const res = await app.request("/api/registry")
      expect(res.status).toBe(200)

      const data = (await res.json()) as RegistryListResponse
      expect(data.servers).toBeDefined()
      expect(data.total).toBe(MOCK_SERVERS.length)
      expect(data.categories).toBeDefined()
      expect(Array.isArray(data.categories)).toBe(true)
    })

    it("should set Cache-Control header", async () => {
      const res = await app.request("/api/registry")
      expect(res.status).toBe(200)
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=300")
    })

    it("should filter by category", async () => {
      const res = await app.request("/api/registry?category=developer-tools")
      expect(res.status).toBe(200)

      const data = (await res.json()) as RegistryListResponse
      expect(
        data.servers.every((s) => s.categories.includes("developer-tools"))
      ).toBe(true)
    })

    it("should filter by search term (name)", async () => {
      const res = await app.request("/api/registry?search=figma")
      expect(res.status).toBe(200)

      const data = (await res.json()) as RegistryListResponse
      expect(data.servers.length).toBeGreaterThanOrEqual(1)
      expect(
        data.servers.some((s) => s.name.toLowerCase().includes("figma"))
      ).toBe(true)
    })

    it("should filter by search term (case-insensitive)", async () => {
      const res = await app.request("/api/registry?search=FIGMA")
      expect(res.status).toBe(200)

      const data = (await res.json()) as RegistryListResponse
      expect(data.servers.length).toBeGreaterThanOrEqual(1)
    })

    it("should filter by verified status (true)", async () => {
      const res = await app.request("/api/registry?verified=true")
      expect(res.status).toBe(200)

      const data = (await res.json()) as RegistryListResponse
      expect(data.servers.every((s) => s.verified === true)).toBe(true)
    })

    it("should filter by verified status (false)", async () => {
      const res = await app.request("/api/registry?verified=false")
      expect(res.status).toBe(200)

      const data = (await res.json()) as RegistryListResponse
      expect(data.servers.every((s) => s.verified === false)).toBe(true)
    })

    it("should combine multiple filters", async () => {
      const res = await app.request(
        "/api/registry?category=developer-tools&verified=true"
      )
      expect(res.status).toBe(200)

      const data = (await res.json()) as RegistryListResponse
      expect(
        data.servers.every(
          (s) => s.categories.includes("developer-tools") && s.verified === true
        )
      ).toBe(true)
    })

    it("should return empty array for non-existent category", async () => {
      const res = await app.request(
        "/api/registry?category=nonexistent-category"
      )
      expect(res.status).toBe(200)

      const data = (await res.json()) as RegistryListResponse
      expect(data.servers).toEqual([])
      expect(data.total).toBe(0)
    })

    it("should return empty array for no search matches", async () => {
      const res = await app.request("/api/registry?search=zzznonexistentzzzz")
      expect(res.status).toBe(200)

      const data = (await res.json()) as RegistryListResponse
      expect(data.servers).toEqual([])
      expect(data.total).toBe(0)
    })

    it("should reject search strings over 100 characters", async () => {
      const longSearch = "a".repeat(101)
      const res = await app.request(`/api/registry?search=${longSearch}`)
      expect(res.status).toBe(400)
    })

    it("should reject category strings over 50 characters", async () => {
      const longCategory = "a".repeat(51)
      const res = await app.request(`/api/registry?category=${longCategory}`)
      expect(res.status).toBe(400)
    })

    it("should reject invalid verified value", async () => {
      const res = await app.request("/api/registry?verified=invalid")
      expect(res.status).toBe(400)
    })
  })

  describe("GET /api/registry/:slug", () => {
    it("should return a single server by slug", async () => {
      const res = await app.request("/api/registry/figma")
      expect(res.status).toBe(200)

      const data = (await res.json()) as RegistryMcpServer
      expect(data.slug).toBe("figma")
      expect(data.name).toBe("Figma")
      expect(data.transport).toBeDefined()
    })

    it("should set Cache-Control header", async () => {
      const res = await app.request("/api/registry/figma")
      expect(res.status).toBe(200)
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=300")
    })

    it("should return 404 for non-existent slug", async () => {
      const res = await app.request("/api/registry/nonexistent-slug-12345")
      expect(res.status).toBe(404)

      const data = (await res.json()) as ErrorResponse
      expect(data.error).toBe("Server not found")
    })

    it("should return all expected fields for a server", async () => {
      const res = await app.request("/api/registry/figma")
      expect(res.status).toBe(200)

      const data = (await res.json()) as RegistryMcpServer
      expect(data).toHaveProperty("slug")
      expect(data).toHaveProperty("name")
      expect(data).toHaveProperty("description")
      expect(data).toHaveProperty("publisher")
      expect(data).toHaveProperty("transport")
      expect(data).toHaveProperty("docsUrl")
      expect(data).toHaveProperty("categories")
      expect(data).toHaveProperty("verified")
      expect(data).toHaveProperty("envVars")
    })
  })
})
