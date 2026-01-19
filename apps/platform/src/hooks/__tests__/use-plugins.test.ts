/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import React from "react"

const { mockFetchApi, mockUseActiveOrganizationSafe } = vi.hoisted(() => ({
  mockFetchApi: vi.fn(),
  mockUseActiveOrganizationSafe: vi.fn(),
}))

vi.mock("@/lib/api", () => ({
  fetchApi: mockFetchApi,
}))

vi.mock("@/lib/auth-client", () => ({
  useActiveOrganizationSafe: mockUseActiveOrganizationSafe,
}))

import {
  usePlugins,
  usePlugin,
  usePluginVersions,
  usePluginVersion,
} from "../use-plugins"
import {
  useInstalledPlugins,
  usePluginInstallation,
  useInstallPlugin,
  useUninstallPlugin,
  useUpdatePlugin,
  useUpdateInstallation,
} from "../use-plugin-installation"

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    )
  }
}

const mockOrg = { id: "org-123", name: "Test Org", slug: "test-org" }

const mockPluginSearchResult = {
  id: "plugin-1",
  slug: "test-plugin",
  name: "Test Plugin",
  description: "A test plugin",
  category: "utilities",
  tags: ["test", "demo"],
  author: "Test Author",
  iconUrl: null,
  isVerified: true,
  isFeatured: false,
  downloadCount: 100,
  marketplace: { id: "mp-1", slug: "default", name: "Default" },
  latestVersion: { id: "v-1", version: "1.0.0", publishedAt: "2024-01-01" },
}

const mockPlugin = {
  id: "plugin-1",
  slug: "test-plugin",
  name: "Test Plugin",
  description: "A test plugin",
  category: "utilities",
  tags: ["test", "demo"],
  author: "Test Author",
  homepage: "https://example.com",
  repository: "https://github.com/test/plugin",
  license: "MIT",
  iconUrl: null,
  isVerified: true,
  isFeatured: false,
  downloadCount: 100,
  createdAt: "2024-01-01",
  updatedAt: "2024-01-01",
  marketplace: { id: "mp-1", slug: "default", name: "Default" },
}

const mockInstallation = {
  id: "inst-1",
  organizationId: "org-123",
  pluginId: "plugin-1",
  pluginVersionId: "v-1",
  installedBy: "user-1",
  scope: "organization" as const,
  status: "active" as const,
  config: {},
  installedAt: "2024-01-01",
  updatedAt: "2024-01-01",
  plugin: {
    id: "plugin-1",
    slug: "test-plugin",
    name: "Test Plugin",
    marketplace: { id: "mp-1", slug: "default", name: "Default" },
  },
  version: { id: "v-1", version: "1.0.0" },
}

