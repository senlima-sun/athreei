# Trace Viewing UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to view tool call traces in the platform dashboard, showing timeline, inputs, and outputs.

**Architecture:** Add API routes for trace listing/retrieval, create React components for trace display, integrate with existing dashboard layout. Traces are already stored in the database via `POST /api/gateway/traces`.

**Tech Stack:** Next.js 15 (App Router), React 18, Hono API, Drizzle ORM, Tailwind CSS, Lucide icons

---

## Task 1: Traces List API Route

**Files:**
- Create: `apps/api/src/routes/traces.ts`
- Modify: `apps/api/src/routes/index.ts:15-20` (add route import)
- Test: `apps/api/src/__tests__/routes/traces.test.ts`

**Step 1: Write the failing test for GET /api/traces**

```typescript
// apps/api/src/__tests__/routes/traces.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock the database before importing the app
vi.mock("../lib/db", () => ({
  getDb: vi.fn(() => ({
    query: {
      trace: {
        findMany: vi.fn(),
      },
      member: {
        findFirst: vi.fn(),
      },
    },
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
  })),
}))

// Mock auth
vi.mock("@athreei/auth/server", () => ({
  createAuth: vi.fn(() => ({
    api: {
      getSession: vi.fn(),
    },
  })),
}))

import app from "../index"
import { getDb } from "../lib/db"

describe("GET /api/traces", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 401 when not authenticated", async () => {
    const res = await app.request("/api/traces")
    expect(res.status).toBe(401)
  })

  it("returns traces for authenticated user", async () => {
    const mockTraces = [
      {
        id: "tr_123",
        traceId: "trace-1",
        name: "figma:get_components",
        status: "success",
        durationMs: 150,
        startTime: new Date("2024-01-01T10:00:00Z"),
        endTime: new Date("2024-01-01T10:00:00.150Z"),
        attributes: JSON.stringify({ toolName: "get_components" }),
      },
    ]

    const db = getDb()
    ;(db.query.trace.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockTraces)
    ;(db.query.member.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "mem_1" })

    const res = await app.request("/api/traces?organizationId=org_123", {
      headers: {
        Cookie: "session=valid-session",
      },
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.traces).toHaveLength(1)
    expect(data.traces[0].name).toBe("figma:get_components")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test apps/api/src/__tests__/routes/traces.test.ts`
Expected: FAIL with "Cannot find module" or route not found

**Step 3: Create the traces route**

```typescript
// apps/api/src/routes/traces.ts
import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { eq, and, desc, gte, lte } from "drizzle-orm"
import { getDb } from "../lib/db"
import { trace, member } from "@athreei/db"

const traces = new Hono()

const listTracesQuerySchema = z.object({
  organizationId: z.string().min(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  status: z.enum(["success", "error"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  search: z.string().optional(),
})

/**
 * GET /api/traces
 * List traces for an organization with filtering and pagination
 */
traces.get("/", zValidator("query", listTracesQuerySchema), async (c) => {
  const auth = c.get("auth")
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const { organizationId, limit, offset, status, startDate, endDate, search } =
    c.req.valid("query")

  const db = getDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query

  // Verify user is member of organization
  const membership = await dbQuery.member.findFirst({
    where: and(
      eq(member.userId, auth.userId),
      eq(member.organizationId, organizationId)
    ),
  })

  if (!membership) {
    return c.json({ error: "Access denied" }, 403)
  }

  // Build query conditions
  const conditions = [eq(trace.organizationId, organizationId)]

  if (status) {
    conditions.push(eq(trace.status, status))
  }

  if (startDate) {
    conditions.push(gte(trace.startTime, new Date(startDate)))
  }

  if (endDate) {
    conditions.push(lte(trace.startTime, new Date(endDate)))
  }

  // Fetch traces
  const traces_result = await dbQuery.trace.findMany({
    where: and(...conditions),
    orderBy: [desc(trace.startTime)],
    limit,
    offset,
  })

  // Filter by search term if provided (on name field)
  let filteredTraces = traces_result
  if (search) {
    const searchLower = search.toLowerCase()
    filteredTraces = traces_result.filter(
      (t: typeof trace.$inferSelect) =>
        t.name.toLowerCase().includes(searchLower)
    )
  }

  return c.json({
    traces: filteredTraces.map((t: typeof trace.$inferSelect) => ({
      id: t.id,
      traceId: t.traceId,
      name: t.name,
      status: t.status,
      statusMessage: t.statusMessage,
      durationMs: t.durationMs,
      startTime: t.startTime,
      endTime: t.endTime,
      attributes: t.attributes ? JSON.parse(t.attributes) : null,
    })),
    total: filteredTraces.length,
    limit,
    offset,
  })
})

export default traces
```

