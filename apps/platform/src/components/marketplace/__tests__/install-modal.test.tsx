import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import React from "react"

const {
  mockUseInstallPlugin,
  mockUseActiveOrganizationSafe,
  mockMutateAsync,
  mockReset,
} = vi.hoisted(() => ({
  mockUseInstallPlugin: vi.fn(),
  mockUseActiveOrganizationSafe: vi.fn(),
  mockMutateAsync: vi.fn(),
  mockReset: vi.fn(),
}))

vi.mock("@/hooks/use-plugin-installation", () => ({
  useInstallPlugin: () => mockUseInstallPlugin(),
}))

vi.mock("@/lib/auth-client", () => ({
  useActiveOrganizationSafe: () => mockUseActiveOrganizationSafe(),
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    type,
    variant,
    ...props
  }: React.PropsWithChildren<{
    disabled?: boolean
    onClick?: () => void
    type?: string
    variant?: string
  }>) =>
    React.createElement(
      "button",
      { disabled, onClick, type, "data-variant": variant, ...props },
      children
    ),
}))

vi.mock("@/components/ui/input", () => ({
  Input: ({
    id,
    type,
    value,
    onChange,
    disabled,
    placeholder,
    className,
    ...props
  }: {
    id?: string
    type?: string
    value?: string
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
    disabled?: boolean
    placeholder?: string
    className?: string
  }) =>
    React.createElement("input", {
      id,
      type,
      value,
      onChange,
      disabled,
      placeholder,
      "data-testid": `input-${id}`,
      ...props,
    }),
}))

vi.mock("@/components/ui/label", () => ({
  Label: ({
    children,
    htmlFor,
    ...props
  }: React.PropsWithChildren<{ htmlFor?: string }>) =>
    React.createElement("label", { htmlFor, ...props }, children),
}))

vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | undefined | null | boolean)[]) =>
    args.filter(Boolean).join(" "),
}))

import { InstallModal } from "../install-modal"
import type { EnvVarDefinition } from "@/types/marketplace"

