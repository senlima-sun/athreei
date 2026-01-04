# Tool Configuration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to customize MCP tool descriptions/prompts to improve AI tool usage, completing the "iterate with data" loop.

**Architecture:** Extend `mcpTool` schema with custom fields (customDescription, customPrompt), add API routes for tool CRUD, create UI for editing. Gateway will use custom fields when exposing tools to AI apps.

**Tech Stack:** Next.js 15 (App Router), React 18, Hono API, Drizzle ORM, Tailwind CSS, Zod validation

---

## Task 1: Extend Database Schema

**Files:**
- Modify: `packages/db/src/schema/pg/mcp-servers.ts:28-38`
- Modify: `packages/db/src/schema/sqlite/mcp-servers.ts:28-38`

**Step 1: Add custom fields to PostgreSQL schema**

```typescript
// In packages/db/src/schema/pg/mcp-servers.ts, update mcpTool table:

export const mcpTool = pgTable("mcp_tool", {
  id: text("id").primaryKey(),
  serverId: text("serverId")
    .notNull()
    .references(() => mcpServer.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"), // Original from MCP server
  inputSchema: text("inputSchema"),
  // New custom fields for user overrides
  customDescription: text("customDescription"), // User override for description
  customPrompt: text("customPrompt"), // Additional instructions for AI
  isEnabled: text("isEnabled").notNull().default("true"), // Tool visibility toggle
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
})
```

**Step 2: Add same fields to SQLite schema**

```typescript
// In packages/db/src/schema/sqlite/mcp-servers.ts, update mcpTool table:

export const mcpTool = sqliteTable("mcp_tool", {
  id: text("id").primaryKey(),
  serverId: text("serverId")
    .notNull()
    .references(() => mcpServer.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  inputSchema: text("inputSchema"),
  customDescription: text("customDescription"),
  customPrompt: text("customPrompt"),
  isEnabled: text("isEnabled").notNull().default("true"),
  createdAt: integer("createdAt", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull(),
})
```

**Step 3: Generate migration**

```bash
cd packages/db
bun run generate
```

Expected: New migration file in `drizzle/` directory

**Step 4: Run migration**

```bash
bun run migrate
```

Expected: Migration applies successfully

**Step 5: Commit**

```bash
git add packages/db/src/schema/pg/mcp-servers.ts packages/db/src/schema/sqlite/mcp-servers.ts packages/db/drizzle/
git commit -m "feat(db): add custom tool configuration fields"
```

---

## Task 2: Tools List API Route

**Files:**
- Create: `apps/api/src/routes/tools.ts`
- Modify: `apps/api/src/routes/index.ts` (add route import)
- Test: `apps/api/src/__tests__/routes/tools.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/api/src/__tests__/routes/tools.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("../lib/db", () => ({
  getDb: vi.fn(() => ({
    query: {
      mcpTool: { findMany: vi.fn() },
      mcpServer: { findFirst: vi.fn() },
      member: { findFirst: vi.fn() },
    },
  })),
}))

vi.mock("@athreei/auth/server", () => ({
  createAuth: vi.fn(() => ({
    api: { getSession: vi.fn() },
  })),
}))

import app from "../index"
import { getDb } from "../lib/db"

describe("GET /api/tools", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns tools for a server", async () => {
    const mockTools = [
      {
        id: "tool_1",
        serverId: "srv_1",
        name: "get_components",
        description: "Get Figma components",
        customDescription: null,
        customPrompt: null,
        isEnabled: "true",
      },
    ]

    const db = getDb()
    ;(db.query.mcpTool.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockTools)
    ;(db.query.mcpServer.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "srv_1",
      organizationId: "org_1",
    })
    ;(db.query.member.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "mem_1" })

    const res = await app.request("/api/tools?serverId=srv_1", {
      headers: { Cookie: "session=valid" },
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.tools).toHaveLength(1)
    expect(data.tools[0].name).toBe("get_components")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test apps/api/src/__tests__/routes/tools.test.ts`
Expected: FAIL

**Step 3: Create the tools route**

