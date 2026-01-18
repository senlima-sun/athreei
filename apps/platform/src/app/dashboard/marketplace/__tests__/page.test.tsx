import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"

const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockSearchParams = vi.fn()

const {
  mockUsePlugins,
  mockUseMarketplaces,
  mockUseUninstallPlugin,
  mockUseInstalledPlugins,
  mockUseActiveOrganizationSafe,
} = vi.hoisted(() => ({
  mockUsePlugins: vi.fn(),
  mockUseMarketplaces: vi.fn(),
  mockUseUninstallPlugin: vi.fn(),
  mockUseInstalledPlugins: vi.fn(),
  mockUseActiveOrganizationSafe: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: mockSearchParams,
    toString: () => "",
  }),
}))

vi.mock("@/hooks/use-plugins", () => ({
  usePlugins: mockUsePlugins,
}))

vi.mock("@/hooks/use-marketplaces", () => ({
  useMarketplaces: mockUseMarketplaces,
}))

vi.mock("@/hooks/use-plugin-installation", () => ({
  useUninstallPlugin: mockUseUninstallPlugin,
  useInstalledPlugins: mockUseInstalledPlugins,
}))

vi.mock("@/lib/auth-client", () => ({
  useActiveOrganizationSafe: mockUseActiveOrganizationSafe,
}))

vi.mock("@/hooks/use-debounce", () => ({
  useDebounce: <T,>(value: T) => value,
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }>) =>
    React.createElement("a", { href, ...props }, children),
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
    className,
  }: React.PropsWithChildren<{
    onClick?: () => void
    disabled?: boolean
    variant?: string
    size?: string
    className?: string
  }>) =>
    React.createElement(
      "button",
      { onClick, disabled, className, "data-variant": variant, "data-size": size },
      children
    ),
}))

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    className,
    type,
  }: {
    value?: string
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    placeholder?: string
    className?: string
    type?: string
  }) =>
    React.createElement("input", {
      value,
      onChange,
      placeholder,
      className,
      type,
      "data-testid": "search-input",
    }),
}))

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: React.PropsWithChildren<{
    value?: string
    onValueChange?: (v: string) => void
  }>) =>
    React.createElement(
      "div",
      { "data-testid": "select", "data-value": value },
      React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
              onValueChange,
              currentValue: value,
            })
          : child
      )
    ),
  SelectTrigger: ({
    children,
    className,
  }: React.PropsWithChildren<{ className?: string }>) =>
    React.createElement(
      "button",
      { "data-testid": "select-trigger", className },
      children
    ),
  SelectValue: () => React.createElement("span", { "data-testid": "select-value" }),
  SelectContent: ({
    children,
    onValueChange,
    currentValue,
  }: React.PropsWithChildren<{
    onValueChange?: (v: string) => void
    currentValue?: string
  }>) =>
    React.createElement(
      "div",
      { "data-testid": "select-content" },
      React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
              onValueChange,
              currentValue,
            })
          : child
      )
    ),
  SelectItem: ({
    children,
    value,
    onValueChange,
    currentValue,
  }: React.PropsWithChildren<{
    value: string
    onValueChange?: (v: string) => void
    currentValue?: string
  }>) =>
    React.createElement(
      "button",
      {
        "data-testid": `select-item-${value}`,
        onClick: () => onValueChange?.(value),
        "data-selected": currentValue === value,
      },
      children
    ),
}))

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
    className,
    onClick,
  }: React.PropsWithChildren<{
    variant?: string
    className?: string
    onClick?: () => void
  }>) =>
    React.createElement(
      "span",
      {
        "data-testid": "badge",
        "data-variant": variant,
        className,
        onClick,
      },
      children
    ),
}))

