import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"

const mockPush = vi.fn()

const {
  mockUseInstalledPlugins,
  mockUseUpdateInstallation,
  mockUseUpdatePlugin,
  mockUseUninstallPlugin,
  mockUseActiveOrganizationSafe,
} = vi.hoisted(() => ({
  mockUseInstalledPlugins: vi.fn(),
  mockUseUpdateInstallation: vi.fn(),
  mockUseUpdatePlugin: vi.fn(),
  mockUseUninstallPlugin: vi.fn(),
  mockUseActiveOrganizationSafe: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: React.PropsWithChildren<{ href: string }>) =>
    React.createElement("a", { href, ...props }, children),
}))

vi.mock("@/hooks/use-plugin-installation", () => ({
  useInstalledPlugins: mockUseInstalledPlugins,
  useUpdateInstallation: mockUseUpdateInstallation,
  useUpdatePlugin: mockUseUpdatePlugin,
  useUninstallPlugin: mockUseUninstallPlugin,
}))

vi.mock("@/lib/auth-client", () => ({
  useActiveOrganizationSafe: mockUseActiveOrganizationSafe,
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
    size,
    className,
    render,
  }: React.PropsWithChildren<{
    onClick?: () => void
    disabled?: boolean
    variant?: string
    size?: string
    className?: string
    render?: React.ReactElement
  }>) => {
    if (render) {
      return React.cloneElement(
        render,
        { className, "data-variant": variant, "data-size": size } as Record<string, unknown>,
        children
      )
    }
    return React.createElement(
      "button",
      {
        onClick,
        disabled,
        className,
        "data-variant": variant,
        "data-size": size,
      },
      children
    )
  },
}))

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
    className,
  }: React.PropsWithChildren<{ variant?: string; className?: string }>) =>
    React.createElement(
      "span",
      { "data-testid": "badge", "data-variant": variant, className },
      children
    ),
}))

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: React.PropsWithChildren) =>
    React.createElement("div", { "data-testid": "dropdown-menu" }, children),
  DropdownMenuTrigger: ({
    children,
    render,
  }: React.PropsWithChildren<{ render?: React.ReactElement }>) =>
    React.createElement(
      "div",
      { "data-testid": "dropdown-trigger" },
      render,
      children
    ),
  DropdownMenuContent: ({
    children,
    align,
    className,
  }: React.PropsWithChildren<{ align?: string; className?: string }>) =>
    React.createElement(
      "div",
      { "data-testid": "dropdown-content", "data-align": align, className },
      children
    ),
  DropdownMenuCheckboxItem: ({
    children,
    checked,
    onCheckedChange,
  }: React.PropsWithChildren<{
    checked?: boolean
    onCheckedChange?: () => void
  }>) =>
    React.createElement(
      "button",
      {
        "data-testid": "dropdown-checkbox-item",
        "data-checked": checked,
        onClick: onCheckedChange,
      },
      children
    ),
  DropdownMenuSeparator: () =>
    React.createElement("hr", { "data-testid": "dropdown-separator" }),
  DropdownMenuLabel: ({ children }: React.PropsWithChildren) =>
    React.createElement("div", { "data-testid": "dropdown-label" }, children),
  DropdownMenuItem: ({
    children,
    onClick,
    variant,
  }: React.PropsWithChildren<{
    onClick?: () => void
    variant?: string
  }>) =>
    React.createElement(
      "button",
      {
        "data-testid": "dropdown-item",
        "data-variant": variant,
        onClick,
      },
      children
    ),
}))

vi.mock("@/components/dashboard", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: string
    description: string
    actions?: React.ReactNode
  }) =>
    React.createElement("div", { "data-testid": "page-header" }, [
      React.createElement("h1", { key: "title" }, title),
      React.createElement("p", { key: "desc" }, description),
      actions
        ? React.createElement("div", { key: "actions" }, actions)
        : null,
    ]),
  LoadingState: ({ message }: { message: string }) =>
    React.createElement(
      "div",
      { "data-testid": "loading-state" },
      message
    ),
  ErrorState: ({
    message,
    onRetry,
  }: {
    message: string
    onRetry?: () => void
  }) =>
    React.createElement("div", { "data-testid": "error-state" }, [
      React.createElement("span", { key: "msg" }, message),
      onRetry
        ? React.createElement(
            "button",
            { key: "retry", onClick: onRetry, "data-testid": "retry-button" },
            "Retry"
          )
        : null,
    ]),
}))