```typescript
// apps/api/src/routes/tools.ts
import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { eq, and } from "drizzle-orm"
import { getDb } from "../lib/db"
import { mcpTool, mcpServer, member } from "@athreei/db"

const tools = new Hono()

const listToolsQuerySchema = z.object({
  serverId: z.string().min(1),
})

/**
 * GET /api/tools?serverId={id}
 * List all tools for an MCP server
 */
tools.get("/", zValidator("query", listToolsQuerySchema), async (c) => {
  const auth = c.get("auth")
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const { serverId } = c.req.valid("query")
  const db = getDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query

  // Get the server to check organization
  const server = await dbQuery.mcpServer.findFirst({
    where: eq(mcpServer.id, serverId),
  })

  if (!server) {
    return c.json({ error: "Server not found" }, 404)
  }

  // Verify user has access
  const membership = await dbQuery.member.findFirst({
    where: and(
      eq(member.userId, auth.userId),
      eq(member.organizationId, server.organizationId)
    ),
  })

  if (!membership) {
    return c.json({ error: "Access denied" }, 403)
  }

  // Get tools
  const toolsList = await dbQuery.mcpTool.findMany({
    where: eq(mcpTool.serverId, serverId),
  })

  return c.json({
    tools: toolsList.map((t: typeof mcpTool.$inferSelect) => ({
      id: t.id,
      serverId: t.serverId,
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema ? JSON.parse(t.inputSchema) : null,
      customDescription: t.customDescription,
      customPrompt: t.customPrompt,
      isEnabled: t.isEnabled === "true",
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
  })
})

export default tools
```

**Step 4: Register route in index.ts**

```typescript
// In apps/api/src/routes/index.ts, add:
import tools from "./tools"

app.route("/api/tools", tools)
```

**Step 5: Run test**

Run: `bun test apps/api/src/__tests__/routes/tools.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/api/src/routes/tools.ts apps/api/src/routes/index.ts apps/api/src/__tests__/routes/tools.test.ts
git commit -m "feat(api): add GET /api/tools endpoint"
```

---

## Task 3: Tool Update API Route

**Files:**
- Modify: `apps/api/src/routes/tools.ts:50-100`
- Test: `apps/api/src/__tests__/routes/tools.test.ts` (add test)

**Step 1: Write the failing test**

```typescript
// Add to apps/api/src/__tests__/routes/tools.test.ts

describe("PATCH /api/tools/:id", () => {
  it("updates tool custom fields", async () => {
    const db = getDb()
    ;(db.query.mcpTool.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "tool_1",
      serverId: "srv_1",
    })
    ;(db.query.mcpServer.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "srv_1",
      organizationId: "org_1",
    })
    ;(db.query.member.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "mem_1" })

    const mockUpdate = vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: "tool_1",
            customDescription: "Updated description",
            customPrompt: "Always use JSON format",
          }]),
        }),
      }),
    })
    ;(db as any).update = mockUpdate

    const res = await app.request("/api/tools/tool_1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: "session=valid",
      },
      body: JSON.stringify({
        customDescription: "Updated description",
        customPrompt: "Always use JSON format",
      }),
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.tool.customDescription).toBe("Updated description")
  })

  it("rejects invalid isEnabled value", async () => {
    const res = await app.request("/api/tools/tool_1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: "session=valid",
      },
      body: JSON.stringify({
        isEnabled: "maybe", // Invalid value
      }),
    })

    expect(res.status).toBe(400)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test apps/api/src/__tests__/routes/tools.test.ts`
Expected: FAIL

**Step 3: Add PATCH route**

