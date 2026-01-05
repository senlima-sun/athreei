/**
 * Unit tests for BrowserMcpShowcase page component
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { BrowserRouter } from "react-router-dom"
import { BrowserMcpShowcase } from "../pages/BrowserMcpShowcase"

// Mock clipboard API
const mockWriteText = vi.fn()
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
})

function renderWithRouter(component: React.ReactNode) {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe("BrowserMcpShowcase", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWriteText.mockResolvedValue(undefined)
  })

  describe("Page Header", () => {
    it("renders the page title", () => {
      renderWithRouter(<BrowserMcpShowcase />)
      expect(screen.getByText("Browser MCP Showcase")).toBeInTheDocument()
    })

    it("renders the page description", () => {
      renderWithRouter(<BrowserMcpShowcase />)
      expect(
        screen.getByText(/Control your browser with AI/i)
      ).toBeInTheDocument()
    })

    it("renders back to dashboard button", () => {
      renderWithRouter(<BrowserMcpShowcase />)
      expect(screen.getByText("Back to Dashboard")).toBeInTheDocument()
    })
  })

  describe("Feature Highlights", () => {
    it("renders privacy-first feature", () => {
      renderWithRouter(<BrowserMcpShowcase />)
      expect(screen.getByText("Privacy-First")).toBeInTheDocument()
      expect(
        screen.getByText(/Full audit logging, permission controls/i)
      ).toBeInTheDocument()
    })

    it("renders 11 browser tools feature", () => {
      renderWithRouter(<BrowserMcpShowcase />)
      expect(screen.getByText("11 Browser Tools")).toBeInTheDocument()
    })

    it("renders compatibility feature", () => {
      renderWithRouter(<BrowserMcpShowcase />)
      expect(screen.getByText("Works with Any AI")).toBeInTheDocument()
    })
  })

  describe("Tabs Navigation", () => {
    it("renders all tab triggers", () => {
      renderWithRouter(<BrowserMcpShowcase />)
      expect(
        screen.getByRole("tab", { name: "Setup Guide" })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("tab", { name: "Available Tools" })
      ).toBeInTheDocument()
      expect(
        screen.getByRole("tab", { name: "Example Prompts" })
      ).toBeInTheDocument()
    })

    it("shows setup guide by default", () => {
      renderWithRouter(<BrowserMcpShowcase />)
      expect(screen.getByText("Getting Started")).toBeInTheDocument()
    })

    it("all tabs are clickable", () => {
      renderWithRouter(<BrowserMcpShowcase />)

      const toolsTab = screen.getByRole("tab", { name: "Available Tools" })
      const examplesTab = screen.getByRole("tab", { name: "Example Prompts" })
      const setupTab = screen.getByRole("tab", { name: "Setup Guide" })

      // Verify all tabs are not disabled
      expect(toolsTab).not.toBeDisabled()
      expect(examplesTab).not.toBeDisabled()
      expect(setupTab).not.toBeDisabled()
    })
  })

  describe("Setup Guide", () => {
    it("renders all 5 setup steps", () => {
      renderWithRouter(<BrowserMcpShowcase />)

      expect(
        screen.getByText("Install the Chrome Extension")
      ).toBeInTheDocument()
      expect(screen.getByText("Install the Native Host")).toBeInTheDocument()
      expect(screen.getByText("Configure Claude Desktop")).toBeInTheDocument()
      expect(screen.getByText("Restart Claude Desktop")).toBeInTheDocument()
      expect(screen.getByText("Verify Connection")).toBeInTheDocument()
    })

    it("renders step numbers", () => {
      renderWithRouter(<BrowserMcpShowcase />)

      // Check for step numbers 1-5
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(String(i))).toBeInTheDocument()
      }
    })

    it("renders code blocks for relevant steps", () => {
      renderWithRouter(<BrowserMcpShowcase />)

      // Check for the native host install command
      expect(screen.getByText(/curl -fsSL/)).toBeInTheDocument()

      // Check for Claude Desktop config JSON
      expect(screen.getByText(/"mcpServers"/)).toBeInTheDocument()
    })

    it("renders copy buttons for code blocks", () => {
      renderWithRouter(<BrowserMcpShowcase />)

      const copyButtons = screen.getAllByText("Copy")
      expect(copyButtons.length).toBeGreaterThan(0)
    })
  })

  describe("Browser Tools and Examples", () => {
    it("tools tab exists and is accessible", () => {
      renderWithRouter(<BrowserMcpShowcase />)

      const toolsTab = screen.getByRole("tab", { name: "Available Tools" })
      expect(toolsTab).toBeInTheDocument()
      expect(toolsTab).toHaveAttribute("role", "tab")
    })

    it("example prompts tab exists and is accessible", () => {
      renderWithRouter(<BrowserMcpShowcase />)

      const examplesTab = screen.getByRole("tab", { name: "Example Prompts" })
      expect(examplesTab).toBeInTheDocument()
      expect(examplesTab).toHaveAttribute("role", "tab")
    })
  })

  describe("Architecture Overview", () => {
    it("renders architecture section", () => {
      renderWithRouter(<BrowserMcpShowcase />)

      expect(screen.getByText("How It Works")).toBeInTheDocument()
    })

    it("renders architecture components", () => {
      renderWithRouter(<BrowserMcpShowcase />)

      expect(screen.getByText("AI App")).toBeInTheDocument()
      expect(screen.getByText("MCP Server")).toBeInTheDocument()
      expect(screen.getByText("Native Host")).toBeInTheDocument()
      expect(screen.getByText("Extension")).toBeInTheDocument()
      expect(screen.getByText("Browser")).toBeInTheDocument()
    })

    it("renders privacy message", () => {
      renderWithRouter(<BrowserMcpShowcase />)

      expect(
        screen.getByText(/All communication is local and encrypted/i)
      ).toBeInTheDocument()
    })
  })

  describe("Call to Action", () => {
    it("renders CTA section", () => {
      renderWithRouter(<BrowserMcpShowcase />)

      expect(screen.getByText("Ready to Get Started?")).toBeInTheDocument()
    })

    it("renders GitHub link", () => {
      renderWithRouter(<BrowserMcpShowcase />)

      expect(screen.getByText("View on GitHub")).toBeInTheDocument()
    })

    it("renders install command copy button", () => {
      renderWithRouter(<BrowserMcpShowcase />)

      expect(screen.getByText("Copy Install Command")).toBeInTheDocument()
    })
  })

  describe("Copy Functionality", () => {
    it("copies code to clipboard when copy button is clicked", async () => {
      renderWithRouter(<BrowserMcpShowcase />)

      const copyButtons = screen.getAllByText("Copy")
      fireEvent.click(copyButtons[0])

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalled()
      })
    })

    it("shows 'Copied!' feedback after copying", async () => {
      renderWithRouter(<BrowserMcpShowcase />)

      const copyButtons = screen.getAllByText("Copy")
      fireEvent.click(copyButtons[0])

      await waitFor(() => {
        expect(screen.getByText("Copied!")).toBeInTheDocument()
      })
    })

    it("copies install command when CTA button is clicked", async () => {
      renderWithRouter(<BrowserMcpShowcase />)

      const installButton = screen.getByText("Copy Install Command")
      fireEvent.click(installButton)

      await waitFor(() => {
        expect(mockWriteText).toHaveBeenCalledWith("npx -y @athreei/browser-mcp")
      })
    })
  })
})
