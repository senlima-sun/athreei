/**
 * Unit tests for TraceDetail page component
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { TraceDetail } from "../pages/TraceDetail"

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

const mockTrace = {
  traceId: "trace-001",
  requestId: "req-001",
  aggregatedToolName: "browser__screenshot",
  toolName: "screenshot",
  serverName: "browser-mcp",
  status: "success" as const,
  durationMs: 1234,
  startedAt: new Date(Date.now() - 5000).toISOString(),
  endedAt: new Date(Date.now() - 3766).toISOString(),
  arguments: { url: "https://example.com" },
  result: { screenshot: "base64..." },
}

const mockTraceWithoutPayload = {
  ...mockTrace,
  arguments: undefined,
  result: undefined,
}

const mockErrorTrace = {
  ...mockTrace,
  status: "error" as const,
  error: "Connection timeout",
}

// Helper to create a mock fetch response
function createFetchResponse(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: () => Promise.resolve(data),
  }
}

function renderWithRouter(traceId: string = "trace-001") {
  return render(
    <MemoryRouter initialEntries={[`/traces/${traceId}`]}>
      <Routes>
        <Route path="/traces/:uuid" element={<TraceDetail />} />
        <Route path="/traces" element={<div>Traces List</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe("TraceDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders loading state initially", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))
    renderWithRouter()
    expect(screen.getByText("Loading trace details...")).toBeInTheDocument()
  })

  it("renders trace metadata when loaded", async () => {
    mockFetch.mockResolvedValue(createFetchResponse(mockTrace))
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Trace Details")).toBeInTheDocument()
    })
    expect(screen.getByText("trace-001")).toBeInTheDocument()
    expect(screen.getByText("browser__screenshot")).toBeInTheDocument()
    expect(screen.getByText("screenshot")).toBeInTheDocument()
    expect(screen.getByText("browser-mcp")).toBeInTheDocument()
  })

  it("renders success status correctly", async () => {
    mockFetch.mockResolvedValue(createFetchResponse(mockTrace))
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Success")).toBeInTheDocument()
    })
  })

  it("renders error status and message correctly", async () => {
    mockFetch.mockResolvedValue(createFetchResponse(mockErrorTrace))
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument()
    })
    expect(screen.getByText("Error Details")).toBeInTheDocument()
    expect(screen.getByText("Connection timeout")).toBeInTheDocument()
  })

  it("shows request arguments when available", async () => {
    mockFetch.mockResolvedValue(createFetchResponse(mockTrace))
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Request Arguments")).toBeInTheDocument()
    })
  })

  it("shows message when no payload data", async () => {
    mockFetch.mockResolvedValue(createFetchResponse(mockTraceWithoutPayload))
    renderWithRouter()

    await waitFor(() => {
      expect(
        screen.getByText("No payload data available for this trace.")
      ).toBeInTheDocument()
    })
  })

  it("renders back button that navigates to traces list", async () => {
    mockFetch.mockResolvedValue(createFetchResponse(mockTrace))
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Back")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Back"))

    await waitFor(() => {
      expect(screen.getByText("Traces List")).toBeInTheDocument()
    })
  })

  it("formats duration correctly", async () => {
    mockFetch.mockResolvedValue(createFetchResponse(mockTrace))
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("1.23s")).toBeInTheDocument()
    })
  })

  it("shows error state when API fails", async () => {
    mockFetch.mockResolvedValue(createFetchResponse(null, false, 404))
    renderWithRouter("invalid-uuid")

    await waitFor(() => {
      expect(screen.getByText("Unable to load trace")).toBeInTheDocument()
    })
  })

  it("shows gateway not connected when fetch fails", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"))
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Gateway Not Connected")).toBeInTheDocument()
    })
  })

  it("displays request ID when available", async () => {
    mockFetch.mockResolvedValue(createFetchResponse(mockTrace))
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Request ID")).toBeInTheDocument()
    })
    expect(screen.getByText("req-001")).toBeInTheDocument()
  })
})