vi.mock("@/components/plugins/installed-plugins-list", () => ({
  InstalledPluginsList: ({
    installations,
    isLoading,
    onEnable,
    onDisable,
    onUpdate,
    onConfigure,
    onUninstall,
    updatingIds,
    togglingIds,
    uninstallingIds,
    emptyStateAction,
  }: {
    installations: Array<{ id: string; plugin: { name: string }; status: string }>
    isLoading?: boolean
    onEnable?: (i: unknown) => void
    onDisable?: (i: unknown) => void
    onUpdate?: (i: unknown) => void
    onConfigure?: (i: unknown) => void
    onUninstall?: (i: unknown) => void
    updatingIds?: Set<string>
    togglingIds?: Set<string>
    uninstallingIds?: Set<string>
    emptyStateAction?: { label: string; href: string }
  }) => {
    if (isLoading) {
      return React.createElement(
        "div",
        { "data-testid": "plugins-list-loading" },
        "Loading..."
      )
    }
    if (installations.length === 0) {
      return React.createElement(
        "div",
        { "data-testid": "empty-state" },
        emptyStateAction
          ? React.createElement(
              "a",
              {
                href: emptyStateAction.href,
                "data-testid": "browse-marketplace-link",
              },
              emptyStateAction.label
            )
          : "No plugins installed"
      )
    }
    return React.createElement(
      "div",
      { "data-testid": "installed-plugins-list" },
      installations.map((installation) =>
        React.createElement(
          "div",
          {
            key: installation.id,
            "data-testid": `plugin-card-${installation.id}`,
          },
          [
            React.createElement(
              "span",
              { key: "name" },
              installation.plugin.name
            ),
            React.createElement(
              "span",
              { key: "status", "data-testid": "plugin-status" },
              installation.status
            ),
            onConfigure
              ? React.createElement(
                  "button",
                  {
                    key: "configure",
                    "data-testid": "configure-button",
                    onClick: () => onConfigure(installation),
                  },
                  "Configure"
                )
              : null,
            onEnable && installation.status === "disabled"
              ? React.createElement(
                  "button",
                  {
                    key: "enable",
                    "data-testid": "enable-button",
                    onClick: () => onEnable(installation),
                    disabled: togglingIds?.has(installation.id),
                  },
                  togglingIds?.has(installation.id) ? "Enabling..." : "Enable"
                )
              : null,
            onDisable && installation.status === "active"
              ? React.createElement(
                  "button",
                  {
                    key: "disable",
                    "data-testid": "disable-button",
                    onClick: () => onDisable(installation),
                    disabled: togglingIds?.has(installation.id),
                  },
                  togglingIds?.has(installation.id) ? "Disabling..." : "Disable"
                )
              : null,
            onUpdate
              ? React.createElement(
                  "button",
                  {
                    key: "update",
                    "data-testid": "update-button",
                    onClick: () => onUpdate(installation),
                    disabled: updatingIds?.has(installation.id),
                  },
                  updatingIds?.has(installation.id) ? "Updating..." : "Update"
                )
              : null,
            onUninstall
              ? React.createElement(
                  "button",
                  {
                    key: "uninstall",
                    "data-testid": "uninstall-button",
                    onClick: () => onUninstall(installation),
                    disabled: uninstallingIds?.has(installation.id),
                  },
                  uninstallingIds?.has(installation.id)
                    ? "Uninstalling..."
                    : "Uninstall"
                )
              : null,
          ]
        )
      )
    )
  },
}))

vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>()
  const createIcon = (name: string) => () =>
    React.createElement("span", { "data-testid": `${name.toLowerCase()}-icon` })
  return {
    ...actual,
    Store: createIcon("store"),
    Server: createIcon("server"),
    Sparkles: createIcon("sparkles"),
    Webhook: createIcon("webhook"),
    Terminal: createIcon("terminal"),
    Bot: createIcon("bot"),
    Settings: createIcon("settings"),
    Check: createIcon("check"),
    X: createIcon("x"),
    ChevronDown: createIcon("chevron-down"),
    Loader2: createIcon("loader"),
    ArrowDownAZ: createIcon("arrow-down-az"),
    CalendarArrowDown: createIcon("calendar-arrow-down"),
    Puzzle: createIcon("puzzle"),
  }
})

vi.mock("@/lib/utils", () => ({
  cn: (...inputs: (string | undefined | null | boolean | Record<string, boolean>)[]) =>
    inputs.filter((input) => typeof input === "string").join(" "),
}))

import InstalledPluginsPage from "../page"
import type { PluginInstallation } from "@/types/marketplace"

function createMockInstallation(
  overrides: Partial<PluginInstallation> = {}
): PluginInstallation {
  const id = overrides.id || `installation-${Math.random().toString(36).slice(2)}`
  return {
    id,
    organizationId: "org-1",
    pluginId: `plugin-${id}`,
    pluginVersionId: "version-1",
    installedBy: "user-1",
    scope: "organization",
    status: "active",
    config: null,
    installedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    plugin: {
      id: `plugin-${id}`,
      slug: "test-plugin",
      name: "Test Plugin",
      marketplace: {
        id: "marketplace-1",
        slug: "official",
        name: "Official Marketplace",
      },
    },
    version: {
      id: "version-1",
      version: "1.0.0",
    },
    ...overrides,
  }
}

function setupDefaultMocks(
  options: {
    installations?: PluginInstallation[]
    isLoading?: boolean
    isError?: boolean
    error?: Error | null
    isOrgPending?: boolean
    activeOrg?: { id: string; name: string } | null
  } = {}
) {
  const {
    installations = [createMockInstallation()],
    isLoading = false,
    isError = false,
    error = null,
    isOrgPending = false,
    activeOrg = { id: "org-1", name: "Test Organization" },
  } = options

  mockUseInstalledPlugins.mockReturnValue({
    data: isLoading || isError ? undefined : { installations, total: installations.length },
    isLoading,
    isError,
    error,
    refetch: vi.fn(),
  })

  mockUseUpdateInstallation.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  })

  mockUseUpdatePlugin.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  })

  mockUseUninstallPlugin.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  })

  mockUseActiveOrganizationSafe.mockReturnValue({
    data: activeOrg,
    isPending: isOrgPending,
  })
}