vi.mock("lucide-react", () => ({
  Store: () => React.createElement("span", { "data-testid": "store-icon" }),
  Package: () => React.createElement("span", { "data-testid": "package-icon" }),
  Search: () => React.createElement("span", { "data-testid": "search-icon" }),
  X: () => React.createElement("span", { "data-testid": "x-icon" }),
  Filter: () => React.createElement("span", { "data-testid": "filter-icon" }),
  Check: () => React.createElement("span", { "data-testid": "check-icon" }),
  ChevronDown: () => React.createElement("span", { "data-testid": "chevron-down-icon" }),
  ChevronUp: () => React.createElement("span", { "data-testid": "chevron-up-icon" }),
  Puzzle: () => React.createElement("span", { "data-testid": "puzzle-icon" }),
  Loader2: () => React.createElement("span", { "data-testid": "loader-icon" }),
}))

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: (string | undefined | null | boolean | Record<string, boolean>)[]) =>
    inputs
      .filter((input) => typeof input === "string")
      .join(" "),
}))

import MarketplacePage from "../page"
import type { PluginSearchResult, Marketplace } from "@/types/marketplace"

function createMockPlugin(overrides: Partial<PluginSearchResult> = {}): PluginSearchResult {
  return {
    id: `plugin-${Math.random().toString(36).slice(2)}`,
    slug: "test-plugin",
    name: "Test Plugin",
    description: "A test plugin for testing",
    category: "utilities",
    tags: ["test", "mock"],
    author: "Test Author",
    iconUrl: null,
    isVerified: false,
    isFeatured: false,
    downloadCount: 100,
    marketplace: {
      id: "marketplace-1",
      slug: "official",
      name: "Official Marketplace",
    },
    latestVersion: {
      id: "version-1",
      version: "1.0.0",
      publishedAt: new Date().toISOString(),
    },
    ...overrides,
  }
}

function createMockMarketplace(overrides: Partial<Marketplace> = {}): Marketplace {
  return {
    id: `marketplace-${Math.random().toString(36).slice(2)}`,
    slug: "official",
    name: "Official Marketplace",
    description: "The official marketplace",
    ownerType: "system",
    ownerId: null,
    sourceType: "internal",
    sourceUrl: null,
    sourceRepo: null,
    sourceRef: null,
    isPublic: true,
    isDefault: true,
    autoUpdate: true,
    lastSyncedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function setupDefaultMocks(options: {
  plugins?: PluginSearchResult[]
  marketplaces?: Marketplace[]
  isLoading?: boolean
  isError?: boolean
  error?: Error | null
} = {}) {
  const {
    plugins = [createMockPlugin()],
    marketplaces = [createMockMarketplace()],
    isLoading = false,
    isError = false,
    error = null,
  } = options

  mockUsePlugins.mockReturnValue({
    data: isLoading || isError ? undefined : {
      pages: [{ plugins, total: plugins.length, hasMore: false }],
    },
    isLoading,
    isError,
    error,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  })

  mockUseMarketplaces.mockReturnValue({
    data: { marketplaces, total: marketplaces.length },
    isLoading: false,
    isError: false,
  })

  mockUseUninstallPlugin.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  })

  mockUseInstalledPlugins.mockReturnValue({
    data: { installations: [], total: 0 },
    isLoading: false,
  })

  mockUseActiveOrganizationSafe.mockReturnValue({
    data: { id: "org-1", name: "Test Org" },
    isPending: false,
  })

  mockSearchParams.mockReturnValue(null)
}

