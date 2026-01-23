/**
 * Registry API route tests
 *
 * The registry routes now proxy to the marketplace API with deprecation headers.
 * These tests verify backwards compatibility.
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest"
import { Hono } from "hono"
import type { RegistryMcpServer } from "@athreei/shared"

const MOCK_PLUGIN_SEARCH_RESULTS = [
  {
    id: "plugin-1",
    slug: "figma",
    name: "Figma",
    description: "Access Figma designs",
    category: "design",
    tags: ["productivity"],
    author: "Anthropic",
    iconUrl: "https://www.figma.com/favicon.ico",
    isVerified: true,
    isFeatured: true,
    downloadCount: 100,
    marketplace: {
      id: "marketplace-1",
      slug: "public-mcp-servers",
      name: "Public MCP Servers",
    },
    latestVersion: {
      id: "version-1",
      version: "1.0.0",
      publishedAt: new Date(),
    },
  },
  {
    id: "plugin-2",
    slug: "sentry",
    name: "Sentry",
    description: "Query error reports",
    category: "monitoring",
    tags: ["developer-tools"],
    author: "Sentry",
    iconUrl: "https://sentry.io/favicon.ico",
    isVerified: true,
    isFeatured: false,
    downloadCount: 50,
    marketplace: {
      id: "marketplace-1",
      slug: "public-mcp-servers",
      name: "Public MCP Servers",
    },
    latestVersion: {
      id: "version-2",
      version: "1.0.0",
      publishedAt: new Date(),
    },
  },
  {
    id: "plugin-3",
    slug: "unverified-server",
    name: "Unverified Server",
    description: "An unverified community server",
    category: "other",
    tags: [],
    author: "Community",
    iconUrl: null,
    isVerified: false,
    isFeatured: false,
    downloadCount: 10,
    marketplace: {
      id: "marketplace-1",
      slug: "public-mcp-servers",
      name: "Public MCP Servers",
    },
    latestVersion: {
      id: "version-3",
      version: "1.0.0",
      publishedAt: new Date(),
    },
  },
]

const MOCK_PLUGIN_DETAILS = {
  id: "plugin-1",
  slug: "figma",
  name: "Figma",
  description: "Access Figma designs",
  category: "design",
  tags: ["productivity"],
  author: "Anthropic",
  homepage: "https://github.com/anthropics/mcp-figma",
  repository: "https://github.com/anthropics/mcp-figma",
  license: null,
  iconUrl: "https://www.figma.com/favicon.ico",
  isVerified: true,
  isFeatured: true,
  downloadCount: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
  marketplace: {
    id: "marketplace-1",
    slug: "public-mcp-servers",
    name: "Public MCP Servers",
  },
  versions: [
    {
      id: "version-1",
      version: "1.0.0",
      changelog: null,
      isLatest: true,
      publishedAt: new Date(),
    },
  ],
  components: [
    {
      id: "component-1",
      type: "mcp_server",
      name: "Figma",
      description: "Access Figma designs",
    },
  ],
}

const mockSearchPlugins = vi.fn()
const mockGetPluginDetails = vi.fn()

vi.mock("../../services/plugin-discovery", () => ({
  searchPlugins: (...args: unknown[]) => mockSearchPlugins(...args),
  getPluginDetails: (...args: unknown[]) => mockGetPluginDetails(...args),
}))

vi.mock("@athreei/db/seeds", () => ({
  SYSTEM_MARKETPLACE_SLUG: "public-mcp-servers",
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

  mockSearchPlugins.mockResolvedValue({
    plugins: MOCK_PLUGIN_SEARCH_RESULTS,
    total: MOCK_PLUGIN_SEARCH_RESULTS.length,
    pagination: {
      limit: 100,
      offset: 0,
      total: MOCK_PLUGIN_SEARCH_RESULTS.length,
      hasMore: false,
    },
  })

  mockGetPluginDetails.mockResolvedValue(MOCK_PLUGIN_DETAILS)
})

describe("Registry Routes", () => {
  describe("GET /api/registry", () => {
    it("should return all registry servers", async () => {
      const res = await app.request("/api/registry")
      expect(res.status).toBe(200)

      const data = (await res.json()) as RegistryListResponse
      expect(data.servers).toBeDefined()
      expect(data.total).toBe(MOCK_PLUGIN_SEARCH_RESULTS.length)
      expect(data.categories).toBeDefined()
      expect(Array.isArray(data.categories)).toBe(true)
    })

    it("should set Cache-Control header", async () => {
      const res = await app.request("/api/registry")
      expect(res.status).toBe(200)
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=300")
    })

    it("should set Deprecation headers", async () => {
      const res = await app.request("/api/registry")
      expect(res.status).toBe(200)
      expect(res.headers.get("Deprecation")).toBeDefined()
      expect(res.headers.get("Sunset")).toBeDefined()
      expect(res.headers.get("X-Deprecation-Notice")).toBeDefined()
    })

    it("should pass category filter to searchPlugins", async () => {
      const res = await app.request("/api/registry?category=developer-tools")
      expect(res.status).toBe(200)

      expect(mockSearchPlugins).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "developer-tools",
          componentType: "mcp_server",
          marketplaceSlug: "public-mcp-servers",
        }),
        undefined
      )
    })

    it("should pass search filter to searchPlugins", async () => {
      const res = await app.request("/api/registry?search=figma")
      expect(res.status).toBe(200)

      expect(mockSearchPlugins).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "figma",
          componentType: "mcp_server",
        }),
        undefined
      )
    })

    it("should pass verified filter to searchPlugins", async () => {
      const res = await app.request("/api/registry?verified=true")
      expect(res.status).toBe(200)

      expect(mockSearchPlugins).toHaveBeenCalledWith(
        expect.objectContaining({
          isVerified: true,
          componentType: "mcp_server",
        }),
        undefined
      )
    })

    it("should return empty array when no plugins found", async () => {
      mockSearchPlugins.mockResolvedValue({
        plugins: [],
        total: 0,
        pagination: { limit: 100, offset: 0, total: 0, hasMore: false },
      })

      const res = await app.request(
        "/api/registry?category=nonexistent-category"
      )
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
    })

    it("should set Cache-Control header", async () => {
      const res = await app.request("/api/registry/figma")
      expect(res.status).toBe(200)
      expect(res.headers.get("Cache-Control")).toBe("public, max-age=300")
    })

    it("should set Deprecation headers", async () => {
      const res = await app.request("/api/registry/figma")
      expect(res.status).toBe(200)
      expect(res.headers.get("Deprecation")).toBeDefined()
      expect(res.headers.get("Sunset")).toBeDefined()
    })

    it("should return 404 for non-existent slug", async () => {
      mockGetPluginDetails.mockResolvedValue(null)

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
      expect(data).toHaveProperty("categories")
      expect(data).toHaveProperty("verified")
    })
  })
})