describe("usePlugins", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActiveOrganizationSafe.mockReturnValue({
      data: mockOrg,
      isPending: false,
    })
  })

  it("fetches plugins with default params", async () => {
    mockFetchApi.mockResolvedValueOnce({
      plugins: [mockPluginSearchResult],
      total: 1,
    })

    const { result } = renderHook(() => usePlugins(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.stringContaining("/api/plugins?")
    )
    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.stringContaining("sort=popularity")
    )
    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.stringContaining("limit=20")
    )
    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.stringContaining("offset=0")
    )
    expect(result.current.data?.pages[0]?.plugins).toHaveLength(1)
  })

  it("supports search param", async () => {
    mockFetchApi.mockResolvedValueOnce({
      plugins: [mockPluginSearchResult],
      total: 1,
    })

    const { result } = renderHook(() => usePlugins({ search: "test query" }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.stringContaining("search=test+query")
    )
  })

  it("supports category filter", async () => {
    mockFetchApi.mockResolvedValueOnce({
      plugins: [mockPluginSearchResult],
      total: 1,
    })

    const { result } = renderHook(() => usePlugins({ category: "utilities" }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.stringContaining("category=utilities")
    )
  })

  it("supports tags filter", async () => {
    mockFetchApi.mockResolvedValueOnce({
      plugins: [mockPluginSearchResult],
      total: 1,
    })

    const { result } = renderHook(() => usePlugins({ tags: "test,demo" }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.stringContaining("tags=test%2Cdemo")
    )
  })

  it("supports pagination (offset-based)", async () => {
    mockFetchApi.mockResolvedValueOnce({
      plugins: Array(20).fill(mockPluginSearchResult),
      total: 50,
    })

    const { result } = renderHook(() => usePlugins({ limit: 20 }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.stringContaining("limit=20")
    )
    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.stringContaining("offset=0")
    )
  })

  it("returns hasMore flag correctly when more pages exist", async () => {
    mockFetchApi.mockResolvedValueOnce({
      plugins: Array(20).fill(mockPluginSearchResult),
      total: 50,
    })

    const { result } = renderHook(() => usePlugins({ limit: 20 }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pages[0]?.hasMore).toBe(true)
  })

  it("returns hasMore flag correctly when no more pages exist", async () => {
    mockFetchApi.mockResolvedValueOnce({
      plugins: [mockPluginSearchResult],
      total: 1,
    })

    const { result } = renderHook(() => usePlugins({ limit: 20 }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pages[0]?.hasMore).toBe(false)
  })

  it("handles empty response", async () => {
    mockFetchApi.mockResolvedValueOnce({
      plugins: [],
      total: 0,
    })

    const { result } = renderHook(() => usePlugins(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.pages[0]?.plugins).toHaveLength(0)
    expect(result.current.data?.pages[0]?.total).toBe(0)
    expect(result.current.data?.pages[0]?.hasMore).toBe(false)
  })

  it("handles network error", async () => {
    mockFetchApi.mockRejectedValueOnce(new Error("API error: 500"))

    const { result } = renderHook(() => usePlugins(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe("API error: 500")
  })

  it("supports isVerified filter", async () => {
    mockFetchApi.mockResolvedValueOnce({
      plugins: [mockPluginSearchResult],
      total: 1,
    })

    const { result } = renderHook(() => usePlugins({ isVerified: true }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.stringContaining("isVerified=true")
    )
  })

  it("supports isFeatured filter", async () => {
    mockFetchApi.mockResolvedValueOnce({
      plugins: [mockPluginSearchResult],
      total: 1,
    })

    const { result } = renderHook(() => usePlugins({ isFeatured: true }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.stringContaining("isFeatured=true")
    )
  })

  it("supports sort parameter", async () => {
    mockFetchApi.mockResolvedValueOnce({
      plugins: [mockPluginSearchResult],
      total: 1,
    })

    const { result } = renderHook(() => usePlugins({ sort: "recent" }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.stringContaining("sort=recent")
    )
  })

  it("includes organizationId when active org exists", async () => {
    mockFetchApi.mockResolvedValueOnce({
      plugins: [mockPluginSearchResult],
      total: 1,
    })

    const { result } = renderHook(() => usePlugins(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.stringContaining("organizationId=org-123")
    )
  })
})

describe("usePlugin", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActiveOrganizationSafe.mockReturnValue({
      data: mockOrg,
      isPending: false,
    })
  })

  it("fetches plugin by marketplace and plugin slug", async () => {
    mockFetchApi.mockResolvedValueOnce({ plugin: mockPlugin })

    const { result } = renderHook(() => usePlugin("default", "test-plugin"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.stringContaining("/api/plugins/default/test-plugin")
    )
    expect(result.current.data?.plugin).toEqual(mockPlugin)
  })

  it("does not fetch when marketplaceSlug is undefined", () => {
    const { result } = renderHook(() => usePlugin(undefined, "test-plugin"), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe("idle")
    expect(mockFetchApi).not.toHaveBeenCalled()
  })

  it("does not fetch when pluginSlug is undefined", () => {
    const { result } = renderHook(() => usePlugin("default", undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.fetchStatus).toBe("idle")
    expect(mockFetchApi).not.toHaveBeenCalled()
  })
})

describe("usePluginVersions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActiveOrganizationSafe.mockReturnValue({
      data: mockOrg,
      isPending: false,
    })
  })

  it("fetches versions for a plugin", async () => {
    const mockVersions = [
      {
        id: "v-2",
        version: "1.1.0",
        changelog: "Bug fixes",
        isLatest: true,
        publishedAt: "2024-02-01",
      },
      {
        id: "v-1",
        version: "1.0.0",
        changelog: "Initial release",
        isLatest: false,
        publishedAt: "2024-01-01",
      },
    ]
    mockFetchApi.mockResolvedValueOnce({ versions: mockVersions })

    const { result } = renderHook(
      () => usePluginVersions("default", "test-plugin"),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.stringContaining("/api/plugins/default/test-plugin/versions")
    )
    expect(result.current.data?.versions).toHaveLength(2)
  })
})

describe("usePluginVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActiveOrganizationSafe.mockReturnValue({
      data: mockOrg,
      isPending: false,
    })
  })

  it("fetches a specific version", async () => {
    const mockVersion = {
      id: "v-1",
      version: "1.0.0",
      changelog: "Initial release",
      manifest: { name: "test-plugin", version: "1.0.0" },
      isLatest: false,
      publishedAt: "2024-01-01",
      components: [],
    }
    mockFetchApi.mockResolvedValueOnce({ version: mockVersion })

    const { result } = renderHook(
      () => usePluginVersion("default", "test-plugin", "1.0.0"),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.stringContaining("/api/plugins/default/test-plugin/versions/1.0.0")
    )
    expect(result.current.data?.version).toEqual(mockVersion)
  })
})