describe("MarketplacePage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    setupDefaultMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("Initial Render", () => {
    it("renders marketplace header with title", () => {
      render(<MarketplacePage />)

      expect(screen.getByText("Marketplace")).toBeInTheDocument()
      expect(
        screen.getByText("Discover and install plugins to extend your AI capabilities")
      ).toBeInTheDocument()
    })

    it("renders search input", () => {
      render(<MarketplacePage />)

      expect(
        screen.getByPlaceholderText("Search plugins by name or description...")
      ).toBeInTheDocument()
    })

    it("renders category filter sidebar", () => {
      render(<MarketplacePage />)

      expect(screen.getByText("Filters")).toBeInTheDocument()
      expect(screen.getByText("Categories")).toBeInTheDocument()
      expect(screen.getByText("All categories")).toBeInTheDocument()
      expect(screen.getByText("Development Workflows")).toBeInTheDocument()
      expect(screen.getByText("External Integrations")).toBeInTheDocument()
      expect(screen.getByText("Code Intelligence")).toBeInTheDocument()
      expect(screen.getByText("Output Styles")).toBeInTheDocument()
      expect(screen.getByText("Utilities")).toBeInTheDocument()
    })

    it("fetches and displays plugins on mount", () => {
      const plugins = [
        createMockPlugin({ id: "1", name: "Plugin One" }),
        createMockPlugin({ id: "2", name: "Plugin Two" }),
      ]
      setupDefaultMocks({ plugins })

      render(<MarketplacePage />)

      expect(mockUsePlugins).toHaveBeenCalled()
      expect(screen.getByText("Plugin One")).toBeInTheDocument()
      expect(screen.getByText("Plugin Two")).toBeInTheDocument()
    })

    it("shows empty state when no plugins exist", () => {
      setupDefaultMocks({ plugins: [] })

      render(<MarketplacePage />)

      expect(screen.getByText("No plugins found")).toBeInTheDocument()
      expect(
        screen.getByText("Try adjusting your search or filters to find plugins.")
      ).toBeInTheDocument()
    })

    it("handles API error gracefully", () => {
      setupDefaultMocks({
        isError: true,
        error: new Error("Failed to fetch plugins"),
      })

      render(<MarketplacePage />)

      expect(screen.getByText("Failed to load plugins")).toBeInTheDocument()
      expect(screen.getByText("Failed to fetch plugins")).toBeInTheDocument()
    })

    it("shows loading state when plugins are loading", () => {
      setupDefaultMocks({ isLoading: true })

      render(<MarketplacePage />)

      expect(mockUsePlugins).toHaveBeenCalled()
    })

    it("renders installed plugins link", () => {
      render(<MarketplacePage />)

      const link = screen.getByRole("link", { name: /installed plugins/i })
      expect(link).toHaveAttribute("href", "/dashboard/plugins")
    })
  })

  describe("Search", () => {
    it("debounces search input by 300ms", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<MarketplacePage />)

      const searchInput = screen.getByTestId("search-input")
      await user.type(searchInput, "test")

      expect(mockReplace).not.toHaveBeenCalled()

      await vi.advanceTimersByTimeAsync(300)

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalled()
      })
    })

    it("updates URL with search query", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<MarketplacePage />)

      const searchInput = screen.getByTestId("search-input")
      await user.type(searchInput, "test-query")

      await vi.advanceTimersByTimeAsync(300)

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          expect.stringContaining("search=test-query"),
          expect.objectContaining({ scroll: false })
        )
      })
    })

    it("clears search when clicking clear button", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<MarketplacePage />)

      const searchInput = screen.getByTestId("search-input")
      await user.type(searchInput, "test")

      await vi.advanceTimersByTimeAsync(300)

      const clearButtons = screen.getAllByTestId("x-icon")
      const clearButton = clearButtons[0]?.closest("button")
      if (clearButton) {
        await user.click(clearButton)
      }

      await waitFor(() => {
        expect(searchInput).toHaveValue("")
      })
    })

    it('shows "No plugins found" when search matches nothing', () => {
      setupDefaultMocks({ plugins: [] })

      render(<MarketplacePage />)

      expect(screen.getByText("No plugins found")).toBeInTheDocument()
    })

    it("shows result count when search returns results", () => {
      const plugins = [
        createMockPlugin({ id: "1", name: "Plugin One" }),
        createMockPlugin({ id: "2", name: "Plugin Two" }),
        createMockPlugin({ id: "3", name: "Plugin Three" }),
      ]
      setupDefaultMocks({ plugins })

      render(<MarketplacePage />)

      expect(screen.getByText("3 plugins found")).toBeInTheDocument()
    })

    it("shows singular form for single result", () => {
      const plugins = [createMockPlugin({ id: "1", name: "Single Plugin" })]
      setupDefaultMocks({ plugins })

      render(<MarketplacePage />)

      expect(screen.getByText("1 plugin found")).toBeInTheDocument()
    })
  })

  describe("Filters", () => {
    it("filters by single category", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<MarketplacePage />)

      const utilitiesButton = screen.getByText("Utilities")
      await user.click(utilitiesButton)

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          expect.stringContaining("category=utilities"),
          expect.objectContaining({ scroll: false })
        )
      })
    })

    it('toggles "Verified only" filter', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<MarketplacePage />)

      const verifiedButton = screen.getByText("Verified only")
      await user.click(verifiedButton)

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          expect.stringContaining("verified=true"),
          expect.objectContaining({ scroll: false })
        )
      })
    })

    it("clears all filters with button", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<MarketplacePage />)

      const verifiedButton = screen.getByText("Verified only")
      await user.click(verifiedButton)

      await vi.advanceTimersByTimeAsync(100)

      const clearAllButtons = screen.getAllByText("Clear all")
      if (clearAllButtons[0]) {
        await user.click(clearAllButtons[0])
      }

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          "/dashboard/marketplace",
          expect.objectContaining({ scroll: false })
        )
      })
    })

    it("updates URL with filter params", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<MarketplacePage />)

      const codeIntelButton = screen.getByText("Code Intelligence")
      await user.click(codeIntelButton)

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          expect.stringContaining("category=code-intelligence"),
          expect.objectContaining({ scroll: false })
        )
      })
    })

    it("allows selecting and deselecting categories", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<MarketplacePage />)

      const utilitiesButton = screen.getByText("Utilities")
      await user.click(utilitiesButton)

      await vi.advanceTimersByTimeAsync(100)

      const allCategoriesButton = screen.getByText("All categories")
      await user.click(allCategoriesButton)

      await waitFor(() => {
        expect(mockReplace).toHaveBeenLastCalledWith(
          expect.not.stringContaining("category="),
          expect.objectContaining({ scroll: false })
        )
      })
    })

    it("shows clear all button only when filters are active", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<MarketplacePage />)

      expect(screen.queryByText("Clear all")).not.toBeInTheDocument()

      const verifiedButton = screen.getByText("Verified only")
      await user.click(verifiedButton)

      await waitFor(() => {
        expect(screen.getByText("Clear all")).toBeInTheDocument()
      })
    })
  })

  describe("Sorting", () => {
    it("sorts by popularity by default", () => {
      render(<MarketplacePage />)

      expect(mockUsePlugins).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "popularity" })
      )
    })

    it("sorts by recent when selected", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<MarketplacePage />)

      const recentButton = screen.getByTestId("select-item-recent")
      await user.click(recentButton)

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          expect.stringContaining("sort=recent"),
          expect.objectContaining({ scroll: false })
        )
      })
    })

    it("sorts by name when selected", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<MarketplacePage />)

      const nameButton = screen.getByTestId("select-item-name")
      await user.click(nameButton)

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          expect.stringContaining("sort=name"),
          expect.objectContaining({ scroll: false })
        )
      })
    })

    it("does not include sort param when popularity is selected", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<MarketplacePage />)

      const nameButton = screen.getByTestId("select-item-name")
      await user.click(nameButton)

      await vi.advanceTimersByTimeAsync(100)

      const popularityButton = screen.getByTestId("select-item-popularity")
      await user.click(popularityButton)

      await waitFor(() => {
        const lastCall = mockReplace.mock.calls[mockReplace.mock.calls.length - 1]
        expect(lastCall?.[0]).not.toContain("sort=")
      })
    })
  })

  describe("Marketplace Selector", () => {
    it("shows marketplace selector when multiple marketplaces exist", () => {
      const marketplaces = [
        createMockMarketplace({ id: "1", slug: "official", name: "Official" }),
        createMockMarketplace({ id: "2", slug: "community", name: "Community" }),
      ]
      setupDefaultMocks({ marketplaces })

      render(<MarketplacePage />)

      expect(screen.getByText("All marketplaces")).toBeInTheDocument()
    })

    it("does not show marketplace selector with single marketplace", () => {
      const marketplaces = [
        createMockMarketplace({ id: "1", slug: "official", name: "Official" }),
      ]
      setupDefaultMocks({ marketplaces })

      render(<MarketplacePage />)

      expect(screen.queryByText("All marketplaces")).not.toBeInTheDocument()
    })

    it("filters plugins by selected marketplace", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const marketplaces = [
        createMockMarketplace({ id: "1", slug: "official", name: "Official" }),
        createMockMarketplace({ id: "2", slug: "community", name: "Community" }),
      ]
      setupDefaultMocks({ marketplaces })

      render(<MarketplacePage />)

      const communityButton = screen.getByTestId("select-item-community")
      await user.click(communityButton)

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          expect.stringContaining("marketplace=community"),
          expect.objectContaining({ scroll: false })
        )
      })
    })
  })

  describe("URL Parameter Initialization", () => {
    it("initializes search from URL params", () => {
      mockSearchParams.mockImplementation((key: string) => {
        if (key === "search") return "initial-search"
        return null
      })

      render(<MarketplacePage />)

      const searchInput = screen.getByTestId("search-input")
      expect(searchInput).toHaveValue("initial-search")
    })

    it("initializes category from URL params", () => {
      mockSearchParams.mockImplementation((key: string) => {
        if (key === "category") return "utilities"
        return null
      })

      render(<MarketplacePage />)

      expect(mockUsePlugins).toHaveBeenCalledWith(
        expect.objectContaining({ category: "utilities" })
      )
    })

    it("initializes verified filter from URL params", () => {
      mockSearchParams.mockImplementation((key: string) => {
        if (key === "verified") return "true"
        return null
      })

      render(<MarketplacePage />)

      expect(mockUsePlugins).toHaveBeenCalledWith(
        expect.objectContaining({ isVerified: true })
      )
    })

    it("initializes sort from URL params", () => {
      mockSearchParams.mockImplementation((key: string) => {
        if (key === "sort") return "recent"
        return null
      })

      render(<MarketplacePage />)

      expect(mockUsePlugins).toHaveBeenCalledWith(
        expect.objectContaining({ sort: "recent" })
      )
    })

    it("initializes marketplace from URL params", () => {
      mockSearchParams.mockImplementation((key: string) => {
        if (key === "marketplace") return "community"
        return null
      })

      render(<MarketplacePage />)

      expect(mockUsePlugins).toHaveBeenCalledWith(
        expect.objectContaining({ marketplaceSlug: "community" })
      )
    })
  })

  describe("Plugin Installation", () => {
    it("opens install modal when install button is clicked", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const plugin = createMockPlugin({ name: "Test Plugin" })
      setupDefaultMocks({ plugins: [plugin] })

      render(<MarketplacePage />)

      const installButton = screen.getByRole("button", { name: /install/i })
      await user.click(installButton)

      await waitFor(() => {
        expect(screen.getByTestId("install-modal")).toBeInTheDocument()
      })
    })

    it("calls uninstall mutation with confirmation", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const mutateAsyncMock = vi.fn()
      mockUseUninstallPlugin.mockReturnValue({
        mutateAsync: mutateAsyncMock,
        isPending: false,
      })

      const plugin = createMockPlugin({ id: "plugin-1", name: "Test Plugin" })
      mockUseInstalledPlugins.mockReturnValue({
        data: {
          installations: [
            {
              id: "installation-1",
              pluginId: "plugin-1",
              organizationId: "org-1",
              pluginVersionId: "version-1",
              installedBy: "user-1",
              scope: "organization",
              status: "active",
              config: null,
              installedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              plugin: {
                id: "plugin-1",
                slug: "test-plugin",
                name: "Test Plugin",
                marketplace: { id: "m1", slug: "official", name: "Official" },
              },
              version: { id: "version-1", version: "1.0.0" },
            },
          ],
          total: 1,
        },
        isLoading: false,
      })
      setupDefaultMocks({ plugins: [plugin] })

      vi.spyOn(window, "confirm").mockReturnValue(true)

      render(<MarketplacePage />)

      const uninstallButton = screen.getByRole("button", { name: /uninstall/i })
      await user.click(uninstallButton)

      await waitFor(() => {
        expect(mutateAsyncMock).toHaveBeenCalledWith("installation-1")
      })
    })

    it("does not uninstall if confirmation is cancelled", async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const mutateAsyncMock = vi.fn()
      mockUseUninstallPlugin.mockReturnValue({
        mutateAsync: mutateAsyncMock,
        isPending: false,
      })

      const plugin = createMockPlugin({ id: "plugin-1", name: "Test Plugin" })
      mockUseInstalledPlugins.mockReturnValue({
        data: {
          installations: [
            {
              id: "installation-1",
              pluginId: "plugin-1",
              organizationId: "org-1",
              pluginVersionId: "version-1",
              installedBy: "user-1",
              scope: "organization",
              status: "active",
              config: null,
              installedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              plugin: {
                id: "plugin-1",
                slug: "test-plugin",
                name: "Test Plugin",
                marketplace: { id: "m1", slug: "official", name: "Official" },
              },
              version: { id: "version-1", version: "1.0.0" },
            },
          ],
          total: 1,
        },
        isLoading: false,
      })
      setupDefaultMocks({ plugins: [plugin] })

      vi.spyOn(window, "confirm").mockReturnValue(false)

      render(<MarketplacePage />)

      const uninstallButton = screen.getByRole("button", { name: /uninstall/i })
      await user.click(uninstallButton)

      expect(mutateAsyncMock).not.toHaveBeenCalled()
    })
  })

  describe("Mobile Filters", () => {
    it("renders mobile filters component", () => {
      render(<MarketplacePage />)

      const mobileFiltersSection = screen.getAllByText("Filters")
      expect(mobileFiltersSection.length).toBeGreaterThan(0)
    })
  })

  describe("Plugin Grid Integration", () => {
    it("passes correct params to usePlugins", () => {
      mockSearchParams.mockImplementation((key: string) => {
        if (key === "search") return "test"
        if (key === "category") return "utilities"
        if (key === "verified") return "true"
        if (key === "sort") return "recent"
        if (key === "marketplace") return "official"
        return null
      })

      render(<MarketplacePage />)

      expect(mockUsePlugins).toHaveBeenCalledWith({
        search: "test",
        category: "utilities",
        marketplaceSlug: "official",
        isVerified: true,
        sort: "recent",
      })
    })

    it("displays plugin cards for each plugin", () => {
      const plugins = [
        createMockPlugin({ id: "1", name: "Plugin Alpha", description: "Alpha description" }),
        createMockPlugin({ id: "2", name: "Plugin Beta", description: "Beta description" }),
        createMockPlugin({ id: "3", name: "Plugin Gamma", description: "Gamma description" }),
      ]
      setupDefaultMocks({ plugins })

      render(<MarketplacePage />)

      expect(screen.getByText("Plugin Alpha")).toBeInTheDocument()
      expect(screen.getByText("Plugin Beta")).toBeInTheDocument()
      expect(screen.getByText("Plugin Gamma")).toBeInTheDocument()
    })
  })

  describe("Edge Cases", () => {
    it("handles empty marketplace list", () => {
      setupDefaultMocks({ marketplaces: [] })

      render(<MarketplacePage />)

      expect(screen.getByText("Marketplace")).toBeInTheDocument()
      expect(screen.queryByText("All marketplaces")).not.toBeInTheDocument()
    })

    it("handles undefined plugins data", () => {
      mockUsePlugins.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        fetchNextPage: vi.fn(),
        hasNextPage: false,
        isFetchingNextPage: false,
      })

      render(<MarketplacePage />)

      expect(screen.getByText("No plugins found")).toBeInTheDocument()
    })

    it("handles error without message", () => {
      setupDefaultMocks({
        isError: true,
        error: new Error(""),
      })

      render(<MarketplacePage />)

      expect(screen.getByText("Failed to load plugins")).toBeInTheDocument()
    })
  })
})
