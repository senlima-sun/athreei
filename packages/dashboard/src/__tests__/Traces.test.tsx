/**
 * Unit tests for Traces page component
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { BrowserRouter } from "react-router-dom"
import { Traces, type TraceEntry } from "../pages/Traces"

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

const mockTraces: TraceEntry[] = [
  {
    traceId: "trace-001",
    requestId: "req-001",
    aggregatedToolName: "browser__screenshot",
    serverName: "browser-mcp",
    toolName: "screenshot",
    status: "success",
    durationMs: 1234,
    startedAt: new Date(Date.now() - 5000).toISOString(),
    endedAt: new Date(Date.now() - 3766).toISOString(),
    arguments: { url: "https://example.com" },
    result: { screenshot: "base64..." },
  },
  {
    traceId: "trace-002",
    requestId: "req-002",
    aggregatedToolName: "github__create_issue",
    serverName: "github-mcp",
    toolName: "create_issue",
    status: "error",
    durationMs: 823,
    startedAt: new Date(Date.now() - 10000).toISOString(),
    error: "API rate limit exceeded",
  },
]

const mockResponse = {
  traces: mockTraces,
  total: 2,
  limit: 50,
  offset: 0,
}

function renderWithRouter(component: React.ReactNode) {
  return render(<BrowserRouter>{component}</BrowserRouter>)
}

// Helper to create a mock fetch response
function createFetchResponse(data: unknown) {
  return {
    ok: true,
    json: () => Promise.resolve(data),
  }
}

describe("Traces", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders loading state initially", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))
    renderWithRouter(<Traces />)
    expect(screen.getByText("Loading data...")).toBeInTheDocument()
  })

  it("renders traces when loaded successfully", async () => {
    mockFetch.mockResolvedValue(createFetchResponse(mockResponse))
    renderWithRouter(<Traces />)

    await waitFor(() => {
      // Tools appear in the table (may also appear in filter dropdown)
      expect(
        screen.getAllByText("browser__screenshot").length
      ).toBeGreaterThanOrEqual(1)
    })
    expect(
      screen.getAllByText("github__create_issue").length
    ).toBeGreaterThanOrEqual(1)
    // Servers appear in both table and filter dropdown
    expect(screen.getAllByText("browser-mcp").length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText("github-mcp").length).toBeGreaterThanOrEqual(1)
  })

  it("renders success and error status badges correctly", async () => {
    mockFetch.mockResolvedValue(createFetchResponse(mockResponse))
    renderWithRouter(<Traces />)

    await waitFor(() => {
      // Success and Error appear in both status badges and filter dropdown
      expect(screen.getAllByText("Success").length).toBeGreaterThanOrEqual(1)
    })
    expect(screen.getAllByText("Error").length).toBeGreaterThanOrEqual(1)
  })

  it("shows gateway disconnected when fetch fails with TypeError", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"))
    renderWithRouter(<Traces />)

    await waitFor(() => {
      expect(screen.getByText("Gateway Not Connected")).toBeInTheDocument()
    })
  })

  it("renders filter controls", async () => {
    mockFetch.mockResolvedValue(createFetchResponse(mockResponse))
    renderWithRouter(<Traces />)

    await waitFor(() => {
      expect(screen.getByText("Filters")).toBeInTheDocument()
    })
    expect(screen.getByText("Search")).toBeInTheDocument()
    expect(screen.getByText("MCP Server")).toBeInTheDocument()
    // "Tool" appears in both the filter label and the table header
    expect(screen.getAllByText("Tool").length).toBeGreaterThanOrEqual(1)
    // "Status" also appears in both places
    expect(screen.getAllByText("Status").length).toBeGreaterThanOrEqual(1)
  })

  it("applies status filter correctly", async () => {
    mockFetch.mockResolvedValue(createFetchResponse(mockResponse))
    renderWithRouter(<Traces />)

    await waitFor(() => {
      expect(screen.getByText("Status")).toBeInTheDocument()
    })

    // Find the select by its role and name (since labels are not htmlFor connected)
    const statusSelect = screen.getAllByRole("combobox")[2] // Status is the 3rd select (Search is textbox)
    fireEvent.change(statusSelect, { target: { value: "success" } })

    // Should trigger a new API call with status filter
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("status=success")
      )
    })
  })

  it("formats duration correctly", async () => {
    mockFetch.mockResolvedValue(createFetchResponse(mockResponse))
    renderWithRouter(<Traces />)

    await waitFor(() => {
      // 1234ms should be formatted as "1.2s"
      expect(screen.getByText("1.2s")).toBeInTheDocument()
      // 823ms should be formatted as "823ms"
      expect(screen.getByText("823ms")).toBeInTheDocument()
    })
  })

  it("renders View button for each trace", async () => {
    mockFetch.mockResolvedValue(createFetchResponse(mockResponse))
    renderWithRouter(<Traces />)

    await waitFor(() => {
      const viewButtons = screen.getAllByText("View")
      expect(viewButtons).toHaveLength(2)
    })
  })

  it("shows clear filters button when filters are active", async () => {
    mockFetch.mockResolvedValue(createFetchResponse(mockResponse))
    renderWithRouter(<Traces />)

    await waitFor(() => {
      expect(screen.getByText("Status")).toBeInTheDocument()
    })

    // Initially no clear button
    expect(screen.queryByText("Clear filters")).not.toBeInTheDocument()

    // Apply a filter - Status is the 3rd select
    const statusSelect = screen.getAllByRole("combobox")[2]
    fireEvent.change(statusSelect, { target: { value: "success" } })

    // Clear button should appear
    await waitFor(() => {
      expect(screen.getByText("Clear filters")).toBeInTheDocument()
    })
  })

  it("renders empty state when no traces", async () => {
    mockFetch.mockResolvedValue(
      createFetchResponse({
        traces: [],
        total: 0,
        limit: 50,
        offset: 0,
      })
    )
    renderWithRouter(<Traces />)

    await waitFor(() => {
      expect(screen.getByText(/No traces recorded yet/i)).toBeInTheDocument()
    })
  })

  it("shows gateway connection status indicator", async () => {
    mockFetch.mockResolvedValue(createFetchResponse(mockResponse))
    renderWithRouter(<Traces />)

    await waitFor(() => {
      expect(screen.getByText("Gateway Connected")).toBeInTheDocument()
    })
  })
})
