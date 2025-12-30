/**
 * Unit tests for ConnectionMethodSelector component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import {
  ConnectionMethodSelector,
  detectPlatform,
} from "../components/ConnectionMethodSelector"

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
}

// Mock window.open
const mockWindowOpen = vi.fn()

describe("ConnectionMethodSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set up mocks in beforeEach when window/navigator are available
    Object.defineProperty(navigator, "clipboard", {
      value: mockClipboard,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window, "open", {
      value: mockWindowOpen,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("rendering", () => {
    it("renders the title and description", () => {
      render(<ConnectionMethodSelector />)

      expect(screen.getByText("Choose your connection method:")).toBeInTheDocument()
      expect(
        screen.getByText("Select how you want to connect your AI apps to athreei.")
      ).toBeInTheDocument()
    })

    it("renders both connection method cards", () => {
      render(<ConnectionMethodSelector />)

      expect(screen.getByText("Local Gateway")).toBeInTheDocument()
      expect(screen.getByText("Cloud Gateway")).toBeInTheDocument()
    })

    it("shows recommended badge on local gateway", () => {
      render(<ConnectionMethodSelector />)

      expect(screen.getByText("Recommended")).toBeInTheDocument()
    })

    it("renders local gateway pros and cons", () => {
      render(<ConnectionMethodSelector />)

      expect(screen.getByText("Data stays on your machine")).toBeInTheDocument()
      expect(screen.getByText("Supports self-hosted MCPs")).toBeInTheDocument()
      expect(screen.getByText("Lower latency")).toBeInTheDocument()
      expect(screen.getByText("Requires installation")).toBeInTheDocument()
    })

    it("renders cloud gateway pros and cons", () => {
      render(<ConnectionMethodSelector />)

      expect(screen.getByText("No installation required")).toBeInTheDocument()
      expect(screen.getByText("Works from any device")).toBeInTheDocument()
      expect(screen.getByText("Always up-to-date")).toBeInTheDocument()
      expect(screen.getByText("Data passes through cloud")).toBeInTheDocument()
      expect(screen.getByText("Cannot use local MCPs")).toBeInTheDocument()
    })

    it("renders download button for local gateway", () => {
      render(<ConnectionMethodSelector />)

      // Find the button within the local gateway card
      const localCard = screen.getByText("Local Gateway").closest("[data-slot='card']")
      const downloadButton = localCard!.querySelector("button[class*='flex-1']")
      expect(downloadButton).toBeInTheDocument()
      expect(downloadButton).toHaveTextContent(/download for/i)
    })

    it("renders SSE URL button for cloud gateway", () => {
      render(<ConnectionMethodSelector />)

      // Find the button within the cloud gateway card
      const cloudCard = screen.getByText("Cloud Gateway").closest("[data-slot='card']")
      const sseButton = cloudCard!.querySelector("button")
      expect(sseButton).toBeInTheDocument()
      expect(sseButton).toHaveTextContent(/get sse url/i)
    })

    it("displays the default SSE URL", () => {
      render(<ConnectionMethodSelector />)

      expect(screen.getByText("https://gateway.athreei.com/sse")).toBeInTheDocument()
    })

    it("displays a custom SSE URL when provided", () => {
      const customUrl = "https://custom.example.com/sse"
      render(<ConnectionMethodSelector sseUrl={customUrl} />)

      expect(screen.getByText(customUrl)).toBeInTheDocument()
    })
  })

  describe("selection", () => {
    it("calls onMethodSelect when local gateway is clicked", () => {
      const onMethodSelect = vi.fn()
      render(<ConnectionMethodSelector onMethodSelect={onMethodSelect} />)

      const localCard = screen.getByText("Local Gateway").closest("[data-slot='card']")
      fireEvent.click(localCard!)

      expect(onMethodSelect).toHaveBeenCalledWith("local")
    })

    it("calls onMethodSelect when cloud gateway is clicked", () => {
      const onMethodSelect = vi.fn()
      render(<ConnectionMethodSelector onMethodSelect={onMethodSelect} />)

      const cloudCard = screen.getByText("Cloud Gateway").closest("[data-slot='card']")
      fireEvent.click(cloudCard!)

      expect(onMethodSelect).toHaveBeenCalledWith("cloud")
    })

    it("highlights local gateway when selected", () => {
      render(<ConnectionMethodSelector selectedMethod="local" />)

      const localCard = screen.getByText("Local Gateway").closest("[data-slot='card']")
      expect(localCard).toHaveClass("ring-2")
      expect(localCard).toHaveClass("ring-primary")
    })

    it("highlights cloud gateway when selected", () => {
      render(<ConnectionMethodSelector selectedMethod="cloud" />)

      const cloudCard = screen.getByText("Cloud Gateway").closest("[data-slot='card']")
      expect(cloudCard).toHaveClass("ring-2")
      expect(cloudCard).toHaveClass("ring-primary")
    })

    it("calls onMethodSelect when local gateway is activated with Enter key", () => {
      const onMethodSelect = vi.fn()
      render(<ConnectionMethodSelector onMethodSelect={onMethodSelect} />)

      const localCard = screen.getByText("Local Gateway").closest("[data-slot='card']")
      fireEvent.keyDown(localCard!, { key: "Enter" })

      expect(onMethodSelect).toHaveBeenCalledWith("local")
    })

    it("calls onMethodSelect when local gateway is activated with Space key", () => {
      const onMethodSelect = vi.fn()
      render(<ConnectionMethodSelector onMethodSelect={onMethodSelect} />)

      const localCard = screen.getByText("Local Gateway").closest("[data-slot='card']")
      fireEvent.keyDown(localCard!, { key: " " })

      expect(onMethodSelect).toHaveBeenCalledWith("local")
    })

    it("calls onMethodSelect when cloud gateway is activated with Enter key", () => {
      const onMethodSelect = vi.fn()
      render(<ConnectionMethodSelector onMethodSelect={onMethodSelect} />)

      const cloudCard = screen.getByText("Cloud Gateway").closest("[data-slot='card']")
      fireEvent.keyDown(cloudCard!, { key: "Enter" })

      expect(onMethodSelect).toHaveBeenCalledWith("cloud")
    })

    it("calls onMethodSelect when cloud gateway is activated with Space key", () => {
      const onMethodSelect = vi.fn()
      render(<ConnectionMethodSelector onMethodSelect={onMethodSelect} />)

      const cloudCard = screen.getByText("Cloud Gateway").closest("[data-slot='card']")
      fireEvent.keyDown(cloudCard!, { key: " " })

      expect(onMethodSelect).toHaveBeenCalledWith("cloud")
    })

    it("does not call onMethodSelect for other keys", () => {
      const onMethodSelect = vi.fn()
      render(<ConnectionMethodSelector onMethodSelect={onMethodSelect} />)

      const localCard = screen.getByText("Local Gateway").closest("[data-slot='card']")
      fireEvent.keyDown(localCard!, { key: "Tab" })
      fireEvent.keyDown(localCard!, { key: "Escape" })
      fireEvent.keyDown(localCard!, { key: "a" })

      expect(onMethodSelect).not.toHaveBeenCalled()
    })

    it("has correct ARIA attributes on cards", () => {
      render(<ConnectionMethodSelector selectedMethod="local" />)

      const localCard = screen.getByText("Local Gateway").closest("[data-slot='card']")
      const cloudCard = screen.getByText("Cloud Gateway").closest("[data-slot='card']")

      expect(localCard).toHaveAttribute("role", "button")
      expect(localCard).toHaveAttribute("tabIndex", "0")
      expect(localCard).toHaveAttribute("aria-pressed", "true")

      expect(cloudCard).toHaveAttribute("role", "button")
      expect(cloudCard).toHaveAttribute("tabIndex", "0")
      expect(cloudCard).toHaveAttribute("aria-pressed", "false")
    })

    it("has correct ARIA attributes on platform dropdown button", () => {
      render(<ConnectionMethodSelector />)

      const dropdownButton = screen.getByRole("button", { name: /select platform/i })
      expect(dropdownButton).toHaveAttribute("aria-haspopup", "listbox")
      expect(dropdownButton).toHaveAttribute("aria-expanded", "false")

      fireEvent.click(dropdownButton)

      expect(dropdownButton).toHaveAttribute("aria-expanded", "true")
    })
  })

  describe("download functionality", () => {
    it("opens download URL when download button is clicked", () => {
      render(<ConnectionMethodSelector />)

      // Find the download button within the local gateway card
      const localCard = screen.getByText("Local Gateway").closest("[data-slot='card']")
      const downloadButton = localCard!.querySelector("button[class*='flex-1']") as HTMLElement
      fireEvent.click(downloadButton)

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining("https://github.com/athreei/athreei/releases/latest/download/"),
        "_blank"
      )
    })

    it("uses custom download base URL when provided", () => {
      const customBaseUrl = "https://custom.example.com/downloads"
      render(<ConnectionMethodSelector downloadBaseUrl={customBaseUrl} />)

      // Find the download button within the local gateway card
      const localCard = screen.getByText("Local Gateway").closest("[data-slot='card']")
      const downloadButton = localCard!.querySelector("button[class*='flex-1']") as HTMLElement
      fireEvent.click(downloadButton)

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining(customBaseUrl),
        "_blank"
      )
    })

    it("shows platform dropdown when chevron is clicked", () => {
      render(<ConnectionMethodSelector />)

      const dropdownButton = screen.getByRole("button", { name: /select platform/i })
      fireEvent.click(dropdownButton)

      expect(screen.getByText("macOS (Apple Silicon)")).toBeInTheDocument()
      expect(screen.getByText("macOS (Intel)")).toBeInTheDocument()
      expect(screen.getByText("Windows")).toBeInTheDocument()
      expect(screen.getByText("Linux")).toBeInTheDocument()
    })

    it("downloads for selected platform when option is clicked", () => {
      render(<ConnectionMethodSelector />)

      const dropdownButton = screen.getByRole("button", { name: /select platform/i })
      fireEvent.click(dropdownButton)

      const windowsOption = screen.getByText("Windows")
      fireEvent.click(windowsOption)

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining("athreei-windows.exe"),
        "_blank"
      )
    })

    it("closes dropdown after selecting a platform", () => {
      render(<ConnectionMethodSelector />)

      const dropdownButton = screen.getByRole("button", { name: /select platform/i })
      fireEvent.click(dropdownButton)

      const windowsOption = screen.getByText("Windows")
      fireEvent.click(windowsOption)

      // Dropdown should be closed, so the options shouldn't be visible
      expect(screen.queryByText("macOS (Apple Silicon)")).not.toBeInTheDocument()
    })
  })

  describe("copy URL functionality", () => {
    it("copies SSE URL to clipboard when button is clicked", async () => {
      render(<ConnectionMethodSelector />)

      // Find the copy button within the cloud gateway card
      const cloudCard = screen.getByText("Cloud Gateway").closest("[data-slot='card']")
      const copyButton = cloudCard!.querySelector("button") as HTMLElement
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(
          "https://gateway.athreei.com/sse"
        )
      })
    })

    it("copies custom SSE URL to clipboard", async () => {
      const customUrl = "https://custom.example.com/sse"
      render(<ConnectionMethodSelector sseUrl={customUrl} />)

      // Find the copy button within the cloud gateway card
      const cloudCard = screen.getByText("Cloud Gateway").closest("[data-slot='card']")
      const copyButton = cloudCard!.querySelector("button") as HTMLElement
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith(customUrl)
      })
    })

    it("shows 'Copied!' text after copying", async () => {
      render(<ConnectionMethodSelector />)

      // Find the copy button within the cloud gateway card
      const cloudCard = screen.getByText("Cloud Gateway").closest("[data-slot='card']")
      const copyButton = cloudCard!.querySelector("button") as HTMLElement
      fireEvent.click(copyButton)

      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument()
      })
    })
  })

  describe("click propagation", () => {
    it("does not trigger card selection when download button is clicked", () => {
      const onMethodSelect = vi.fn()
      render(<ConnectionMethodSelector onMethodSelect={onMethodSelect} />)

      // Find the download button within the local gateway card
      const localCard = screen.getByText("Local Gateway").closest("[data-slot='card']")
      const downloadButton = localCard!.querySelector("button[class*='flex-1']") as HTMLElement
      fireEvent.click(downloadButton)

      // onMethodSelect should not be called when clicking the download button
      expect(onMethodSelect).not.toHaveBeenCalled()
    })

    it("does not trigger card selection when copy button is clicked", async () => {
      const onMethodSelect = vi.fn()
      render(<ConnectionMethodSelector onMethodSelect={onMethodSelect} />)

      // Find the copy button within the cloud gateway card
      const cloudCard = screen.getByText("Cloud Gateway").closest("[data-slot='card']")
      const copyButton = cloudCard!.querySelector("button") as HTMLElement
      fireEvent.click(copyButton)

      // Wait for the clipboard operation to complete
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalled()
      })

      // onMethodSelect should not be called when clicking the copy button
      expect(onMethodSelect).not.toHaveBeenCalled()
    })
  })
})

describe("detectPlatform", () => {
  const originalNavigator = global.navigator

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
  })

  it("returns macos-arm64 for macOS with touch points (Apple Silicon indicator)", () => {
    Object.defineProperty(global, "navigator", {
      value: {
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        platform: "MacIntel",
        maxTouchPoints: 5,
      },
      writable: true,
    })

    expect(detectPlatform()).toBe("macos-arm64")
  })

  it("returns windows for Windows platform", () => {
    Object.defineProperty(global, "navigator", {
      value: {
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        platform: "Win32",
        maxTouchPoints: 0,
      },
      writable: true,
    })

    expect(detectPlatform()).toBe("windows")
  })

  it("returns linux for Linux platform", () => {
    Object.defineProperty(global, "navigator", {
      value: {
        userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
        platform: "Linux x86_64",
        maxTouchPoints: 0,
      },
      writable: true,
    })

    expect(detectPlatform()).toBe("linux")
  })

  it("returns macos-arm64 as default when navigator is undefined", () => {
    Object.defineProperty(global, "navigator", {
      value: undefined,
      writable: true,
    })

    expect(detectPlatform()).toBe("macos-arm64")
  })
})
