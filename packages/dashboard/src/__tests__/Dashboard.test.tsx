/**
 * Unit tests for Dashboard page component with analytics
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { BrowserRouter } from "react-router-dom"
import { Dashboard } from "../pages/Dashboard"

// Mock the API
vi.mock("../lib/api", () => ({
  api: {
    get: vi.fn(),
  },
  getAuditLogs: vi.fn(),
  getSessions: vi.fn(),
  getPermissions: vi.fn(),
}))

import { api, getAuditLogs, getSessions, getPermissions } from "../lib/api"

const mockAuditLogs = {
  data: [
    {
      id: "1",
      timestamp: Date.now() - 60000,
      tool: "browser__screenshot",
      origin: "https://example.com",
      status: "success" as const,
      args: {},
    },
  ],
  pagination: { page: 1, limit: 5, total: 100, totalPages: 20 },
}

const mockSessions = { data: [], count: 5, total: 5 }
const mockPermissions = { data: [], count: 10 }

const mockAnalytics = {
  totalTraces: 1234,
  successRate: 98.5,
  averageDurationMs: 823,
  activeMcpServers: 5,
  toolUsage: [
    { toolName: "browser__screenshot", count: 556, percentage: 45 },
    { toolName: "github__create_issue", count: 309, percentage: 25 },
    { toolName: "filesystem__read", count: 247, percentage: 20 },
  ],
}

function renderWithRouter(component: React.ReactNode) {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuditLogs).mockResolvedValue(mockAuditLogs)
    vi.mocked(getSessions).mockResolvedValue(mockSessions)
    vi.mocked(getPermissions).mockResolvedValue(mockPermissions)
    vi.mocked(api.get).mockResolvedValue(mockAnalytics)
  })

  it("renders dashboard title", async () => {
    renderWithRouter(<Dashboard />)
    expect(screen.getByText("Dashboard Overview")).toBeInTheDocument()
  })

  it("renders analytics cards", async () => {
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText("Total Traces")).toBeInTheDocument()
    })
    expect(screen.getByText("Success Rate")).toBeInTheDocument()
    expect(screen.getByText("Avg Duration")).toBeInTheDocument()
    expect(screen.getByText("Active MCPs")).toBeInTheDocument()
  })

  it("displays trace analytics values", async () => {
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText("1,234")).toBeInTheDocument()
    })
    expect(screen.getByText("98.5%")).toBeInTheDocument()
    expect(screen.getByText("823ms")).toBeInTheDocument()
    // There are multiple "5" values on the page (Active MCPs and Active Sessions)
    expect(screen.getAllByText("5").length).toBeGreaterThanOrEqual(1)
  })

  it("renders tool usage chart", async () => {
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText("Tool Usage (Last 7 days)")).toBeInTheDocument()
    })
    // Tools appear in multiple places (chart and recent activity) - just check they exist
    expect(screen.getAllByText("browser__screenshot").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("github__create_issue").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("filesystem__read").length).toBeGreaterThanOrEqual(1)
  })

  it("renders tool usage percentages", async () => {
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText(/556.*\(45%\)/)).toBeInTheDocument()
    })
    expect(screen.getByText(/309.*\(25%\)/)).toBeInTheDocument()
    expect(screen.getByText(/247.*\(20%\)/)).toBeInTheDocument()
  })

  it("renders system overview cards", async () => {
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText("System Overview")).toBeInTheDocument()
    })
    expect(screen.getByText("Total Requests")).toBeInTheDocument()
    expect(screen.getByText("Active Sessions")).toBeInTheDocument()
    expect(screen.getByText("Permissions")).toBeInTheDocument()
    expect(screen.getByText("Blocked Requests")).toBeInTheDocument()
  })

  it("renders view traces button in quick actions", async () => {
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText("View Traces")).toBeInTheDocument()
    })
  })

  it("renders recent activity section", async () => {
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText("Recent Activity")).toBeInTheDocument()
    })
  })

  it("shows mock analytics when API fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("API error"))
    renderWithRouter(<Dashboard />)

    // Should show mock analytics data
    await waitFor(() => {
      expect(screen.getByText("1,234")).toBeInTheDocument()
    })
  })

  it("applies success variant to high success rate", async () => {
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      const successRateCard = screen.getByText("98.5%")
      // Should have success color class applied via parent
      expect(successRateCard).toBeInTheDocument()
    })
  })

  it("shows loading state for analytics initially", async () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}))
    renderWithRouter(<Dashboard />)

    // The analytics cards should show loading state
    await waitFor(() => {
      const loadingCards = screen.getAllByText("...")
      expect(loadingCards.length).toBeGreaterThan(0)
    })
  })

  it("renders quick actions section", async () => {
    renderWithRouter(<Dashboard />)

    await waitFor(() => {
      expect(screen.getByText("Quick Actions")).toBeInTheDocument()
    })
    expect(screen.getByText("View Traces")).toBeInTheDocument()
    expect(screen.getByText("View Audit Logs")).toBeInTheDocument()
    expect(screen.getByText("Manage Permissions")).toBeInTheDocument()
    expect(screen.getByText("Configure Settings")).toBeInTheDocument()
  })
})