```typescript
// Add to apps/api/src/routes/tools.ts

const updateToolSchema = z.object({
  customDescription: z.string().max(2000).nullable().optional(),
  customPrompt: z.string().max(5000).nullable().optional(),
  isEnabled: z.boolean().optional(),
})

/**
 * PATCH /api/tools/:id
 * Update tool custom configuration
 */
tools.patch("/:id", zValidator("json", updateToolSchema), async (c) => {
  const auth = c.get("auth")
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  const { id } = c.req.param()
  const updates = c.req.valid("json")
  const db = getDb()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dbQuery = (db as any).query

  // Get the tool
  const tool = await dbQuery.mcpTool.findFirst({
    where: eq(mcpTool.id, id),
  })

  if (!tool) {
    return c.json({ error: "Tool not found" }, 404)
  }

  // Get the server to check organization
  const server = await dbQuery.mcpServer.findFirst({
    where: eq(mcpServer.id, tool.serverId),
  })

  if (!server) {
    return c.json({ error: "Server not found" }, 404)
  }

  // Verify user has access
  const membership = await dbQuery.member.findFirst({
    where: and(
      eq(member.userId, auth.userId),
      eq(member.organizationId, server.organizationId)
    ),
  })

  if (!membership) {
    return c.json({ error: "Access denied" }, 403)
  }

  // Build update object
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (updates.customDescription !== undefined) {
    updateData.customDescription = updates.customDescription
  }
  if (updates.customPrompt !== undefined) {
    updateData.customPrompt = updates.customPrompt
  }
  if (updates.isEnabled !== undefined) {
    updateData.isEnabled = updates.isEnabled ? "true" : "false"
  }

  // Update the tool
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await (db as any)
    .update(mcpTool)
    .set(updateData)
    .where(eq(mcpTool.id, id))
    .returning()

  return c.json({
    tool: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      customDescription: updated.customDescription,
      customPrompt: updated.customPrompt,
      isEnabled: updated.isEnabled === "true",
      updatedAt: updated.updatedAt,
    },
  })
})
```

**Step 4: Run test**

Run: `bun test apps/api/src/__tests__/routes/tools.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/routes/tools.ts apps/api/src/__tests__/routes/tools.test.ts
git commit -m "feat(api): add PATCH /api/tools/:id for tool configuration"
```

---

## Task 4: Tools List UI Component

**Files:**
- Create: `apps/platform/src/components/mcp/tool-list.tsx`
- Create: `apps/platform/src/components/mcp/tool-card.tsx`

**Step 1: Create the tool card component**

