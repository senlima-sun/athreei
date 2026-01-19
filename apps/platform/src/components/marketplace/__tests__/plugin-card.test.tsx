import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import type {
  PluginSearchResult,
  PluginInstallation,
} from "@/types/marketplace"

const mockPush = vi.fn()

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
    React.createElement(
      "a",
      { href, "data-testid": "plugin-link", ...props },
      children
    ),
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

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    size,
    variant,
    className,
  }: React.PropsWithChildren<{
    onClick?: (e: React.MouseEvent) => void
    disabled?: boolean
    size?: string
    variant?: string
    className?: string
  }>) =>
    React.createElement(
      "button",
      {
        onClick,
        disabled,
        "data-testid": "button",
        "data-size": size,
        "data-variant": variant,
        className,
      },
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
  DropdownMenuContent: ({ children }: React.PropsWithChildren) =>
    React.createElement("div", { "data-testid": "dropdown-content" }, children),
  DropdownMenuItem: ({
    children,
    onClick,
    variant,
  }: React.PropsWithChildren<{
    onClick?: (e: React.MouseEvent) => void
    variant?: string
  }>) =>
    React.createElement(
      "button",
      {
        onClick,
        "data-testid": "dropdown-item",
        "data-variant": variant,
      },
      children
    ),
  DropdownMenuSeparator: () =>
    React.createElement("hr", { "data-testid": "dropdown-separator" }),
}))

vi.mock("../plugin-icon", () => ({
  PluginIcon: ({
    iconUrl,
    name,
    size,
  }: {
    iconUrl: string | null
    name: string
    size?: string
  }) =>
    React.createElement("div", {
      "data-testid": "plugin-icon",
      "data-icon-url": iconUrl || "fallback",
      "data-name": name,
      "data-size": size,
    }),
}))

vi.mock("../verified-badge", () => ({
  VerifiedBadge: () =>
    React.createElement(
      "span",
      { "data-testid": "verified-badge" },
      "Verified"
    ),
}))

import { PluginCard } from "../plugin-card"

function createMockPlugin(
  overrides: Partial<PluginSearchResult> = {}
): PluginSearchResult {
  return {
    id: "plugin-1",
    slug: "test-plugin",
    name: "Test Plugin",
    description: "A test plugin for testing purposes",
    category: "Development",
    tags: ["test", "development", "utilities"],
    author: "Test Author",
    iconUrl: "https://example.com/icon.png",
    isVerified: false,
    isFeatured: false,
    downloadCount: 1500,
    marketplace: {
      id: "marketplace-1",
      slug: "default",
      name: "Default Marketplace",
    },
    latestVersion: {
      id: "version-1",
      version: "1.0.0",
      publishedAt: "2024-01-01T00:00:00Z",
    },
    ...overrides,
  }
}

function createMockInstallation(
  overrides: Partial<PluginInstallation> = {}
): PluginInstallation {
  return {
    id: "installation-1",
    organizationId: "org-1",
    pluginId: "plugin-1",
    pluginVersionId: "version-1",
    installedBy: "user-1",
    scope: "organization",
    status: "active",
    config: null,
    installedAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    plugin: {
      id: "plugin-1",
      slug: "test-plugin",
      name: "Test Plugin",
      marketplace: {
        id: "marketplace-1",
        slug: "default",
        name: "Default Marketplace",
      },
    },
    version: {
      id: "version-1",
      version: "1.0.0",
    },
    ...overrides,
  }
}

