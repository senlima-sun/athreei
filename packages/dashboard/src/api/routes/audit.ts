/**
 * Audit log API routes
 *
 * Endpoints for fetching and filtering audit log entries.
 * Currently uses mock data - will integrate with SQLite later.
 */

import { Hono } from "hono"
import type { AuditLogEntry } from "@athreei/shared"

export const auditRouter = new Hono()

// Mock audit log data
const mockAuditLogs: AuditLogEntry[] = [
  {
    id: "audit-001",
    timestamp: Date.now() - 3600000,
    aiApp: "Claude",
    tool: "aiii:navigate",
    origin: "https://example.com",
    args: { url: "https://github.com" },
    result: { success: true },
    status: "success",
  },
  {
    id: "audit-002",
    timestamp: Date.now() - 7200000,
    aiApp: "ChatGPT",
    tool: "aiii:click",
    origin: "https://example.com",
    args: { selector: "button.submit" },
    result: { clicked: true },
    status: "success",
  },
  {
    id: "audit-003",
    timestamp: Date.now() - 10800000,
    aiApp: "Claude",
    tool: "aiii:type",
    origin: "https://test.com",
    args: { selector: "input[type='text']", text: "test" },
    status: "denied",
  },
  {
    id: "audit-004",
    timestamp: Date.now() - 14400000,
    tool: "aiii:screenshot",
    origin: "https://example.com",
    args: {},
    result: { error: "Permission denied" },
    status: "error",
  },
  {
    id: "audit-005",
    timestamp: Date.now() - 18000000,
    aiApp: "Claude",
    tool: "aiii:form",
    origin: "https://app.example.com",
    args: { selector: "form#login", action: "submit" },
    result: { submitted: true },
    status: "success",
  },
]

/**
 * GET /api/audit
 * List audit log entries with pagination and filtering
 *
 * Query params:
 * - tool: Filter by tool name
 * - origin: Filter by origin
 * - status: Filter by status (success|denied|error)
 * - aiApp: Filter by AI app name
 * - dateFrom: Filter entries after this timestamp
 * - dateTo: Filter entries before this timestamp
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 */
auditRouter.get("/", (c) => {
  const tool = c.req.query("tool")
  const origin = c.req.query("origin")
  const status = c.req.query("status")
  const aiApp = c.req.query("aiApp")
  const dateFrom = c.req.query("dateFrom")
  const dateTo = c.req.query("dateTo")
  const page = parseInt(c.req.query("page") || "1")
  const limit = parseInt(c.req.query("limit") || "20")

  // Filter logs
  let filtered = [...mockAuditLogs]

  if (tool) {
    filtered = filtered.filter((log) => log.tool === tool)
  }

  if (origin) {
    filtered = filtered.filter((log) => log.origin === origin)
  }

  if (status) {
    filtered = filtered.filter((log) => log.status === status)
  }

  if (aiApp) {
    filtered = filtered.filter((log) => log.aiApp === aiApp)
  }

  if (dateFrom) {
    const fromTimestamp = parseInt(dateFrom)
    filtered = filtered.filter((log) => log.timestamp >= fromTimestamp)
  }

  if (dateTo) {
    const toTimestamp = parseInt(dateTo)
    filtered = filtered.filter((log) => log.timestamp <= toTimestamp)
  }

  // Sort by timestamp descending (newest first)
  filtered.sort((a, b) => b.timestamp - a.timestamp)

  // Paginate
  const total = filtered.length
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginated = filtered.slice(startIndex, endIndex)

  return c.json({
    data: paginated,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
})

/**
 * GET /api/audit/:id
 * Get a single audit log entry by ID
 */
auditRouter.get("/:id", (c) => {
  const id = c.req.param("id")
  const entry = mockAuditLogs.find((log) => log.id === id)

  if (!entry) {
    return c.json({ error: "Audit log entry not found" }, 404)
  }

  return c.json(entry)
})