**Step 4: Register the route in index.ts**

```typescript
// In apps/api/src/routes/index.ts, add:
import traces from "./traces"

// In the routes array, add:
app.route("/api/traces", traces)
```

**Step 5: Run test to verify it passes**

Run: `bun test apps/api/src/__tests__/routes/traces.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/api/src/routes/traces.ts apps/api/src/routes/index.ts apps/api/src/__tests__/routes/traces.test.ts
git commit -m "feat(api): add GET /api/traces endpoint for trace listing"
```

---

## Task 2: Single Trace API Route

**Files:**
- Modify: `apps/api/src/routes/traces.ts:60-100`
- Test: `apps/api/src/__tests__/routes/traces.test.ts` (add test)

**Step 1: Write the failing test for GET /api/traces/:id**

```typescript
// Add to apps/api/src/__tests__/routes/traces.test.ts

describe("GET /api/traces/:id", () => {
  it("returns 404 when trace not found", async () => {
    const db = getDb()
    ;(db.query.trace.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const res = await app.request("/api/traces/tr_notfound", {
      headers: { Cookie: "session=valid-session" },
    })

    expect(res.status).toBe(404)
  })

  it("returns trace details with parsed attributes", async () => {
    const mockTrace = {
      id: "tr_123",
      traceId: "trace-1",
      organizationId: "org_123",
      name: "figma:get_components",
      status: "success",
      durationMs: 150,
      startTime: new Date("2024-01-01T10:00:00Z"),
      endTime: new Date("2024-01-01T10:00:00.150Z"),
      attributes: JSON.stringify({
        toolName: "get_components",
        arguments: { fileId: "abc123" },
        result: { components: [] },
      }),
    }

    const db = getDb()
    ;(db.query.trace.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockTrace)
    ;(db.query.member.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "mem_1" })

    const res = await app.request("/api/traces/tr_123", {
      headers: { Cookie: "session=valid-session" },
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.trace.attributes.toolName).toBe("get_components")
    expect(data.trace.attributes.arguments).toEqual({ fileId: "abc123" })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test apps/api/src/__tests__/routes/traces.test.ts`
Expected: FAIL - route not found

**Step 3: Add GET /api/traces/:id route**

```typescript
// Add to apps/api/src/routes/traces.ts after the list route:

/**
 * GET /api/traces/:id
 * Get a single trace with full details
 */
traces.get("/:id", async (c) => {
  const auth = c.get("auth")
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const { id } = c.req.param()
  const db = getDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query

  const traceRecord = await dbQuery.trace.findFirst({
    where: eq(trace.id, id),
  })

  if (!traceRecord) {
    return c.json({ error: "Trace not found" }, 404)
  }

  // Verify user has access to this organization
  const membership = await dbQuery.member.findFirst({
    where: and(
      eq(member.userId, auth.userId),
      eq(member.organizationId, traceRecord.organizationId)
    ),
  })

  if (!membership) {
    return c.json({ error: "Access denied" }, 403)
  }

  return c.json({
    trace: {
      id: traceRecord.id,
      traceId: traceRecord.traceId,
      parentSpanId: traceRecord.parentSpanId,
      spanId: traceRecord.spanId,
      name: traceRecord.name,
      kind: traceRecord.kind,
      status: traceRecord.status,
      statusMessage: traceRecord.statusMessage,
      startTime: traceRecord.startTime,
      endTime: traceRecord.endTime,
      durationMs: traceRecord.durationMs,
      attributes: traceRecord.attributes
        ? JSON.parse(traceRecord.attributes)
        : null,
      events: traceRecord.events ? JSON.parse(traceRecord.events) : null,
      createdAt: traceRecord.createdAt,
    },
  })
})
```