```tsx
// apps/platform/src/components/mcp/tool-card.tsx
"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Edit2, Eye, EyeOff } from "lucide-react"

interface Tool {
  id: string
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
  customDescription?: string
  customPrompt?: string
  isEnabled: boolean
}

interface ToolCardProps {
  tool: Tool
  onEdit: (tool: Tool) => void
  onToggleEnabled: (toolId: string, enabled: boolean) => void
}

export function ToolCard({ tool, onEdit, onToggleEnabled }: ToolCardProps) {
  const [expanded, setExpanded] = useState(false)

  const displayDescription = tool.customDescription || tool.description

  return (
    <div
      className={`rounded-lg border ${
        tool.isEnabled
          ? "border-gray-200 bg-white"
          : "border-gray-100 bg-gray-50"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600"
        >
          {expanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <h4
            className={`font-medium ${
              tool.isEnabled ? "text-gray-900" : "text-gray-500"
            }`}
          >
            {tool.name}
          </h4>
          {displayDescription && (
            <p className="mt-1 truncate text-sm text-gray-500">
              {displayDescription}
            </p>
          )}
          {tool.customDescription && (
            <span className="mt-1 inline-block rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-600">
              Custom description
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleEnabled(tool.id, !tool.isEnabled)}
            className={`rounded p-1.5 ${
              tool.isEnabled
                ? "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                : "text-gray-300 hover:bg-gray-100 hover:text-gray-500"
            }`}
            title={tool.isEnabled ? "Disable tool" : "Enable tool"}
          >
            {tool.isEnabled ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onEdit(tool)}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            title="Edit tool configuration"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 pl-12">
          {tool.customPrompt && (
            <div className="mb-3">
              <h5 className="text-xs font-medium uppercase text-gray-500">
                Custom Prompt
              </h5>
              <p className="mt-1 text-sm text-gray-700">{tool.customPrompt}</p>
            </div>
          )}

          {tool.inputSchema && (
            <div>
              <h5 className="text-xs font-medium uppercase text-gray-500">
                Input Schema
              </h5>
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 p-2 text-xs text-gray-600">
                {JSON.stringify(tool.inputSchema, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Create the tool list component**

```tsx
// apps/platform/src/components/mcp/tool-list.tsx
"use client"

import { useState, useEffect } from "react"
import { Loader2, Wrench } from "lucide-react"
import { ToolCard } from "./tool-card"
import { ToolEditModal } from "./tool-edit-modal"

interface Tool {
  id: string
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
  customDescription?: string
  customPrompt?: string
  isEnabled: boolean
}

interface ToolListProps {
  serverId: string
}

export function ToolList({ serverId }: ToolListProps) {
  const [tools, setTools] = useState<Tool[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingTool, setEditingTool] = useState<Tool | null>(null)

  const fetchTools = async () => {
    try {
      const response = await fetch(`/api/tools?serverId=${serverId}`)
      if (!response.ok) throw new Error("Failed to fetch tools")
      const data = await response.json()
      setTools(data.tools || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tools")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTools()
  }, [serverId])

  const handleToggleEnabled = async (toolId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/tools/${toolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: enabled }),
      })

      if (!response.ok) throw new Error("Failed to update tool")

      setTools((prev) =>
        prev.map((t) => (t.id === toolId ? { ...t, isEnabled: enabled } : t))
      )
    } catch (err) {
      console.error("Failed to toggle tool:", err)
    }
  }

  const handleSave = async (
    toolId: string,
    updates: { customDescription?: string; customPrompt?: string }
  ) => {
    try {
      const response = await fetch(`/api/tools/${toolId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (!response.ok) throw new Error("Failed to update tool")

      const { tool: updated } = await response.json()
      setTools((prev) =>
        prev.map((t) => (t.id === toolId ? { ...t, ...updated } : t))
      )
      setEditingTool(null)
    } catch (err) {
      console.error("Failed to save tool:", err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    )
  }

  if (tools.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
        <Wrench className="mx-auto h-8 w-8 text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">
          No tools discovered for this server yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          Tools ({tools.length})
        </h3>
        <span className="text-xs text-gray-500">
          {tools.filter((t) => t.isEnabled).length} enabled
        </span>
      </div>

      {tools.map((tool) => (
        <ToolCard
          key={tool.id}
          tool={tool}
          onEdit={setEditingTool}
          onToggleEnabled={handleToggleEnabled}
        />
      ))}

      {editingTool && (
        <ToolEditModal
          tool={editingTool}
          onClose={() => setEditingTool(null)}
          onSave={(updates) => handleSave(editingTool.id, updates)}
        />
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add apps/platform/src/components/mcp/tool-list.tsx apps/platform/src/components/mcp/tool-card.tsx
git commit -m "feat(platform): add tool list and card components"
```

---

## Task 5: Tool Edit Modal

**Files:**
- Create: `apps/platform/src/components/mcp/tool-edit-modal.tsx`

**Step 1: Create the edit modal**

```tsx
// apps/platform/src/components/mcp/tool-edit-modal.tsx
"use client"

import { useState } from "react"
import { X, RotateCcw } from "lucide-react"

interface Tool {
  id: string
  name: string
  description?: string
  customDescription?: string
  customPrompt?: string
}

interface ToolEditModalProps {
  tool: Tool
  onClose: () => void
  onSave: (updates: { customDescription?: string; customPrompt?: string }) => void
}

export function ToolEditModal({ tool, onClose, onSave }: ToolEditModalProps) {
  const [customDescription, setCustomDescription] = useState(
    tool.customDescription || ""
  )
  const [customPrompt, setCustomPrompt] = useState(tool.customPrompt || "")
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      await onSave({
        customDescription: customDescription || null,
        customPrompt: customPrompt || null,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setCustomDescription("")
    setCustomPrompt("")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Configure Tool
            </h2>
            <p className="text-sm text-gray-500">{tool.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-4">
            {/* Original description (read-only) */}
            {tool.description && (
              <div>
                <label className="block text-xs font-medium uppercase text-gray-500">
                  Original Description
                </label>
                <p className="mt-1 rounded bg-gray-50 p-2 text-sm text-gray-600">
                  {tool.description}
                </p>
              </div>
            )}

            {/* Custom description */}
            <div>
              <label
                htmlFor="customDescription"
                className="block text-sm font-medium text-gray-700"
              >
                Custom Description
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Override the tool description shown to AI. Leave empty to use
                original.
              </p>
              <textarea
                id="customDescription"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
                placeholder="Enter a custom description..."
              />
            </div>

            {/* Custom prompt */}
            <div>
              <label
                htmlFor="customPrompt"
                className="block text-sm font-medium text-gray-700"
              >
                Additional Instructions
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Extra context or instructions for the AI when using this tool.
              </p>
              <textarea
                id="customPrompt"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
                placeholder="E.g., 'Always return results in JSON format' or 'Prefer using component IDs over names'"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <RotateCcw className="h-4 w-4" />
              Reset to defaults
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/platform/src/components/mcp/tool-edit-modal.tsx
git commit -m "feat(platform): add tool edit modal component"
```

---

## Task 6: Integrate Tools into Server Detail Page

**Files:**
- Modify: `apps/platform/src/app/dashboard/mcp-servers/[id]/page.tsx`

**Step 1: Add ToolList to server detail page**

```tsx
// In apps/platform/src/app/dashboard/mcp-servers/[id]/page.tsx
// Add import at top:
import { ToolList } from "@/components/mcp/tool-list"

// Add after server details section:
<div className="mt-8">
  <h2 className="mb-4 text-lg font-semibold text-gray-900">Tools</h2>
  <ToolList serverId={server.id} />
</div>
```

**Step 2: Verify the page renders**

Run: `bun run dev` in apps/platform
Navigate to: http://localhost:3000/dashboard/mcp-servers/{any-server-id}
Expected: See tools list below server details

**Step 3: Commit**

```bash
git add apps/platform/src/app/dashboard/mcp-servers/[id]/page.tsx
git commit -m "feat(platform): integrate tool list into server detail page"
```

---

## Task 7: Update Gateway to Use Custom Tool Descriptions

**Files:**
- Modify: `packages/gateway-core/src/aggregator.ts` (or similar)
- Modify: `apps/api/src/routes/gateway.ts:327-339`

**Step 1: Update gateway config response to include tool customizations**

```typescript
// In apps/api/src/routes/gateway.ts, update the servers response:

// Get tools for each server
const serversWithTools = await Promise.all(
  servers.map(async (s) => {
    const serverTools = await dbQuery.mcpTool.findMany({
      where: eq(mcpTool.serverId, s.id),
    })

    return {
      id: s.id,
      name: s.name,
      description: s.description,
      transport: s.transport,
      command: s.command,
      args: s.args,
      url: s.url,
      version: s.version,
      capabilities: s.capabilities,
      status: s.status,
      tools: serverTools
        .filter((t) => t.isEnabled === "true")
        .map((t) => ({
          name: t.name,
          description: t.customDescription || t.description,
          inputSchema: t.inputSchema ? JSON.parse(t.inputSchema) : null,
          customPrompt: t.customPrompt,
        })),
    }
  })
)

return c.json({
  // ... existing fields
  servers: serversWithTools,
})
```

**Step 2: Update gateway-core to use custom descriptions**

The gateway should use `tool.description` from the config (which now contains customDescription if set) when exposing tools to AI apps.

**Step 3: Run type check**

Run: `bun run typecheck:all`
Expected: No type errors

**Step 4: Commit**

```bash
git add apps/api/src/routes/gateway.ts packages/gateway-core/
git commit -m "feat(gateway): use custom tool descriptions from config"
```

---

## Task 8: Integration Test

**Step 1: Test the full flow**

1. Create an MCP server in the dashboard
2. Wait for tools to be discovered
3. Navigate to server detail page
4. Click edit on a tool
5. Add custom description and prompt
6. Save changes
7. Verify in database that values are stored
8. Trigger gateway config refresh
9. Verify custom description is returned in config

**Step 2: Final commit**

```bash
git add .
git commit -m "feat: complete tool configuration implementation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Extend DB schema | `packages/db/src/schema/*/mcp-servers.ts` |
| 2 | Tools list API | `apps/api/src/routes/tools.ts` |
| 3 | Tool update API | Same file, PATCH route |
| 4 | Tool list UI | Components |
| 5 | Tool edit modal | Modal component |
| 6 | Server page integration | Page update |
| 7 | Gateway config update | API + gateway-core |
| 8 | Integration test | Manual verification |

**Total estimated commits:** 8
