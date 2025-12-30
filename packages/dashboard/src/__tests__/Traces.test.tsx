/**
 * Unit tests for Traces page component
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { BrowserRouter } from "react-router-dom"
import { Traces, type TraceEntry } from "../pages/Traces"

// Mock the API
vi.mock("../lib/api", () => ({
  api: {
    get: vi.fn(),
  },
}))

// Import the mocked module
import { api } from "../lib/api"

const mockTraces: TraceEntry[] = [
  {
    id: "1",
    traceId: "trace-001",
    toolName: "browser__screenshot",
    serverName: "browser-mcp",
    endpointId: "my-endpoint",
    status: "success",
    durationMs: 1234,
    startTime: Date.now() - 5000,
    endTime: Date.now() - 3766,
  },
  {
    id: "2",
    traceId: "trace-002",
    toolName: "github__create_issue",
    serverName: "github-mcp",
    endpointId: "my-endpoint",
    status: "error",
    durationMs: 823,
    startTime: Date.now() - 10000,
    errorMessage: "API rate limit exceeded",
  },
]

const mockResponse = {
  data: mockTraces,
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    totalPages: 1,
  },
}

function renderWithRouter(component: React.ReactNode) {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

describe("Traces", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders loading state initially", () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}))
    renderWithRouter(<Traces />)
    expect(screen.getByText("Loading...")).toBeInTheDocument()
  })

  it("renders traces when loaded successfully", async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse)
    renderWithRouter(<Traces />)

    await waitFor(() => {
      // Tools appear in the table (may also appear in filter dropdown)
      expect(screen.getAllByText("browser__screenshot").length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getAllByText("github__create_issue").length).toBeGreaterThanOrEqual(1)
    // Servers appear in both table and filter dropdown
    expect(screen.getAllByText("browser-mcp").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("github-mcp").length).toBeGreaterThanOrEqual(1)
  })

  it("renders success and error status badges correctly", async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse)
    renderWithRouter(<Traces />)

    await waitFor(() => {
      // Success and Error appear in both status badges and filter dropdown
      expect(screen.getAllByText("Success").length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getAllByText("Error").length).toBeGreaterThanOrEqual(1)
  })

  it("shows mock data when API fails", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("API error"))
    renderWithRouter(<Traces />)

    await waitFor(() => {
      // Should show mock data
      expect(screen.getByText("browser__screenshot")).toBeInTheDocument()
    })
    // Should show warning about mock data
    expect(screen.getByText(/Showing mock data for development/)).toBeInTheDocument()
  })

  it("renders filter controls", async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse)
    renderWithRouter(<Traces />)

    await waitFor(() => {
      expect(screen.getByText("Filters")).toBeInTheDocument()
    })
    expect(screen.getByText("Endpoint")).toBeInTheDocument()
    expect(screen.getByText("MCP Server")).toBeInTheDocument()
    // "Tool" appears in both the filter label and the table header
    expect(screen.getAllByText("Tool").length).toBeGreaterThanOrEqual(1)
    // "Status" also appears in both places
    expect(screen.getAllByText("Status").length).toBeGreaterThanOrEqual(1)
  })

  it("applies status filter correctly", async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse)
    renderWithRouter(<Traces />)

    await waitFor(() => {
      expect(screen.getByText("Status")).toBeInTheDocument()
    })

    // Find the select by its role and name (since labels are not htmlFor connected)
    const statusSelect = screen.getAllByRole("combobox")[3] // Status is the 4th select
    fireEvent.change(statusSelect, { target: { value: "success" } })

    // Should trigger a new API call with status filter
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining("status=success")
      )
    })
  })

  it("formats duration correctly", async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse)
    renderWithRouter(<Traces />)

    await waitFor(() => {
      // 1234ms should be formatted as "1.2s"
      expect(screen.getByText("1.2s")).toBeInTheDocument()
      // 823ms should be formatted as "823ms"
      expect(screen.getByText("823ms")).toBeInTheDocument()
    })
  })

  it("renders View button for each trace", async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse)
    renderWithRouter(<Traces />)

    await waitFor(() => {
      const viewButtons = screen.getAllByText("View")
      expect(viewButtons).toHaveLength(2)
    })
  })

  it("shows clear filters button when filters are active", async () => {
    vi.mocked(api.get).mockResolvedValue(mockResponse)
    renderWithRouter(<Traces />)

    await waitFor(() => {
      expect(screen.getByText("Status")).toBeInTheDocument()
    })

    // Initially no clear button
    expect(screen.queryByText("Clear filters")).not.toBeInTheDocument()

    // Apply a filter - Status is the 4th select
    const statusSelect = screen.getAllByRole("combobox")[3]
    fireEvent.change(statusSelect, { target: { value: "success" } })

    // Clear button should appear
    await waitFor(() => {
      expect(screen.getByText("Clear filters")).toBeInTheDocument()
    })
  })

  it("renders empty state when no traces", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    })
    renderWithRouter(<Traces />)

    await waitFor(() => {
      expect(
        screen.getByText(/No traces recorded yet/i)
      ).toBeInTheDocument()
    })
  })
})
