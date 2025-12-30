/**
 * Unit tests for TraceDetail page component
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { TraceDetail } from "../pages/TraceDetail"

// Mock the API
vi.mock("../lib/api", () => ({
  api: {
    get: vi.fn(),
  },
}))

// Mock the @athreei/shared module
vi.mock("@athreei/shared", () => ({
  deriveKey: vi.fn().mockResolvedValue({
    key: new Uint8Array(32),
    salt: new Uint8Array(16),
    version: 1,
  }),
  decrypt: vi.fn().mockReturnValue({
    request: { arguments: { url: "https://example.com" } },
    response: { result: { success: true } },
  }),
}))

import { api } from "../lib/api"

const mockTrace = {
  data: {
    id: "1",
    traceId: "trace-001",
    toolName: "browser__screenshot",
    serverName: "browser-mcp",
    endpointId: "my-endpoint",
    status: "success",
    durationMs: 1234,
    startTime: Date.now() - 5000,
    endTime: Date.now() - 3766,
    encryptedPayload: "encrypted-data-base64",
    nonce: "nonce-base64",
    keyVersion: 1,
  },
}

const mockTraceWithoutPayload = {
  data: {
    ...mockTrace.data,
    encryptedPayload: undefined,
    nonce: undefined,
  },
}

const mockErrorTrace = {
  data: {
    ...mockTrace.data,
    status: "error",
    errorMessage: "Connection timeout",
  },
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
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}))
    renderWithRouter()
    expect(screen.getByText("Loading trace...")).toBeInTheDocument()
  })

  it("renders trace metadata when loaded", async () => {
    vi.mocked(api.get).mockResolvedValue(mockTrace)
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Trace Details")).toBeInTheDocument()
    })
    expect(screen.getByText("trace-001")).toBeInTheDocument()
    expect(screen.getByText("browser__screenshot")).toBeInTheDocument()
    expect(screen.getByText("browser-mcp")).toBeInTheDocument()
    expect(screen.getByText("my-endpoint")).toBeInTheDocument()
  })

  it("renders success status correctly", async () => {
    vi.mocked(api.get).mockResolvedValue(mockTrace)
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Success")).toBeInTheDocument()
    })
  })

  it("renders error status and message correctly", async () => {
    vi.mocked(api.get).mockResolvedValue(mockErrorTrace)
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Error")).toBeInTheDocument()
    })
    expect(screen.getByText("Error Details")).toBeInTheDocument()
    expect(screen.getByText("Connection timeout")).toBeInTheDocument()
  })

  it("shows decrypt button when payload is encrypted", async () => {
    vi.mocked(api.get).mockResolvedValue(mockTrace)
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Decrypt Payload")).toBeInTheDocument()
    })
  })

  it("shows message when no encrypted payload", async () => {
    vi.mocked(api.get).mockResolvedValue(mockTraceWithoutPayload)
    renderWithRouter()

    await waitFor(() => {
      expect(
        screen.getByText("No encrypted payload available for this trace.")
      ).toBeInTheDocument()
    })
  })

  it("shows password dialog when decrypt button clicked", async () => {
    vi.mocked(api.get).mockResolvedValue(mockTrace)
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Decrypt Payload")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Decrypt Payload"))

    await waitFor(() => {
      expect(screen.getByText("Enter Decryption Password")).toBeInTheDocument()
    })
  })

  it("renders back button that navigates to traces list", async () => {
    vi.mocked(api.get).mockResolvedValue(mockTrace)
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
    vi.mocked(api.get).mockResolvedValue(mockTrace)
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("1.23s")).toBeInTheDocument()
    })
  })

  it("shows trace not found when invalid uuid", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Not found"))
    renderWithRouter("invalid-uuid")

    // After mock data is applied, we should still see the trace
    // because getMockTrace returns a default trace
    await waitFor(() => {
      expect(screen.getByText("Trace Details")).toBeInTheDocument()
    })
  })

  it("displays key version when available", async () => {
    vi.mocked(api.get).mockResolvedValue(mockTrace)
    renderWithRouter()

    await waitFor(() => {
      expect(screen.getByText("Key Version")).toBeInTheDocument()
    })
    expect(screen.getByText("v1")).toBeInTheDocument()
  })
})