**Step 4: Run test to verify it passes**

Run: `bun test apps/api/src/__tests__/routes/traces.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/routes/traces.ts apps/api/src/__tests__/routes/traces.test.ts
git commit -m "feat(api): add GET /api/traces/:id for trace details"
```

---

## Task 3: Traces List Page UI

**Files:**
- Create: `apps/platform/src/app/dashboard/traces/page.tsx`

**Step 1: Create the traces list page**

```tsx
// apps/platform/src/app/dashboard/traces/page.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { PageHeader } from "@/components/dashboard/page-header"
import { Activity, Loader2, CheckCircle, XCircle, Clock } from "lucide-react"

interface Trace {
  id: string
  traceId: string
  name: string
  status: "success" | "error"
  statusMessage?: string
  durationMs?: number
  startTime: string
  endTime?: string
  attributes?: {
    toolName?: string
    serverName?: string
    aggregatedToolName?: string
  }
}

function formatDuration(ms?: number): string {
  if (!ms) return "-"
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

export default function TracesPage() {
  const [traces, setTraces] = useState<Trace[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTraces = async () => {
      try {
        // Get current org from session/context (simplified for now)
        const response = await fetch("/api/traces?organizationId=current")
        if (!response.ok) {
          throw new Error("Failed to fetch traces")
        }
        const data = await response.json()
        setTraces(data.traces || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load traces")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTraces()
  }, [])

  if (isLoading) {
    return (
      <div>
        <PageHeader
          title="Traces"
          description="View tool calls and their results"
        />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Traces"
          description="View tool calls and their results"
        />
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Traces"
        description="View tool calls and their results"
      />

      {traces.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <Activity className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No traces yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Traces will appear here when your AI apps make tool calls through
            athreei.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tool
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {traces.map((trace) => (
                <tr key={trace.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3">
                    {trace.status === "success" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/traces/${trace.id}`}
                      className="font-medium text-gray-900 hover:text-blue-600"
                    >
                      {trace.name}
                    </Link>
                    {trace.attributes?.serverName && (
                      <p className="text-xs text-gray-500">
                        {trace.attributes.serverName}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDuration(trace.durationMs)}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {formatTime(trace.startTime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify the page renders**

Run: `bun run dev` in apps/platform
Navigate to: http://localhost:3000/dashboard/traces
Expected: Page renders with empty state or traces list

**Step 3: Commit**

```bash
git add apps/platform/src/app/dashboard/traces/page.tsx
git commit -m "feat(platform): add traces list page"
```

---

## Task 4: Trace Detail Page UI

**Files:**
- Create: `apps/platform/src/app/dashboard/traces/[id]/page.tsx`
- Create: `apps/platform/src/components/traces/trace-detail.tsx`

**Step 1: Create the trace detail component**

```tsx
// apps/platform/src/components/traces/trace-detail.tsx
"use client"

import { CheckCircle, XCircle, Clock, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface TraceDetailProps {
  trace: {
    id: string
    traceId: string
    name: string
    status: "success" | "error"
    statusMessage?: string
    durationMs?: number
    startTime: string
    endTime?: string
    attributes?: {
      toolName?: string
      serverName?: string
      aggregatedToolName?: string
      arguments?: unknown
      result?: unknown
    }
  }
}

function formatDuration(ms?: number): string {
  if (!ms) return "-"
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

function JsonViewer({ data, label }: { data: unknown; label: string }) {
  if (data === undefined || data === null) {
    return null
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50">
      <div className="border-b border-gray-200 bg-gray-100 px-4 py-2">
        <h4 className="text-sm font-medium text-gray-700">{label}</h4>
      </div>
      <pre className="max-h-96 overflow-auto p-4 text-sm text-gray-800">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

export function TraceDetail({ trace }: TraceDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/traces"
            className="mb-2 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to traces
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{trace.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Trace ID: {trace.traceId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {trace.status === "success" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
              <CheckCircle className="h-4 w-4" />
              Success
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
              <XCircle className="h-4 w-4" />
              Error
            </span>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-4">
        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">
            Duration
          </dt>
          <dd className="mt-1 flex items-center gap-1 text-sm text-gray-900">
            <Clock className="h-4 w-4 text-gray-400" />
            {formatDuration(trace.durationMs)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">
            Started
          </dt>
          <dd className="mt-1 text-sm text-gray-900">
            {formatTime(trace.startTime)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">
            Server
          </dt>
          <dd className="mt-1 text-sm text-gray-900">
            {trace.attributes?.serverName || "-"}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase text-gray-500">Tool</dt>
          <dd className="mt-1 text-sm text-gray-900">
            {trace.attributes?.toolName || "-"}
          </dd>
        </div>
      </div>

      {/* Error message if present */}
      {trace.statusMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-medium text-red-800">Error Message</h3>
          <p className="mt-1 text-sm text-red-700">{trace.statusMessage}</p>
        </div>
      )}

      {/* Arguments and Result */}
      <div className="grid gap-4 md:grid-cols-2">
        <JsonViewer data={trace.attributes?.arguments} label="Input (Arguments)" />
        <JsonViewer data={trace.attributes?.result} label="Output (Result)" />
      </div>
    </div>
  )
}
```

**Step 2: Create the trace detail page**

```tsx
// apps/platform/src/app/dashboard/traces/[id]/page.tsx
"use client"

import { useState, useEffect, use } from "react"
import { Loader2 } from "lucide-react"
import { TraceDetail } from "@/components/traces/trace-detail"

interface TraceData {
  id: string
  traceId: string
  name: string
  status: "success" | "error"
  statusMessage?: string
  durationMs?: number
  startTime: string
  endTime?: string
  attributes?: {
    toolName?: string
    serverName?: string
    aggregatedToolName?: string
    arguments?: unknown
    result?: unknown
  }
}

export default function TraceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [trace, setTrace] = useState<TraceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTrace = async () => {
      try {
        const response = await fetch(`/api/traces/${id}`)
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Trace not found")
          }
          throw new Error("Failed to fetch trace")
        }
        const data = await response.json()
        setTrace(data.trace)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load trace")
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrace()
  }, [id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !trace) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">{error || "Trace not found"}</p>
      </div>
    )
  }

  return <TraceDetail trace={trace} />
}
```

**Step 3: Verify the page renders**

Run: `bun run dev` in apps/platform
Navigate to: http://localhost:3000/dashboard/traces/{any-trace-id}
Expected: Page renders with trace details or "not found" message

**Step 4: Commit**

```bash
git add apps/platform/src/app/dashboard/traces/[id]/page.tsx apps/platform/src/components/traces/trace-detail.tsx
git commit -m "feat(platform): add trace detail page with input/output display"
```

---

## Task 5: Add Organization Context to Traces List

**Files:**
- Modify: `apps/platform/src/app/dashboard/traces/page.tsx:25-35`
- Create: `apps/platform/src/hooks/use-organization.ts` (if not exists)

**Step 1: Check if organization hook exists**

Look for existing organization context pattern in: `apps/platform/src/components/dashboard/org-switcher.tsx`

**Step 2: Update traces page to use organization context**

```tsx
// Update the useEffect in apps/platform/src/app/dashboard/traces/page.tsx
// Replace the fetch URL with the actual organization ID from context

// Add this import at the top
import { useOrganization } from "@/hooks/use-organization"

// In the component, replace the useEffect:
const { currentOrganization } = useOrganization()

useEffect(() => {
  if (!currentOrganization?.id) return

  const fetchTraces = async () => {
    try {
      const response = await fetch(
        `/api/traces?organizationId=${currentOrganization.id}`
      )
      // ... rest of fetch logic
    }
  }

  fetchTraces()
}, [currentOrganization?.id])
```

**Step 3: Run type check**

Run: `bun run typecheck:all`
Expected: No type errors

**Step 4: Commit**

```bash
git add apps/platform/src/app/dashboard/traces/page.tsx
git commit -m "feat(platform): connect traces page to organization context"
```

---

## Task 6: Add Filtering to Traces List

**Files:**
- Modify: `apps/platform/src/app/dashboard/traces/page.tsx`
- Create: `apps/platform/src/components/traces/trace-filters.tsx`

**Step 1: Create the filter component**

```tsx
// apps/platform/src/components/traces/trace-filters.tsx
"use client"

import { Search, Filter } from "lucide-react"

interface TraceFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  status: "all" | "success" | "error"
  onStatusChange: (value: "all" | "success" | "error") => void
}

export function TraceFilters({
  search,
  onSearchChange,
  status,
  onStatusChange,
}: TraceFiltersProps) {
  return (
    <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by tool name..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
        />
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        <select
          value={status}
          onChange={(e) =>
            onStatusChange(e.target.value as "all" | "success" | "error")
          }
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
        >
          <option value="all">All statuses</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
        </select>
      </div>
    </div>
  )
}
```

**Step 2: Update traces page to include filters**

Add state for filters and pass to API:

```tsx
// Add to apps/platform/src/app/dashboard/traces/page.tsx
const [search, setSearch] = useState("")
const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error">("all")

// Update fetch URL
const params = new URLSearchParams({
  organizationId: currentOrganization.id,
})
if (search) params.set("search", search)
if (statusFilter !== "all") params.set("status", statusFilter)

const response = await fetch(`/api/traces?${params.toString()}`)

// Add filter component before the table
<TraceFilters
  search={search}
  onSearchChange={setSearch}
  status={statusFilter}
  onStatusChange={setStatusFilter}
/>
```

**Step 3: Verify filters work**

Run: `bun run dev` in apps/platform
Test: Type in search box, change status dropdown
Expected: List updates based on filters

**Step 4: Commit**

```bash
git add apps/platform/src/app/dashboard/traces/page.tsx apps/platform/src/components/traces/trace-filters.tsx
git commit -m "feat(platform): add search and status filters to traces list"
```

---

## Task 7: Integration Test

**Files:**
- Test: Manual testing of full flow

**Step 1: Run the full stack**

```bash
# Terminal 1: API
cd apps/api && bun run dev

# Terminal 2: Platform
cd apps/platform && bun run dev
```

**Step 2: Create test trace data**

Use curl or the gateway to insert test traces:

```bash
curl -X POST http://localhost:3001/api/gateway/traces \
  -H "Authorization: Bearer ak_your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "traces": [{
      "traceId": "test-trace-1",
      "aggregatedToolName": "figma:get_components",
      "serverName": "figma",
      "toolName": "get_components",
      "arguments": {"fileId": "abc123"},
      "result": {"components": [{"id": "1", "name": "Button"}]},
      "startedAt": "2024-01-01T10:00:00Z",
      "endedAt": "2024-01-01T10:00:00.150Z",
      "durationMs": 150
    }]
  }'
```

**Step 3: Verify in UI**

Navigate to: http://localhost:3000/dashboard/traces
Expected: See the test trace in the list
Click on trace: See full details with input/output

**Step 4: Final commit**

```bash
git add .
git commit -m "feat(platform): complete trace viewing UI implementation"
```

---

## Summary

| Task | Description | Files Created/Modified |
|------|-------------|----------------------|
| 1 | Traces list API | `apps/api/src/routes/traces.ts`, tests |
| 2 | Single trace API | Same file, additional route |
| 3 | Traces list page | `apps/platform/src/app/dashboard/traces/page.tsx` |
| 4 | Trace detail page | `apps/platform/src/app/dashboard/traces/[id]/page.tsx`, component |
| 5 | Organization context | Hook integration |
| 6 | Filtering | Filter component |
| 7 | Integration test | Manual verification |

**Total estimated commits:** 7