describe("PluginCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Display", () => {
    it("displays plugin name and author", () => {
      const plugin = createMockPlugin({
        name: "My Awesome Plugin",
        author: "John Doe",
      })

      render(<PluginCard plugin={plugin} />)

      expect(screen.getByText("My Awesome Plugin")).toBeInTheDocument()
      expect(screen.getByText("by John Doe")).toBeInTheDocument()
    })

    it("displays plugin description (truncated to 2 lines via CSS)", () => {
      const plugin = createMockPlugin({
        description:
          "This is a very long description that should be truncated. It contains multiple sentences to demonstrate the truncation behavior that should limit the display to two lines only.",
      })

      render(<PluginCard plugin={plugin} />)

      const description = screen.getByText(/This is a very long description/)
      expect(description).toBeInTheDocument()
      expect(description).toHaveClass("line-clamp-2")
    })

    it("displays category badge", () => {
      const plugin = createMockPlugin({ category: "Code Intelligence" })

      render(<PluginCard plugin={plugin} />)

      const badges = screen.getAllByTestId("badge")
      const categoryBadge = badges.find(
        (badge) => badge.textContent === "Code Intelligence"
      )
      expect(categoryBadge).toBeInTheDocument()
    })

    it("displays up to 3 tags", () => {
      const plugin = createMockPlugin({
        tags: ["tag1", "tag2", "tag3", "tag4", "tag5"],
      })

      render(<PluginCard plugin={plugin} />)

      expect(screen.getByText("tag1")).toBeInTheDocument()
      expect(screen.getByText("tag2")).toBeInTheDocument()
      expect(screen.getByText("tag3")).toBeInTheDocument()
      expect(screen.queryByText("tag4")).not.toBeInTheDocument()
      expect(screen.queryByText("tag5")).not.toBeInTheDocument()
      expect(screen.getByText("+2")).toBeInTheDocument()
    })

    it("displays download count", () => {
      const plugin = createMockPlugin({ downloadCount: 1500 })

      render(<PluginCard plugin={plugin} />)

      expect(screen.getByText("1.5K")).toBeInTheDocument()
    })

    it("formats download count in millions", () => {
      const plugin = createMockPlugin({ downloadCount: 2500000 })

      render(<PluginCard plugin={plugin} />)

      expect(screen.getByText("2.5M")).toBeInTheDocument()
    })

    it("displays raw download count when under 1000", () => {
      const plugin = createMockPlugin({ downloadCount: 500 })

      render(<PluginCard plugin={plugin} />)

      expect(screen.getByText("500")).toBeInTheDocument()
    })

    it("displays verified badge when isVerified=true", () => {
      const plugin = createMockPlugin({ isVerified: true })

      render(<PluginCard plugin={plugin} />)

      expect(screen.getByTestId("verified-badge")).toBeInTheDocument()
    })

    it("does not display verified badge when isVerified=false", () => {
      const plugin = createMockPlugin({ isVerified: false })

      render(<PluginCard plugin={plugin} />)

      expect(screen.queryByTestId("verified-badge")).not.toBeInTheDocument()
    })

    it("displays featured badge when isFeatured=true", () => {
      const plugin = createMockPlugin({ isFeatured: true })

      render(<PluginCard plugin={plugin} />)

      expect(screen.getByText("Featured")).toBeInTheDocument()
    })

    it("does not display featured badge when isFeatured=false", () => {
      const plugin = createMockPlugin({ isFeatured: false })

      render(<PluginCard plugin={plugin} />)

      expect(screen.queryByText("Featured")).not.toBeInTheDocument()
    })

    it("renders fallback icon when iconUrl is null", () => {
      const plugin = createMockPlugin({ iconUrl: null })

      render(<PluginCard plugin={plugin} />)

      const icon = screen.getByTestId("plugin-icon")
      expect(icon).toHaveAttribute("data-icon-url", "fallback")
    })

    it("passes iconUrl to PluginIcon when provided", () => {
      const plugin = createMockPlugin({
        iconUrl: "https://example.com/custom-icon.png",
      })

      render(<PluginCard plugin={plugin} />)

      const icon = screen.getByTestId("plugin-icon")
      expect(icon).toHaveAttribute(
        "data-icon-url",
        "https://example.com/custom-icon.png"
      )
    })

    it("handles missing author gracefully", () => {
      const plugin = createMockPlugin({ author: null })

      render(<PluginCard plugin={plugin} />)

      expect(screen.queryByText(/^by /)).not.toBeInTheDocument()
      expect(screen.getByText(plugin.name)).toBeInTheDocument()
    })

    it("handles very long plugin name (truncates via CSS)", () => {
      const plugin = createMockPlugin({
        name: "This Is A Very Long Plugin Name That Should Be Truncated By CSS",
      })

      render(<PluginCard plugin={plugin} />)

      const nameElement = screen.getByText(
        "This Is A Very Long Plugin Name That Should Be Truncated By CSS"
      )
      expect(nameElement).toHaveClass("truncate")
    })

    it("handles plugin with no tags", () => {
      const plugin = createMockPlugin({ tags: [] })

      render(<PluginCard plugin={plugin} />)

      expect(screen.getByText(plugin.name)).toBeInTheDocument()
      const badges = screen.getAllByTestId("badge")
      const tagBadges = badges.filter(
        (badge) => badge.getAttribute("data-variant") === "secondary"
      )
      expect(tagBadges.length).toBe(0)
    })

    it("handles plugin with exactly 3 tags", () => {
      const plugin = createMockPlugin({
        tags: ["tag1", "tag2", "tag3"],
      })

      render(<PluginCard plugin={plugin} />)

      expect(screen.getByText("tag1")).toBeInTheDocument()
      expect(screen.getByText("tag2")).toBeInTheDocument()
      expect(screen.getByText("tag3")).toBeInTheDocument()
      expect(screen.queryByText(/^\+/)).not.toBeInTheDocument()
    })

    it("handles plugin with null description", () => {
      const plugin = createMockPlugin({ description: null })

      render(<PluginCard plugin={plugin} />)

      expect(screen.getByText(plugin.name)).toBeInTheDocument()
    })

    it("handles plugin with null category", () => {
      const plugin = createMockPlugin({ category: null })

      render(<PluginCard plugin={plugin} />)

      expect(screen.getByText(plugin.name)).toBeInTheDocument()
    })
  })

  describe("Install State", () => {
    it("shows Install button when not installed", () => {
      const plugin = createMockPlugin()
      const onInstall = vi.fn()

      render(<PluginCard plugin={plugin} onInstall={onInstall} />)

      const installButton = screen.getByRole("button", { name: /install/i })
      expect(installButton).toBeInTheDocument()
      expect(installButton).not.toBeDisabled()
    })

    it("shows Installed dropdown when installed", () => {
      const plugin = createMockPlugin()
      const installation = createMockInstallation()

      render(<PluginCard plugin={plugin} installation={installation} />)

      expect(screen.getByTestId("dropdown-menu")).toBeInTheDocument()
      expect(screen.getByText("Installed")).toBeInTheDocument()
    })

    it("shows Installing... text when isInstalling=true", () => {
      const plugin = createMockPlugin()
      const onInstall = vi.fn()

      render(
        <PluginCard plugin={plugin} onInstall={onInstall} isInstalling={true} />
      )

      expect(screen.getByText("Installing...")).toBeInTheDocument()
    })

    it("disables install button when isInstalling=true", () => {
      const plugin = createMockPlugin()
      const onInstall = vi.fn()

      render(
        <PluginCard plugin={plugin} onInstall={onInstall} isInstalling={true} />
      )

      const installButton = screen.getByRole("button", { name: /installing/i })
      expect(installButton).toBeDisabled()
    })

    it("shows Configure option in dropdown when onConfigure is provided", () => {
      const plugin = createMockPlugin()
      const installation = createMockInstallation()
      const onConfigure = vi.fn()

      render(
        <PluginCard
          plugin={plugin}
          installation={installation}
          onConfigure={onConfigure}
        />
      )

      expect(screen.getByText("Configure")).toBeInTheDocument()
    })

    it("shows Uninstall option in dropdown when onUninstall is provided", () => {
      const plugin = createMockPlugin()
      const installation = createMockInstallation()
      const onUninstall = vi.fn()

      render(
        <PluginCard
          plugin={plugin}
          installation={installation}
          onUninstall={onUninstall}
        />
      )

      expect(screen.getByText("Uninstall")).toBeInTheDocument()
    })
  })

  describe("Navigation", () => {
    it("navigates to plugin detail page on card click via Link", () => {
      const plugin = createMockPlugin({
        slug: "my-plugin",
        marketplace: {
          id: "m-1",
          slug: "community",
          name: "Community",
        },
      })

      render(<PluginCard plugin={plugin} />)

      const link = screen.getByTestId("plugin-link")
      expect(link).toHaveAttribute("href", "/marketplace/community/my-plugin")
    })

    it("prevents navigation when clicking install button", () => {
      const plugin = createMockPlugin()
      const onInstall = vi.fn()

      render(<PluginCard plugin={plugin} onInstall={onInstall} />)

      const installButton = screen.getByRole("button", { name: /install/i })
      fireEvent.click(installButton)

      expect(onInstall).toHaveBeenCalledWith(plugin)
    })

    it("calls onInstall with the plugin when install button is clicked", () => {
      const plugin = createMockPlugin()
      const onInstall = vi.fn()

      render(<PluginCard plugin={plugin} onInstall={onInstall} />)

      const installButton = screen.getByRole("button", { name: /install/i })
      fireEvent.click(installButton)

      expect(onInstall).toHaveBeenCalledTimes(1)
      expect(onInstall).toHaveBeenCalledWith(plugin)
    })

    it("calls onConfigure with the installation when configure is clicked", () => {
      const plugin = createMockPlugin()
      const installation = createMockInstallation()
      const onConfigure = vi.fn()

      render(
        <PluginCard
          plugin={plugin}
          installation={installation}
          onConfigure={onConfigure}
        />
      )

      const configureItem = screen.getByText("Configure")
      fireEvent.click(configureItem)

      expect(onConfigure).toHaveBeenCalledTimes(1)
      expect(onConfigure).toHaveBeenCalledWith(installation)
    })

    it("calls onUninstall with the installation when uninstall is clicked", () => {
      const plugin = createMockPlugin()
      const installation = createMockInstallation()
      const onUninstall = vi.fn()

      render(
        <PluginCard
          plugin={plugin}
          installation={installation}
          onUninstall={onUninstall}
        />
      )

      const uninstallItem = screen.getByText("Uninstall")
      fireEvent.click(uninstallItem)

      expect(onUninstall).toHaveBeenCalledTimes(1)
      expect(onUninstall).toHaveBeenCalledWith(installation)
    })
  })

  describe("Edge Cases", () => {
    it("handles plugin with empty string author", () => {
      const plugin = createMockPlugin({ author: "" })

      render(<PluginCard plugin={plugin} />)

      expect(screen.queryByText(/^by\s*$/)).not.toBeInTheDocument()
    })

    it("handles plugin with empty string description", () => {
      const plugin = createMockPlugin({ description: "" })

      render(<PluginCard plugin={plugin} />)

      expect(screen.getByText(plugin.name)).toBeInTheDocument()
    })

    it("handles plugin with special characters in name", () => {
      const plugin = createMockPlugin({
        name: "Plugin <script>alert('xss')</script>",
      })

      render(<PluginCard plugin={plugin} />)

      expect(
        screen.getByText("Plugin <script>alert('xss')</script>")
      ).toBeInTheDocument()
    })

    it("does not call onInstall if callback is undefined", () => {
      const plugin = createMockPlugin()

      render(<PluginCard plugin={plugin} />)

      const installButton = screen.getByRole("button", { name: /install/i })
      fireEvent.click(installButton)
    })

    it("renders correctly when installation is explicitly null", () => {
      const plugin = createMockPlugin()

      render(<PluginCard plugin={plugin} installation={null} />)

      expect(
        screen.getByRole("button", { name: /install/i })
      ).toBeInTheDocument()
    })

    it("renders correctly when installation is undefined", () => {
      const plugin = createMockPlugin()

      render(<PluginCard plugin={plugin} installation={undefined} />)

      expect(
        screen.getByRole("button", { name: /install/i })
      ).toBeInTheDocument()
    })

    it("handles zero download count", () => {
      const plugin = createMockPlugin({ downloadCount: 0 })

      render(<PluginCard plugin={plugin} />)

      expect(screen.getByText("0")).toBeInTheDocument()
    })

    it("handles both verified and featured badges simultaneously", () => {
      const plugin = createMockPlugin({
        isVerified: true,
        isFeatured: true,
      })

      render(<PluginCard plugin={plugin} />)

      expect(screen.getByTestId("verified-badge")).toBeInTheDocument()
      expect(screen.getByText("Featured")).toBeInTheDocument()
    })
  })
})