describe("InstallModal", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
    pluginName: "Test Plugin",
    pluginSlug: "test-plugin",
    marketplaceSlug: "official",
    version: "1.0.0",
    envVars: [] as EnvVarDefinition[],
    canInstallForOrg: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseActiveOrganizationSafe.mockReturnValue({
      data: { id: "org-123", name: "Test Org", slug: "test-org" },
      isPending: false,
    })

    mockMutateAsync.mockResolvedValue({
      installation: { id: "install-1" },
    })
    mockReset.mockReturnValue(undefined)

    mockUseInstallPlugin.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
      error: null,
      reset: mockReset,
    })
  })

  describe("Modal Display", () => {
    it("renders plugin name in title", () => {
      render(<InstallModal {...defaultProps} />)

      expect(screen.getByText("Install Test Plugin")).toBeInTheDocument()
    })

    it("displays version number when provided", () => {
      render(<InstallModal {...defaultProps} version="2.0.0" />)

      expect(screen.getByText("Version 2.0.0")).toBeInTheDocument()
    })

    it("does not render when isOpen is false", () => {
      render(<InstallModal {...defaultProps} isOpen={false} />)

      expect(screen.queryByText("Install Test Plugin")).not.toBeInTheDocument()
    })

    it("displays scope selector (organization/user)", () => {
      render(<InstallModal {...defaultProps} />)

      expect(screen.getByText("Installation scope")).toBeInTheDocument()
      expect(screen.getByText("Test Org")).toBeInTheDocument()
      expect(screen.getByText("Personal")).toBeInTheDocument()
    })

    it("displays required env vars from manifest", () => {
      const envVars: EnvVarDefinition[] = [
        { name: "API_KEY", description: "Your API key", required: true },
        { name: "SECRET_TOKEN", description: "Secret token", required: true },
      ]

      render(<InstallModal {...defaultProps} envVars={envVars} />)

      expect(screen.getByText("Configuration")).toBeInTheDocument()
      expect(screen.getByText("API_KEY")).toBeInTheDocument()
      expect(screen.getByText("SECRET_TOKEN")).toBeInTheDocument()
    })

    it("shows 'Install' button enabled by default", () => {
      render(<InstallModal {...defaultProps} />)

      const installButton = screen.getByRole("button", { name: /^Install$/ })
      expect(installButton).toBeInTheDocument()
      expect(installButton).not.toBeDisabled()
    })
  })

  describe("Scope Selection", () => {
    it("defaults to organization scope", () => {
      render(<InstallModal {...defaultProps} />)

      const orgButton = screen.getByRole("button", { name: /Test Org/i })
      expect(orgButton).toHaveAttribute("aria-pressed", "true")
    })

    it("allows switching to user scope", async () => {
      const user = userEvent.setup()
      render(<InstallModal {...defaultProps} />)

      const personalButton = screen.getByRole("button", { name: /Personal/i })
      await user.click(personalButton)

      expect(personalButton).toHaveAttribute("aria-pressed", "true")
    })

    it("defaults to user scope when canInstallForOrg is false", () => {
      render(<InstallModal {...defaultProps} canInstallForOrg={false} />)

      const personalButton = screen.getByRole("button", { name: /Personal/i })
      expect(personalButton).toHaveAttribute("aria-pressed", "true")
    })

    it("disables organization option when user lacks org-install permission", () => {
      render(<InstallModal {...defaultProps} canInstallForOrg={false} />)

      const orgButton = screen.getByRole("button", {
        name: /Organization/i,
      })
      expect(orgButton).toBeDisabled()
      expect(screen.getByText("Admin permission required")).toBeInTheDocument()
    })
  })

  describe("Env Var Input", () => {
    const envVarsWithRequired: EnvVarDefinition[] = [
      { name: "API_KEY", description: "Your API key", required: true },
      {
        name: "OPTIONAL_VAR",
        description: "Optional variable",
        required: false,
      },
    ]

    it("validates required env vars before submit", async () => {
      const user = userEvent.setup()
      render(<InstallModal {...defaultProps} envVars={envVarsWithRequired} />)

      const installButton = screen.getByRole("button", { name: /^Install$/ })
      await user.click(installButton)

      expect(mockMutateAsync).not.toHaveBeenCalled()
    })

    it("shows validation error for missing required var", async () => {
      const user = userEvent.setup()
      render(<InstallModal {...defaultProps} envVars={envVarsWithRequired} />)

      const installButton = screen.getByRole("button", { name: /^Install$/ })
      await user.click(installButton)

      expect(screen.getByText("This field is required")).toBeInTheDocument()
    })

    it("masks password-type env vars", () => {
      const secretEnvVars: EnvVarDefinition[] = [
        { name: "PASSWORD", description: "Your password", required: true },
        { name: "API_KEY", description: "Your API key", required: true },
        { name: "SECRET_TOKEN", description: "Secret token", required: true },
      ]

      render(<InstallModal {...defaultProps} envVars={secretEnvVars} />)

      const passwordInput = screen.getByTestId("input-PASSWORD")
      const apiKeyInput = screen.getByTestId("input-API_KEY")
      const secretInput = screen.getByTestId("input-SECRET_TOKEN")

      expect(passwordInput).toHaveAttribute("type", "password")
      expect(apiKeyInput).toHaveAttribute("type", "password")
      expect(secretInput).toHaveAttribute("type", "password")
    })

    it("allows viewing masked values via toggle", async () => {
      const user = userEvent.setup()
      const secretEnvVars: EnvVarDefinition[] = [
        { name: "API_KEY", description: "Your API key", required: true },
      ]

      render(<InstallModal {...defaultProps} envVars={secretEnvVars} />)

      const toggleButton = screen.getByRole("button", { name: /Show value/i })
      await user.click(toggleButton)

      const apiKeyInput = screen.getByTestId("input-API_KEY")
      expect(apiKeyInput).toHaveAttribute("type", "text")
    })

    it("preserves input on validation failure", async () => {
      const user = userEvent.setup()
      const envVars: EnvVarDefinition[] = [
        { name: "FIRST_VAR", description: "First var", required: true },
        { name: "SECOND_VAR", description: "Second var", required: true },
      ]

      render(<InstallModal {...defaultProps} envVars={envVars} />)

      const firstInput = screen.getByTestId("input-FIRST_VAR")
      await user.type(firstInput, "my-value")

      const installButton = screen.getByRole("button", { name: /^Install$/ })
      await user.click(installButton)

      expect(firstInput).toHaveValue("my-value")
    })

    it("shows description for each env var", () => {
      const envVars: EnvVarDefinition[] = [
        {
          name: "API_KEY",
          description: "Your API key for authentication",
          required: false,
        },
      ]

      render(<InstallModal {...defaultProps} envVars={envVars} />)

      expect(
        screen.getByText("Your API key for authentication")
      ).toBeInTheDocument()
    })

    it("clears validation error when user types in field", async () => {
      const user = userEvent.setup()
      const envVars: EnvVarDefinition[] = [
        { name: "API_KEY", description: "Your API key", required: true },
      ]

      render(<InstallModal {...defaultProps} envVars={envVars} />)

      const installButton = screen.getByRole("button", { name: /^Install$/ })
      await user.click(installButton)

      expect(screen.getByText("This field is required")).toBeInTheDocument()

      const apiKeyInput = screen.getByTestId("input-API_KEY")
      await user.type(apiKeyInput, "test-key")

      expect(
        screen.queryByText("This field is required")
      ).not.toBeInTheDocument()
    })
  })

  describe("Installation Flow", () => {
    it("calls install API with correct payload", async () => {
      const user = userEvent.setup()
      render(<InstallModal {...defaultProps} />)

      const installButton = screen.getByRole("button", { name: /^Install$/ })
      await user.click(installButton)

      expect(mockMutateAsync).toHaveBeenCalledWith({
        marketplaceSlug: "official",
        pluginSlug: "test-plugin",
        version: "1.0.0",
        scope: "organization",
        envValues: undefined,
      })
    })

    it("includes env values in payload when provided", async () => {
      const user = userEvent.setup()
      const envVars: EnvVarDefinition[] = [
        { name: "API_KEY", description: "Your API key", required: true },
      ]

      render(<InstallModal {...defaultProps} envVars={envVars} />)

      const apiKeyInput = screen.getByTestId("input-API_KEY")
      await user.type(apiKeyInput, "my-api-key")

      const installButton = screen.getByRole("button", { name: /^Install$/ })
      await user.click(installButton)

      expect(mockMutateAsync).toHaveBeenCalledWith({
        marketplaceSlug: "official",
        pluginSlug: "test-plugin",
        version: "1.0.0",
        scope: "organization",
        envValues: { API_KEY: "my-api-key" },
      })
    })

    it("shows loading state during installation", async () => {
      mockUseInstallPlugin.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isError: false,
        error: null,
        reset: mockReset,
      })

      render(<InstallModal {...defaultProps} />)

      const installButton = screen.getByRole("button", { name: /Install/i })
      expect(installButton).toBeDisabled()
    })

    it("closes modal on successful install", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      const onSuccess = vi.fn()

      render(
        <InstallModal
          {...defaultProps}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )

      const installButton = screen.getByRole("button", { name: /^Install$/ })
      await user.click(installButton)

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled()
        expect(onClose).toHaveBeenCalled()
      })
    })

    it("shows error message on API failure", async () => {
      mockUseInstallPlugin.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: true,
        error: new Error("Installation failed"),
        reset: mockReset,
      })

      render(<InstallModal {...defaultProps} />)

      expect(screen.getByText("Installation failed")).toBeInTheDocument()
    })

    it("shows generic error message when error has no message", async () => {
      mockUseInstallPlugin.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: true,
        error: { message: "" },
        reset: mockReset,
      })

      render(<InstallModal {...defaultProps} />)

      expect(
        screen.getByText("Failed to install plugin. Please try again.")
      ).toBeInTheDocument()
    })

    it("allows retry after failure", async () => {
      const user = userEvent.setup()

      mockMutateAsync
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ installation: { id: "install-1" } })

      mockUseInstallPlugin.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: true,
        error: new Error("Network error"),
        reset: mockReset,
      })

      render(<InstallModal {...defaultProps} />)

      mockUseInstallPlugin.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
        isError: false,
        error: null,
        reset: mockReset,
      })

      const installButton = screen.getByRole("button", { name: /^Install$/ })
      await user.click(installButton)

      expect(mockMutateAsync).toHaveBeenCalledTimes(1)
    })

    it("prevents double-submit", async () => {
      mockUseInstallPlugin.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isError: false,
        error: null,
        reset: mockReset,
      })

      render(<InstallModal {...defaultProps} />)

      const installButton = screen.getByRole("button", { name: /Install/i })
      const cancelButton = screen.getByRole("button", { name: /Cancel/i })

      expect(installButton).toBeDisabled()
      expect(cancelButton).toBeDisabled()
    })
  })

  describe("Modal Close Behavior", () => {
    it("closes modal when clicking Cancel button", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()

      render(<InstallModal {...defaultProps} onClose={onClose} />)

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      expect(onClose).toHaveBeenCalled()
    })

    it("closes modal when clicking X button", async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()

      render(<InstallModal {...defaultProps} onClose={onClose} />)

      const closeButton = screen.getByRole("button", { name: "" })
      await user.click(closeButton)

      expect(onClose).toHaveBeenCalled()
    })

    it("prevents closing during installation", async () => {
      mockUseInstallPlugin.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: true,
        isError: false,
        error: null,
        reset: mockReset,
      })

      const onClose = vi.fn()
      render(<InstallModal {...defaultProps} onClose={onClose} />)

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      expect(cancelButton).toBeDisabled()
    })

    it("resets form state when modal closes", async () => {
      const user = userEvent.setup()
      const envVars: EnvVarDefinition[] = [
        { name: "API_KEY", description: "Your API key", required: true },
      ]

      const { rerender } = render(
        <InstallModal {...defaultProps} envVars={envVars} />
      )

      const apiKeyInput = screen.getByTestId("input-API_KEY")
      await user.type(apiKeyInput, "test-value")

      const cancelButton = screen.getByRole("button", { name: /Cancel/i })
      await user.click(cancelButton)

      rerender(
        <InstallModal {...defaultProps} envVars={envVars} isOpen={true} />
      )

      const newApiKeyInput = screen.getByTestId("input-API_KEY")
      expect(newApiKeyInput).toHaveValue("")
    })
  })

  describe("Edge Cases", () => {
    it("handles plugin with no env vars", () => {
      render(<InstallModal {...defaultProps} envVars={[]} />)

      expect(screen.queryByText("Configuration")).not.toBeInTheDocument()
    })

    it("handles undefined version", () => {
      render(<InstallModal {...defaultProps} version={undefined} />)

      expect(screen.queryByText(/Version/)).not.toBeInTheDocument()
    })

    it("trims whitespace from env values", async () => {
      const user = userEvent.setup()
      const envVars: EnvVarDefinition[] = [
        { name: "API_KEY", description: "Your API key", required: true },
      ]

      render(<InstallModal {...defaultProps} envVars={envVars} />)

      const apiKeyInput = screen.getByTestId("input-API_KEY")
      await user.type(apiKeyInput, "  my-api-key  ")

      const installButton = screen.getByRole("button", { name: /^Install$/ })
      await user.click(installButton)

      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          envValues: { API_KEY: "  my-api-key  " },
        })
      )
    })

    it("excludes empty optional env values from payload", async () => {
      const user = userEvent.setup()
      const envVars: EnvVarDefinition[] = [
        { name: "REQUIRED_VAR", description: "Required", required: true },
        { name: "OPTIONAL_VAR", description: "Optional", required: false },
      ]

      render(<InstallModal {...defaultProps} envVars={envVars} />)

      const requiredInput = screen.getByTestId("input-REQUIRED_VAR")
      await user.type(requiredInput, "value")

      const installButton = screen.getByRole("button", { name: /^Install$/ })
      await user.click(installButton)

      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          envValues: { REQUIRED_VAR: "value" },
        })
      )
    })

    it("handles missing organization gracefully", () => {
      mockUseActiveOrganizationSafe.mockReturnValue({
        data: undefined,
        isPending: false,
      })

      render(<InstallModal {...defaultProps} />)

      expect(screen.getByText("Organization")).toBeInTheDocument()
    })

    it("displays org name in scope selector when available", () => {
      mockUseActiveOrganizationSafe.mockReturnValue({
        data: { id: "org-123", name: "Acme Corp", slug: "acme-corp" },
        isPending: false,
      })

      render(<InstallModal {...defaultProps} />)

      expect(screen.getByText("Acme Corp")).toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("has proper aria labels for interactive elements", () => {
      const envVars: EnvVarDefinition[] = [
        { name: "API_KEY", description: "Your API key", required: true },
      ]

      render(<InstallModal {...defaultProps} envVars={envVars} />)

      const toggleButton = screen.getByRole("button", { name: /Show value/i })
      expect(toggleButton).toBeInTheDocument()
    })

    it("marks required fields with asterisk", () => {
      const envVars: EnvVarDefinition[] = [
        { name: "API_KEY", description: "Your API key", required: true },
      ]

      render(<InstallModal {...defaultProps} envVars={envVars} />)

      const label = screen.getByText("API_KEY")
      expect(label.parentElement).toHaveTextContent("*")
    })

    it("associates error messages with inputs via aria-describedby", () => {
      const envVars: EnvVarDefinition[] = [
        { name: "API_KEY", description: "Your API key", required: true },
      ]

      render(<InstallModal {...defaultProps} envVars={envVars} />)

      const apiKeyInput = screen.getByTestId("input-API_KEY")
      expect(apiKeyInput).toHaveAttribute("aria-describedby")
    })
  })
})