describe("InstalledPluginsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("Display", () => {
    it("renders page header with title and description", () => {
      render(<InstalledPluginsPage />)

      expect(screen.getByText("Installed Plugins")).toBeInTheDocument()
      expect(
        screen.getByText("Manage plugins installed in your organization")
      ).toBeInTheDocument()
    })

    it("fetches installed plugins for current org", () => {
      setupDefaultMocks({
        installations: [
          createMockInstallation({ id: "1" }),
          createMockInstallation({ id: "2" }),
        ],
      })

      render(<InstalledPluginsPage />)

      expect(mockUseInstalledPlugins).toHaveBeenCalled()
    })

    it("displays plugin cards with status", () => {
      const installations = [
        createMockInstallation({
          id: "1",
          status: "active",
          plugin: {
            id: "plugin-1",
            slug: "plugin-one",
            name: "Plugin One",
            marketplace: { id: "m1", slug: "official", name: "Official" },
          },
        }),
        createMockInstallation({
          id: "2",
          status: "disabled",
          plugin: {
            id: "plugin-2",
            slug: "plugin-two",
            name: "Plugin Two",
            marketplace: { id: "m1", slug: "official", name: "Official" },
          },
        }),
      ]
      setupDefaultMocks({ installations })

      render(<InstalledPluginsPage />)

      expect(screen.getByText("Plugin One")).toBeInTheDocument()
      expect(screen.getByText("Plugin Two")).toBeInTheDocument()
      expect(screen.getByTestId("plugin-card-1")).toBeInTheDocument()
      expect(screen.getByTestId("plugin-card-2")).toBeInTheDocument()
    })

    it("shows Browse Marketplace link when no plugins installed", () => {
      setupDefaultMocks({ installations: [] })

      render(<InstalledPluginsPage />)

      const link = screen.getByTestId("browse-marketplace-link")
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute("href", "/dashboard/marketplace")
      expect(link).toHaveTextContent("Browse Marketplace")
    })

    it("shows Browse Marketplace button in header", () => {
      render(<InstalledPluginsPage />)

      const link = screen.getByRole("link", { name: /browse marketplace/i })
      expect(link).toHaveAttribute("href", "/dashboard/marketplace")
    })

    it("groups plugins by component type in tabs", () => {
      render(<InstalledPluginsPage />)

      expect(screen.getByText("All")).toBeInTheDocument()
      expect(screen.getByText("MCP Servers")).toBeInTheDocument()
      expect(screen.getByText("Skills")).toBeInTheDocument()
      expect(screen.getByText("Hooks")).toBeInTheDocument()
      expect(screen.getByText("Commands")).toBeInTheDocument()
      expect(screen.getByText("Agents")).toBeInTheDocument()
    })

    it("shows loading state while org is loading", () => {
      setupDefaultMocks({ isOrgPending: true })

      render(<InstalledPluginsPage />)

      expect(screen.getByTestId("loading-state")).toBeInTheDocument()
      expect(screen.getByText("Loading installed plugins...")).toBeInTheDocument()
    })

    it("shows loading state while plugins are loading", () => {
      setupDefaultMocks({ isLoading: true })

      render(<InstalledPluginsPage />)

      expect(screen.getByTestId("loading-state")).toBeInTheDocument()
    })

    it("shows error state when API fails", () => {
      setupDefaultMocks({
        isError: true,
        error: new Error("Failed to fetch plugins"),
      })

      render(<InstalledPluginsPage />)

      expect(screen.getByTestId("error-state")).toBeInTheDocument()
      expect(screen.getByText("Failed to fetch plugins")).toBeInTheDocument()
    })

    it("shows retry button on error state", async () => {
      const mockRefetch = vi.fn()
      mockUseInstalledPlugins.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("Network error"),
        refetch: mockRefetch,
      })
      mockUseActiveOrganizationSafe.mockReturnValue({
        data: { id: "org-1", name: "Test Org" },
        isPending: false,
      })

      render(<InstalledPluginsPage />)

      const retryButton = screen.getByTestId("retry-button")
      expect(retryButton).toBeInTheDocument()

      await userEvent.click(retryButton)
      expect(mockRefetch).toHaveBeenCalled()
    })

    it("shows message when no org is selected", () => {
      setupDefaultMocks({ activeOrg: null })

      render(<InstalledPluginsPage />)

      expect(
        screen.getByText("Please select an organization to view installed plugins.")
      ).toBeInTheDocument()
    })

    it("handles org with no plugins gracefully", () => {
      setupDefaultMocks({ installations: [] })

      render(<InstalledPluginsPage />)

      expect(screen.getByTestId("empty-state")).toBeInTheDocument()
    })
  })

  describe("Filters", () => {
    it("shows status filter dropdown", () => {
      render(<InstalledPluginsPage />)

      expect(screen.getByText("Status")).toBeInTheDocument()
    })

    it("filters by status (active)", async () => {
      const user = userEvent.setup()
      render(<InstalledPluginsPage />)

      const activeCheckbox = screen.getByText("Active")
      await user.click(activeCheckbox)

      await waitFor(() => {
        expect(mockUseInstalledPlugins).toHaveBeenCalledWith(
          expect.objectContaining({ status: "active" })
        )
      })
    })

    it("filters by status (disabled)", async () => {
      const user = userEvent.setup()
      render(<InstalledPluginsPage />)

      const disabledCheckbox = screen.getByText("Disabled")
      await user.click(disabledCheckbox)

      await waitFor(() => {
        expect(mockUseInstalledPlugins).toHaveBeenCalledWith(
          expect.objectContaining({ status: "disabled" })
        )
      })
    })

    it("filters by status (pending_update)", async () => {
      const user = userEvent.setup()
      render(<InstalledPluginsPage />)

      const updateCheckbox = screen.getByText("Update Available")
      await user.click(updateCheckbox)

      await waitFor(() => {
        expect(mockUseInstalledPlugins).toHaveBeenCalledWith(
          expect.objectContaining({ status: "pending_update" })
        )
      })
    })

    it("resets status filter to all", async () => {
      const user = userEvent.setup()
      render(<InstalledPluginsPage />)

      const activeCheckbox = screen.getByText("Active")
      await user.click(activeCheckbox)

      const allCheckbox = screen.getByText("All Statuses")
      await user.click(allCheckbox)

      await waitFor(() => {
        const lastCall =
          mockUseInstalledPlugins.mock.calls[
            mockUseInstalledPlugins.mock.calls.length - 1
          ]
        expect(lastCall?.[0]).not.toHaveProperty("status")
      })
    })

    it("filters by component type (mcp_server)", async () => {
      const user = userEvent.setup()
      render(<InstalledPluginsPage />)

      const mcpTab = screen.getByText("MCP Servers")
      await user.click(mcpTab)

      await waitFor(() => {
        expect(mockUseInstalledPlugins).toHaveBeenCalledWith(
          expect.objectContaining({ componentType: "mcp_server" })
        )
      })
    })

    it("filters by component type (skill)", async () => {
      const user = userEvent.setup()
      render(<InstalledPluginsPage />)

      const skillTab = screen.getByText("Skills")
      await user.click(skillTab)

      await waitFor(() => {
        expect(mockUseInstalledPlugins).toHaveBeenCalledWith(
          expect.objectContaining({ componentType: "skill" })
        )
      })
    })

    it("filters by component type (hook)", async () => {
      const user = userEvent.setup()
      render(<InstalledPluginsPage />)

      const hookTab = screen.getByText("Hooks")
      await user.click(hookTab)

      await waitFor(() => {
        expect(mockUseInstalledPlugins).toHaveBeenCalledWith(
          expect.objectContaining({ componentType: "hook" })
        )
      })
    })

    it("filters by component type (command)", async () => {
      const user = userEvent.setup()
      render(<InstalledPluginsPage />)

      const commandTab = screen.getByText("Commands")
      await user.click(commandTab)

      await waitFor(() => {
        expect(mockUseInstalledPlugins).toHaveBeenCalledWith(
          expect.objectContaining({ componentType: "command" })
        )
      })
    })

    it("filters by component type (agent)", async () => {
      const user = userEvent.setup()
      render(<InstalledPluginsPage />)

      const agentTab = screen.getByText("Agents")
      await user.click(agentTab)

      await waitFor(() => {
        expect(mockUseInstalledPlugins).toHaveBeenCalledWith(
          expect.objectContaining({ componentType: "agent" })
        )
      })
    })

    it("shows all types when All tab is selected", async () => {
      const user = userEvent.setup()
      render(<InstalledPluginsPage />)

      const mcpTab = screen.getByText("MCP Servers")
      await user.click(mcpTab)

      const allTab = screen.getByText("All")
      await user.click(allTab)

      await waitFor(() => {
        const lastCall =
          mockUseInstalledPlugins.mock.calls[
            mockUseInstalledPlugins.mock.calls.length - 1
          ]
        expect(lastCall?.[0]).not.toHaveProperty("componentType")
      })
    })

    it("shows active filter count badge", async () => {
      const user = userEvent.setup()
      render(<InstalledPluginsPage />)

      const activeCheckbox = screen.getByText("Active")
      await user.click(activeCheckbox)

      await waitFor(() => {
        const badges = screen.getAllByTestId("badge")
        const countBadge = badges.find((badge) => badge.textContent === "1")
        expect(countBadge).toBeInTheDocument()
      })
    })

    it("combines status and component type filters", async () => {
      const user = userEvent.setup()
      render(<InstalledPluginsPage />)

      const mcpTab = screen.getByText("MCP Servers")
      await user.click(mcpTab)

      const activeCheckbox = screen.getByText("Active")
      await user.click(activeCheckbox)

      await waitFor(() => {
        expect(mockUseInstalledPlugins).toHaveBeenCalledWith(
          expect.objectContaining({
            componentType: "mcp_server",
            status: "active",
          })
        )
      })
    })
  })

  describe("Actions", () => {
    it("navigates to configure page on Configure click", async () => {
      const user = userEvent.setup()
      const installation = createMockInstallation({ id: "install-1" })
      setupDefaultMocks({ installations: [installation] })

      render(<InstalledPluginsPage />)

      const configureButton = screen.getByTestId("configure-button")
      await user.click(configureButton)

      expect(mockPush).toHaveBeenCalledWith(
        "/dashboard/plugins/install-1/configure"
      )
    })

    it("calls update mutation when Update is clicked", async () => {
      const user = userEvent.setup()
      const mockUpdateMutateAsync = vi.fn().mockResolvedValue({})

      const installation = createMockInstallation({ id: "install-1" })

      mockUseInstalledPlugins.mockReturnValue({
        data: { installations: [installation], total: 1 },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      mockUseUpdateInstallation.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      })

      mockUseUpdatePlugin.mockReturnValue({
        mutateAsync: mockUpdateMutateAsync,
        isPending: false,
      })

      mockUseUninstallPlugin.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      })

      mockUseActiveOrganizationSafe.mockReturnValue({
        data: { id: "org-1", name: "Test Organization" },
        isPending: false,
      })

      render(<InstalledPluginsPage />)

      const updateButton = screen.getByTestId("update-button")
      await user.click(updateButton)

      await waitFor(() => {
        expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
          installationId: "install-1",
        })
      })
    })

    it("calls uninstall mutation when Uninstall is clicked", async () => {
      const user = userEvent.setup()
      const mockUninstallMutateAsync = vi.fn().mockResolvedValue({})

      const installation = createMockInstallation({ id: "install-1" })

      mockUseInstalledPlugins.mockReturnValue({
        data: { installations: [installation], total: 1 },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      mockUseUpdateInstallation.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      })

      mockUseUpdatePlugin.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      })

      mockUseUninstallPlugin.mockReturnValue({
        mutateAsync: mockUninstallMutateAsync,
        isPending: false,
      })

      mockUseActiveOrganizationSafe.mockReturnValue({
        data: { id: "org-1", name: "Test Organization" },
        isPending: false,
      })

      render(<InstalledPluginsPage />)

      const uninstallButton = screen.getByTestId("uninstall-button")
      await user.click(uninstallButton)

      await waitFor(() => {
        expect(mockUninstallMutateAsync).toHaveBeenCalledWith("install-1")
      })
    })

    it("enables plugin when Enable is clicked", async () => {
      const user = userEvent.setup()
      const mockUpdateInstallationMutateAsync = vi.fn().mockResolvedValue({})

      const installation = createMockInstallation({
        id: "install-1",
        status: "disabled",
      })

      mockUseInstalledPlugins.mockReturnValue({
        data: { installations: [installation], total: 1 },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      mockUseUpdateInstallation.mockReturnValue({
        mutateAsync: mockUpdateInstallationMutateAsync,
        isPending: false,
      })

      mockUseUpdatePlugin.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      })

      mockUseUninstallPlugin.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      })

      mockUseActiveOrganizationSafe.mockReturnValue({
        data: { id: "org-1", name: "Test Organization" },
        isPending: false,
      })

      render(<InstalledPluginsPage />)

      const enableButton = screen.getByTestId("enable-button")
      await user.click(enableButton)

      await waitFor(() => {
        expect(mockUpdateInstallationMutateAsync).toHaveBeenCalledWith({
          installationId: "install-1",
          updates: { status: "active" },
        })
      })
    })

    it("disables plugin when Disable is clicked", async () => {
      const user = userEvent.setup()
      const mockUpdateInstallationMutateAsync = vi.fn().mockResolvedValue({})

      const installation = createMockInstallation({
        id: "install-1",
        status: "active",
      })

      mockUseInstalledPlugins.mockReturnValue({
        data: { installations: [installation], total: 1 },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      mockUseUpdateInstallation.mockReturnValue({
        mutateAsync: mockUpdateInstallationMutateAsync,
        isPending: false,
      })

      mockUseUpdatePlugin.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      })

      mockUseUninstallPlugin.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      })

      mockUseActiveOrganizationSafe.mockReturnValue({
        data: { id: "org-1", name: "Test Organization" },
        isPending: false,
      })

      render(<InstalledPluginsPage />)

      const disableButton = screen.getByTestId("disable-button")
      await user.click(disableButton)

      await waitFor(() => {
        expect(mockUpdateInstallationMutateAsync).toHaveBeenCalledWith({
          installationId: "install-1",
          updates: { status: "disabled" },
        })
      })
    })

    it("shows updating state during update", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      let resolveUpdate: () => void
      const updatePromise = new Promise<void>((resolve) => {
        resolveUpdate = resolve
      })

      const mockMutateAsync = vi.fn().mockImplementation(() => updatePromise)
      const installation = createMockInstallation({ id: "install-1" })

      mockUseInstalledPlugins.mockReturnValue({
        data: { installations: [installation], total: 1 },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      mockUseUpdateInstallation.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      })

      mockUseUpdatePlugin.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      })

      mockUseUninstallPlugin.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      })

      mockUseActiveOrganizationSafe.mockReturnValue({
        data: { id: "org-1", name: "Test Organization" },
        isPending: false,
      })

      render(<InstalledPluginsPage />)

      const updateButton = screen.getByTestId("update-button")
      await user.click(updateButton)

      await waitFor(() => {
        expect(screen.getByText("Updating...")).toBeInTheDocument()
      })

      resolveUpdate!()
      await vi.advanceTimersByTimeAsync(100)
    })

    it("shows toggling state during enable/disable", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      let resolveToggle: () => void
      const togglePromise = new Promise<void>((resolve) => {
        resolveToggle = resolve
      })

      const mockMutateAsync = vi.fn().mockImplementation(() => togglePromise)

      const installation = createMockInstallation({
        id: "install-1",
        status: "disabled",
      })

      mockUseInstalledPlugins.mockReturnValue({
        data: { installations: [installation], total: 1 },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      mockUseUpdateInstallation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      })

      mockUseUpdatePlugin.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      })

      mockUseUninstallPlugin.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      })

      mockUseActiveOrganizationSafe.mockReturnValue({
        data: { id: "org-1", name: "Test Organization" },
        isPending: false,
      })

      render(<InstalledPluginsPage />)

      const enableButton = screen.getByTestId("enable-button")
      await user.click(enableButton)

      await waitFor(() => {
        expect(screen.getByText("Enabling...")).toBeInTheDocument()
      })

      resolveToggle!()
      await vi.advanceTimersByTimeAsync(100)
    })

    it("shows uninstalling state during uninstall", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

      let resolveUninstall: () => void
      const uninstallPromise = new Promise<void>((resolve) => {
        resolveUninstall = resolve
      })

      const mockMutateAsync = vi.fn().mockImplementation(() => uninstallPromise)

      const installation = createMockInstallation({ id: "install-1" })

      mockUseInstalledPlugins.mockReturnValue({
        data: { installations: [installation], total: 1 },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      mockUseUpdateInstallation.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      })

      mockUseUpdatePlugin.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      })

      mockUseUninstallPlugin.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      })

      mockUseActiveOrganizationSafe.mockReturnValue({
        data: { id: "org-1", name: "Test Organization" },
        isPending: false,
      })

      render(<InstalledPluginsPage />)

      const uninstallButton = screen.getByTestId("uninstall-button")
      await user.click(uninstallButton)

      await waitFor(() => {
        expect(screen.getByText("Uninstalling...")).toBeInTheDocument()
      })

      resolveUninstall!()
      await vi.advanceTimersByTimeAsync(100)
    })
  })

  describe("Edge Cases", () => {
    it("handles multiple plugins with different statuses", () => {
      const installations = [
        createMockInstallation({
          id: "1",
          status: "active",
          plugin: {
            id: "plugin-1",
            slug: "active-plugin",
            name: "Active Plugin",
            marketplace: { id: "m1", slug: "official", name: "Official" },
          },
        }),
        createMockInstallation({
          id: "2",
          status: "disabled",
          plugin: {
            id: "plugin-2",
            slug: "disabled-plugin",
            name: "Disabled Plugin",
            marketplace: { id: "m1", slug: "official", name: "Official" },
          },
        }),
        createMockInstallation({
          id: "3",
          status: "pending_update",
          plugin: {
            id: "plugin-3",
            slug: "update-plugin",
            name: "Update Available Plugin",
            marketplace: { id: "m1", slug: "official", name: "Official" },
          },
        }),
      ]
      setupDefaultMocks({ installations })

      render(<InstalledPluginsPage />)

      expect(screen.getByText("Active Plugin")).toBeInTheDocument()
      expect(screen.getByText("Disabled Plugin")).toBeInTheDocument()
      expect(screen.getByText("Update Available Plugin")).toBeInTheDocument()
    })

    it("handles error without Error instance", () => {
      mockUseInstalledPlugins.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: "Some string error",
        refetch: vi.fn(),
      })
      mockUseActiveOrganizationSafe.mockReturnValue({
        data: { id: "org-1", name: "Test Org" },
        isPending: false,
      })
      mockUseUpdateInstallation.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      })
      mockUseUpdatePlugin.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      })
      mockUseUninstallPlugin.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({}),
        isPending: false,
      })

      render(<InstalledPluginsPage />)

      expect(screen.getByTestId("error-state")).toBeInTheDocument()
      expect(screen.getByText("Failed to load plugins")).toBeInTheDocument()
    })

    it("handles undefined installations data", () => {
      mockUseInstalledPlugins.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })
      mockUseActiveOrganizationSafe.mockReturnValue({
        data: { id: "org-1", name: "Test Org" },
        isPending: false,
      })

      render(<InstalledPluginsPage />)

      expect(screen.getByTestId("empty-state")).toBeInTheDocument()
    })

    it("handles empty installations array", () => {
      setupDefaultMocks({ installations: [] })

      render(<InstalledPluginsPage />)

      expect(screen.getByTestId("empty-state")).toBeInTheDocument()
    })

    it("passes correct query params when filtering", async () => {
      const user = userEvent.setup()
      render(<InstalledPluginsPage />)

      const mcpTab = screen.getByText("MCP Servers")
      await user.click(mcpTab)

      const activeCheckbox = screen.getByText("Active")
      await user.click(activeCheckbox)

      await waitFor(() => {
        expect(mockUseInstalledPlugins).toHaveBeenLastCalledWith({
          componentType: "mcp_server",
          status: "active",
        })
      })
    })

    it("maintains filter state across re-renders", async () => {
      const user = userEvent.setup()
      const { rerender } = render(<InstalledPluginsPage />)

      const mcpTab = screen.getByText("MCP Servers")
      await user.click(mcpTab)

      rerender(<InstalledPluginsPage />)

      await waitFor(() => {
        expect(mockUseInstalledPlugins).toHaveBeenCalledWith(
          expect.objectContaining({ componentType: "mcp_server" })
        )
      })
    })
  })
})