describe("useInstalledPlugins", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActiveOrganizationSafe.mockReturnValue({
      data: mockOrg,
      isPending: false,
    })
  })

  it("fetches installed plugins for current org", async () => {
    mockFetchApi.mockResolvedValueOnce({
      installations: [mockInstallation],
      total: 1,
    })

    const { result } = renderHook(() => useInstalledPlugins(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.stringContaining("/api/organizations/org-123/plugins")
    )
    expect(result.current.data?.installations).toHaveLength(1)
  })

  it("does not fetch when org is pending", () => {
    mockUseActiveOrganizationSafe.mockReturnValue({
      data: undefined,
      isPending: true,
    })

    const { result } = renderHook(() => useInstalledPlugins(), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
    expect(mockFetchApi).not.toHaveBeenCalled()
  })

  it("supports status filter", async () => {
    mockFetchApi.mockResolvedValueOnce({
      installations: [mockInstallation],
      total: 1,
    })

    const { result } = renderHook(
      () => useInstalledPlugins({ status: "active" }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.stringContaining("status=active")
    )
  })

  it("supports scope filter", async () => {
    mockFetchApi.mockResolvedValueOnce({
      installations: [mockInstallation],
      total: 1,
    })

    const { result } = renderHook(
      () => useInstalledPlugins({ scope: "organization" }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      expect.stringContaining("scope=organization")
    )
  })
})

describe("usePluginInstallation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActiveOrganizationSafe.mockReturnValue({
      data: mockOrg,
      isPending: false,
    })
  })

  it("finds installation for a specific plugin", async () => {
    mockFetchApi.mockResolvedValueOnce({
      installations: [mockInstallation],
      total: 1,
    })

    const { result } = renderHook(() => usePluginInstallation("plugin-1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.installation).toEqual(mockInstallation)
  })

  it("returns null when plugin is not installed", async () => {
    mockFetchApi.mockResolvedValueOnce({
      installations: [mockInstallation],
      total: 1,
    })

    const { result } = renderHook(() => usePluginInstallation("other-plugin"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.installation).toBeNull()
  })
})

describe("useInstallPlugin", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActiveOrganizationSafe.mockReturnValue({
      data: mockOrg,
      isPending: false,
    })
  })

  it("calls POST /organizations/:orgId/plugins/install", async () => {
    mockFetchApi.mockResolvedValueOnce({ installation: mockInstallation })

    const { result } = renderHook(() => useInstallPlugin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      marketplaceSlug: "default",
      pluginSlug: "test-plugin",
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      "/api/organizations/org-123/plugins/install",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    )
  })

  it("includes scope and envValues in body", async () => {
    mockFetchApi.mockResolvedValueOnce({ installation: mockInstallation })

    const { result } = renderHook(() => useInstallPlugin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      marketplaceSlug: "default",
      pluginSlug: "test-plugin",
      scope: "user",
      envValues: { API_KEY: "secret123" },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      "/api/organizations/org-123/plugins/install",
      expect.objectContaining({
        body: JSON.stringify({
          marketplaceSlug: "default",
          pluginSlug: "test-plugin",
          scope: "user",
          envValues: { API_KEY: "secret123" },
        }),
      })
    )
  })

  it("includes version in body when specified", async () => {
    mockFetchApi.mockResolvedValueOnce({ installation: mockInstallation })

    const { result } = renderHook(() => useInstallPlugin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      marketplaceSlug: "default",
      pluginSlug: "test-plugin",
      version: "1.0.0",
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      "/api/organizations/org-123/plugins/install",
      expect.objectContaining({
        body: JSON.stringify({
          marketplaceSlug: "default",
          pluginSlug: "test-plugin",
          version: "1.0.0",
        }),
      })
    )
  })

  it("returns error for 403 (restricted)", async () => {
    mockFetchApi.mockRejectedValueOnce(new Error("API error: 403"))

    const { result } = renderHook(() => useInstallPlugin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      marketplaceSlug: "default",
      pluginSlug: "restricted-plugin",
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe("API error: 403")
  })

  it("returns error for 409 (already installed)", async () => {
    mockFetchApi.mockRejectedValueOnce(new Error("API error: 409"))

    const { result } = renderHook(() => useInstallPlugin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      marketplaceSlug: "default",
      pluginSlug: "test-plugin",
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe("API error: 409")
  })

  it("returns error for 400 (missing env)", async () => {
    mockFetchApi.mockRejectedValueOnce(new Error("API error: 400"))

    const { result } = renderHook(() => useInstallPlugin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      marketplaceSlug: "default",
      pluginSlug: "plugin-with-required-env",
    })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe("API error: 400")
  })
})

describe("useUninstallPlugin", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActiveOrganizationSafe.mockReturnValue({
      data: mockOrg,
      isPending: false,
    })
  })

  it("calls POST /organizations/:orgId/plugins/:id/uninstall", async () => {
    mockFetchApi.mockResolvedValueOnce({ message: "Plugin uninstalled" })

    const { result } = renderHook(() => useUninstallPlugin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate("inst-1")

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      "/api/organizations/org-123/plugins/inst-1/uninstall",
      expect.objectContaining({
        method: "POST",
      })
    )
  })

  it("returns error for 403 (not owner)", async () => {
    mockFetchApi.mockRejectedValueOnce(new Error("API error: 403"))

    const { result } = renderHook(() => useUninstallPlugin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate("inst-1")

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error?.message).toBe("API error: 403")
  })

  it("returns success message on successful uninstall", async () => {
    mockFetchApi.mockResolvedValueOnce({
      message: "Plugin uninstalled successfully",
    })

    const { result } = renderHook(() => useUninstallPlugin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate("inst-1")

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data?.message).toBe("Plugin uninstalled successfully")
  })
})

describe("useUpdatePlugin", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActiveOrganizationSafe.mockReturnValue({
      data: mockOrg,
      isPending: false,
    })
  })

  it("calls POST /organizations/:orgId/plugins/:id/update", async () => {
    mockFetchApi.mockResolvedValueOnce({ installation: mockInstallation })

    const { result } = renderHook(() => useUpdatePlugin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ installationId: "inst-1" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      "/api/organizations/org-123/plugins/inst-1/update",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    )
  })

  it("includes version in body when specified", async () => {
    mockFetchApi.mockResolvedValueOnce({ installation: mockInstallation })

    const { result } = renderHook(() => useUpdatePlugin(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ installationId: "inst-1", version: "2.0.0" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      "/api/organizations/org-123/plugins/inst-1/update",
      expect.objectContaining({
        body: JSON.stringify({ version: "2.0.0" }),
      })
    )
  })
})

describe("useUpdateInstallation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseActiveOrganizationSafe.mockReturnValue({
      data: mockOrg,
      isPending: false,
    })
  })

  it("calls PATCH /organizations/:orgId/plugins/:id", async () => {
    mockFetchApi.mockResolvedValueOnce({ installation: mockInstallation })

    const { result } = renderHook(() => useUpdateInstallation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      installationId: "inst-1",
      updates: { status: "disabled" },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      "/api/organizations/org-123/plugins/inst-1",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "disabled" }),
      })
    )
  })

  it("includes config updates in body", async () => {
    mockFetchApi.mockResolvedValueOnce({ installation: mockInstallation })

    const { result } = renderHook(() => useUpdateInstallation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      installationId: "inst-1",
      updates: { config: { setting: "value" } },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      "/api/organizations/org-123/plugins/inst-1",
      expect.objectContaining({
        body: JSON.stringify({ config: { setting: "value" } }),
      })
    )
  })

  it("includes envValues updates in body", async () => {
    mockFetchApi.mockResolvedValueOnce({ installation: mockInstallation })

    const { result } = renderHook(() => useUpdateInstallation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      installationId: "inst-1",
      updates: { envValues: { API_KEY: "new-key" } },
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockFetchApi).toHaveBeenCalledWith(
      "/api/organizations/org-123/plugins/inst-1",
      expect.objectContaining({
        body: JSON.stringify({ envValues: { API_KEY: "new-key" } }),
      })
    )
  })
})
