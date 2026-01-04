# MCP Install Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Streamline MCP server installation with JSON config paste, OAuth guidance, and a pre-seeded registry of tested MCPs.

**Architecture:** Enhance MCP server creation form with JSON import, add OAuth detection and guidance UI, seed the registry with verified MCP configs for popular services (Figma, Sentry, Linear, etc.).

**Tech Stack:** Next.js 15 (App Router), React 18, Hono API, Drizzle ORM, Tailwind CSS, Zod validation

---

## Task 1: JSON Config Parser Utility

**Files:**
- Create: `apps/platform/src/lib/mcp-config-parser.ts`
- Test: `apps/platform/src/lib/__tests__/mcp-config-parser.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/platform/src/lib/__tests__/mcp-config-parser.test.ts
import { describe, it, expect } from "vitest"
import { parseMcpConfig, type ParsedMcpConfig } from "../mcp-config-parser"

describe("parseMcpConfig", () => {
  it("parses Claude Desktop format", () => {
    const input = `{
      "mcpServers": {
        "figma": {
          "command": "npx",
          "args": ["-y", "@anthropic/mcp-figma"],
          "env": {
            "FIGMA_ACCESS_TOKEN": "your-token"
          }
        }
      }
    }`

    const result = parseMcpConfig(input)

    expect(result.success).toBe(true)
    expect(result.servers).toHaveLength(1)
    expect(result.servers[0].name).toBe("figma")
    expect(result.servers[0].transport).toBe("stdio")
    expect(result.servers[0].command).toBe("npx")
    expect(result.servers[0].args).toEqual(["-y", "@anthropic/mcp-figma"])
    expect(result.servers[0].envVars).toEqual([
      { key: "FIGMA_ACCESS_TOKEN", value: "your-token", isSecret: true },
    ])
  })

  it("parses SSE server format", () => {
    const input = `{
      "mcpServers": {
        "custom-api": {
          "url": "https://api.example.com/mcp/sse"
        }
      }
    }`

    const result = parseMcpConfig(input)

    expect(result.success).toBe(true)
    expect(result.servers[0].transport).toBe("sse")
    expect(result.servers[0].url).toBe("https://api.example.com/mcp/sse")
  })

  it("handles multiple servers", () => {
    const input = `{
      "mcpServers": {
        "figma": { "command": "npx", "args": ["@figma/mcp"] },
        "sentry": { "command": "npx", "args": ["@sentry/mcp"] }
      }
    }`

    const result = parseMcpConfig(input)

    expect(result.success).toBe(true)
    expect(result.servers).toHaveLength(2)
  })

  it("returns error for invalid JSON", () => {
    const result = parseMcpConfig("not json")

    expect(result.success).toBe(false)
    expect(result.error).toContain("Invalid JSON")
  })

  it("returns error for missing mcpServers key", () => {
    const result = parseMcpConfig('{"servers": {}}')

    expect(result.success).toBe(false)
    expect(result.error).toContain("mcpServers")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `bun test apps/platform/src/lib/__tests__/mcp-config-parser.test.ts`
Expected: FAIL - module not found

**Step 3: Create the parser**

```typescript
// apps/platform/src/lib/mcp-config-parser.ts
import { z } from "zod"

export interface EnvVar {
  key: string
  value: string
  isSecret: boolean
}

export interface ParsedMcpServer {
  name: string
  transport: "stdio" | "sse"
  command?: string
  args?: string[]
  url?: string
  envVars: EnvVar[]
}

export interface ParsedMcpConfig {
  success: boolean
  servers: ParsedMcpServer[]
  error?: string
}

const mcpServerSchema = z.object({
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().url().optional(),
  env: z.record(z.string()).optional(),
})

const mcpConfigSchema = z.object({
  mcpServers: z.record(mcpServerSchema),
})

// Common secret key patterns
const SECRET_PATTERNS = [
  /token/i,
  /key/i,
  /secret/i,
  /password/i,
  /credential/i,
  /api_key/i,
  /apikey/i,
  /auth/i,
]

function isSecretKey(key: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(key))
}

export function parseMcpConfig(jsonString: string): ParsedMcpConfig {
  // Try to parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    return {
      success: false,
      servers: [],
      error: "Invalid JSON: Could not parse the configuration",
    }
  }

  // Validate structure
  const result = mcpConfigSchema.safeParse(parsed)
  if (!result.success) {
    const issues = result.error.issues
    if (issues.some((i) => i.path.includes("mcpServers"))) {
      return {
        success: false,
        servers: [],
        error: 'Missing or invalid "mcpServers" key in configuration',
      }
    }
    return {
      success: false,
      servers: [],
      error: `Invalid configuration: ${issues[0]?.message || "Unknown error"}`,
    }
  }

  // Parse servers
  const servers: ParsedMcpServer[] = []

  for (const [name, config] of Object.entries(result.data.mcpServers)) {
    const transport = config.url ? "sse" : "stdio"

    const envVars: EnvVar[] = []
    if (config.env) {
      for (const [key, value] of Object.entries(config.env)) {
        envVars.push({
          key,
          value,
          isSecret: isSecretKey(key),
        })
      }
    }

    servers.push({
      name,
      transport,
      command: config.command,
      args: config.args,
      url: config.url,
      envVars,
    })
  }

  return {
    success: true,
    servers,
  }
}

/**
 * Format servers back to Claude Desktop JSON format
 */
export function formatMcpConfig(servers: ParsedMcpServer[]): string {
  const mcpServers: Record<string, unknown> = {}

  for (const server of servers) {
    const config: Record<string, unknown> = {}

    if (server.transport === "stdio") {
      if (server.command) config.command = server.command
      if (server.args?.length) config.args = server.args
    } else {
      if (server.url) config.url = server.url
    }

    if (server.envVars.length > 0) {
      config.env = Object.fromEntries(
        server.envVars.map((v) => [v.key, v.value])
      )
    }

    mcpServers[server.name] = config
  }

  return JSON.stringify({ mcpServers }, null, 2)
}
```

**Step 4: Run test**

Run: `bun test apps/platform/src/lib/__tests__/mcp-config-parser.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/platform/src/lib/mcp-config-parser.ts apps/platform/src/lib/__tests__/mcp-config-parser.test.ts
git commit -m "feat(platform): add MCP config JSON parser"
```

---

## Task 2: JSON Import UI Component

**Files:**
- Create: `apps/platform/src/components/mcp/json-import-modal.tsx`

**Step 1: Create the modal component**

```tsx
// apps/platform/src/components/mcp/json-import-modal.tsx
"use client"

import { useState } from "react"
import { X, FileJson, AlertCircle, CheckCircle } from "lucide-react"
import {
  parseMcpConfig,
  type ParsedMcpServer,
} from "@/lib/mcp-config-parser"

interface JsonImportModalProps {
  onClose: () => void
  onImport: (servers: ParsedMcpServer[]) => void
}

export function JsonImportModal({ onClose, onImport }: JsonImportModalProps) {
  const [jsonInput, setJsonInput] = useState("")
  const [parseResult, setParseResult] = useState<{
    success: boolean
    servers: ParsedMcpServer[]
    error?: string
  } | null>(null)

  const handleParse = () => {
    const result = parseMcpConfig(jsonInput)
    setParseResult(result)
  }

  const handleImport = () => {
    if (parseResult?.success && parseResult.servers.length > 0) {
      onImport(parseResult.servers)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <FileJson className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">
              Import from JSON
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="mb-4 text-sm text-gray-600">
            Paste your MCP configuration JSON from Claude Desktop, Cursor, or
            any MCP-compatible app. We'll parse it and help you set up the
            servers.
          </p>

          <div className="mb-4">
            <label
              htmlFor="jsonConfig"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Configuration JSON
            </label>
            <textarea
              id="jsonConfig"
              value={jsonInput}
              onChange={(e) => {
                setJsonInput(e.target.value)
                setParseResult(null)
              }}
              rows={10}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
              placeholder={`{
  "mcpServers": {
    "figma": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-figma"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your-token"
      }
    }
  }
}`}
            />
          </div>

          {/* Parse button */}
          {!parseResult && (
            <button
              type="button"
              onClick={handleParse}
              disabled={!jsonInput.trim()}
              className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              Parse Configuration
            </button>
          )}

          {/* Parse result */}
          {parseResult && (
            <div
              className={`rounded-lg border p-4 ${
                parseResult.success
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              {parseResult.success ? (
                <div>
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">
                      Found {parseResult.servers.length} server
                      {parseResult.servers.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {parseResult.servers.map((server, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between rounded bg-white px-3 py-2"
                      >
                        <span className="font-medium text-gray-900">
                          {server.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {server.transport.toUpperCase()}
                          {server.envVars.length > 0 &&
                            ` • ${server.envVars.length} env vars`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <span>{parseResult.error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!parseResult?.success || parseResult.servers.length === 0}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            Import {parseResult?.servers.length || 0} Server
            {(parseResult?.servers.length || 0) !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/platform/src/components/mcp/json-import-modal.tsx
git commit -m "feat(platform): add JSON import modal for MCP config"
```

---

## Task 3: Integrate JSON Import into MCP Servers Page

**Files:**
- Modify: `apps/platform/src/app/dashboard/mcp-servers/page.tsx`
- Modify: `apps/platform/src/app/dashboard/mcp-servers/new/page.tsx`

**Step 1: Add import button to servers list page**

```tsx
// In apps/platform/src/app/dashboard/mcp-servers/page.tsx
// Add state and handler:
const [showJsonImport, setShowJsonImport] = useState(false)
const router = useRouter()

const handleImport = async (servers: ParsedMcpServer[]) => {
  // For now, redirect to new page with first server pre-filled
  // Full implementation would batch-create all servers
  const params = new URLSearchParams({
    name: servers[0].name,
    transport: servers[0].transport,
    command: servers[0].command || "",
    args: servers[0].args?.join(" ") || "",
    url: servers[0].url || "",
  })
  router.push(`/dashboard/mcp-servers/new?${params.toString()}`)
  setShowJsonImport(false)
}

// Add button next to "New server" button:
<button
  type="button"
  onClick={() => setShowJsonImport(true)}
  className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
>
  <FileJson className="h-4 w-4" />
  Import JSON
</button>

// Add modal at bottom:
{showJsonImport && (
  <JsonImportModal
    onClose={() => setShowJsonImport(false)}
    onImport={handleImport}
  />
)}
```

**Step 2: Update new server page to accept query params**

```tsx
// In apps/platform/src/app/dashboard/mcp-servers/new/page.tsx
// Use searchParams to pre-fill form:
const searchParams = useSearchParams()

const [formData, setFormData] = useState({
  name: searchParams.get("name") || "",
  transport: searchParams.get("transport") || "stdio",
  command: searchParams.get("command") || "",
  args: searchParams.get("args") || "",
  url: searchParams.get("url") || "",
})
```

**Step 3: Commit**

```bash
git add apps/platform/src/app/dashboard/mcp-servers/page.tsx apps/platform/src/app/dashboard/mcp-servers/new/page.tsx
git commit -m "feat(platform): integrate JSON import into MCP servers page"
```

---

## Task 4: OAuth Detection and Guidance

**Files:**
- Create: `apps/platform/src/lib/mcp-oauth-detection.ts`
- Create: `apps/platform/src/components/mcp/oauth-setup-guide.tsx`

**Step 1: Create OAuth detection utility**

```typescript
// apps/platform/src/lib/mcp-oauth-detection.ts

export interface OAuthProvider {
  name: string
  displayName: string
  authUrl: string
  docsUrl: string
  envVarNames: string[]
  instructions: string[]
}

export const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
  figma: {
    name: "figma",
    displayName: "Figma",
    authUrl: "https://www.figma.com/developers/api#access-tokens",
    docsUrl: "https://www.figma.com/developers/api",
    envVarNames: ["FIGMA_ACCESS_TOKEN", "FIGMA_TOKEN"],
    instructions: [
      "Go to Figma Settings → Account → Personal Access Tokens",
      "Click 'Create new token'",
      "Give it a descriptive name (e.g., 'athreei MCP')",
      "Copy the token and paste it below",
    ],
  },
  sentry: {
    name: "sentry",
    displayName: "Sentry",
    authUrl: "https://sentry.io/settings/account/api/auth-tokens/",
    docsUrl: "https://docs.sentry.io/api/",
    envVarNames: ["SENTRY_AUTH_TOKEN", "SENTRY_TOKEN"],
    instructions: [
      "Go to Sentry Settings → Account → API → Auth Tokens",
      "Click 'Create New Token'",
      "Select required scopes (project:read, org:read)",
      "Copy the token and paste it below",
    ],
  },
  linear: {
    name: "linear",
    displayName: "Linear",
    authUrl: "https://linear.app/settings/api",
    docsUrl: "https://developers.linear.app/docs",
    envVarNames: ["LINEAR_API_KEY", "LINEAR_TOKEN"],
    instructions: [
      "Go to Linear Settings → Account → API",
      "Click 'Create new API key'",
      "Choose a label (e.g., 'athreei MCP')",
      "Copy the key and paste it below",
    ],
  },
  github: {
    name: "github",
    displayName: "GitHub",
    authUrl: "https://github.com/settings/tokens",
    docsUrl: "https://docs.github.com/en/rest",
    envVarNames: ["GITHUB_TOKEN", "GITHUB_PERSONAL_ACCESS_TOKEN"],
    instructions: [
      "Go to GitHub Settings → Developer settings → Personal access tokens",
      "Click 'Generate new token (classic)' or use fine-grained tokens",
      "Select required scopes for your use case",
      "Copy the token and paste it below",
    ],
  },
  notion: {
    name: "notion",
    displayName: "Notion",
    authUrl: "https://www.notion.so/my-integrations",
    docsUrl: "https://developers.notion.com/",
    envVarNames: ["NOTION_API_KEY", "NOTION_TOKEN"],
    instructions: [
      "Go to notion.so/my-integrations",
      "Click 'New integration'",
      "Give it a name and select workspace",
      "Copy the 'Internal Integration Token'",
    ],
  },
}

/**
 * Detect if an MCP server needs OAuth based on its env vars
 */
export function detectOAuthProvider(
  envVarNames: string[]
): OAuthProvider | null {
  for (const [, provider] of Object.entries(OAUTH_PROVIDERS)) {
    for (const envVar of envVarNames) {
      if (provider.envVarNames.some((pv) => pv.toLowerCase() === envVar.toLowerCase())) {
        return provider
      }
    }
  }
  return null
}

/**
 * Check if a server name matches a known OAuth provider
 */
export function detectOAuthProviderByName(
  serverName: string
): OAuthProvider | null {
  const normalized = serverName.toLowerCase()
  for (const [key, provider] of Object.entries(OAUTH_PROVIDERS)) {
    if (normalized.includes(key)) {
      return provider
    }
  }
  return null
}
```

**Step 2: Create OAuth setup guide component**

```tsx
// apps/platform/src/components/mcp/oauth-setup-guide.tsx
"use client"

import { ExternalLink, Key, ChevronRight } from "lucide-react"
import type { OAuthProvider } from "@/lib/mcp-oauth-detection"

interface OAuthSetupGuideProps {
  provider: OAuthProvider
  envVarName: string
  onTokenChange: (value: string) => void
  currentValue: string
}

export function OAuthSetupGuide({
  provider,
  envVarName,
  onTokenChange,
  currentValue,
}: OAuthSetupGuideProps) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start gap-3">
        <Key className="mt-0.5 h-5 w-5 text-blue-500" />
        <div className="flex-1">
          <h4 className="font-medium text-blue-900">
            {provider.displayName} Authentication Required
          </h4>
          <p className="mt-1 text-sm text-blue-700">
            This MCP server needs a {provider.displayName} access token to work.
          </p>

          {/* Instructions */}
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium uppercase text-blue-600">
              Setup Instructions
            </p>
            <ol className="space-y-1.5 text-sm text-blue-800">
              {provider.instructions.map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-medium text-blue-700">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Token input */}
          <div className="mt-4">
            <label
              htmlFor="oauth-token"
              className="mb-1 block text-sm font-medium text-blue-900"
            >
              {envVarName}
            </label>
            <input
              id="oauth-token"
              type="password"
              value={currentValue}
              onChange={(e) => onTokenChange(e.target.value)}
              placeholder="Paste your token here..."
              className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
          </div>

          {/* Links */}
          <div className="mt-3 flex gap-4">
            <a
              href={provider.authUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              Get token
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              API Docs
              <ChevronRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add apps/platform/src/lib/mcp-oauth-detection.ts apps/platform/src/components/mcp/oauth-setup-guide.tsx
git commit -m "feat(platform): add OAuth detection and setup guide"
```

---

## Task 5: Integrate OAuth Guide into MCP Server Form

**Files:**
- Modify: `apps/platform/src/components/mcp/mcp-server-form.tsx`

**Step 1: Add OAuth detection to form**

```tsx
// In apps/platform/src/components/mcp/mcp-server-form.tsx
// Add imports:
import {
  detectOAuthProviderByName,
  detectOAuthProvider,
} from "@/lib/mcp-oauth-detection"
import { OAuthSetupGuide } from "./oauth-setup-guide"

// Add state for detected provider:
const [oauthProvider, setOAuthProvider] = useState<OAuthProvider | null>(null)

// Detect OAuth when name changes:
useEffect(() => {
  const provider = detectOAuthProviderByName(formData.name)
  setOAuthProvider(provider)
}, [formData.name])

// Also detect from env vars:
useEffect(() => {
  if (!oauthProvider && formData.envVars?.length) {
    const envVarNames = formData.envVars.map((v) => v.key)
    const provider = detectOAuthProvider(envVarNames)
    setOAuthProvider(provider)
  }
}, [formData.envVars, oauthProvider])

// Add guide component before env vars section:
{oauthProvider && (
  <OAuthSetupGuide
    provider={oauthProvider}
    envVarName={oauthProvider.envVarNames[0]}
    currentValue={
      formData.envVars?.find((v) =>
        oauthProvider.envVarNames.includes(v.key)
      )?.value || ""
    }
    onTokenChange={(value) => {
      // Update or add the env var
      const existingIndex = formData.envVars?.findIndex((v) =>
        oauthProvider.envVarNames.includes(v.key)
      )
      const newEnvVars = [...(formData.envVars || [])]
      if (existingIndex !== undefined && existingIndex >= 0) {
        newEnvVars[existingIndex].value = value
      } else {
        newEnvVars.push({ key: oauthProvider.envVarNames[0], value })
      }
      setFormData({ ...formData, envVars: newEnvVars })
    }}
  />
)}
```

**Step 2: Commit**

```bash
git add apps/platform/src/components/mcp/mcp-server-form.tsx
git commit -m "feat(platform): integrate OAuth guide into MCP server form"
```

---

## Task 6: Seed Registry with Tested MCPs

**Files:**
- Create: `packages/db/src/seed/mcp-registry.ts`
- Modify: `packages/db/src/seed/index.ts`

**Step 1: Create registry seed data**

```typescript
// packages/db/src/seed/mcp-registry.ts
export interface RegistryMcpServer {
  slug: string
  name: string
  description: string
  publisher: string
  iconUrl?: string
  transport: "stdio" | "sse"
  command?: string
  args?: string[]
  url?: string
  docsUrl: string
  envVars: Array<{
    name: string
    description: string
    required: boolean
  }>
  categories: string[]
  verified: boolean
}

export const REGISTRY_SERVERS: RegistryMcpServer[] = [
  {
    slug: "figma",
    name: "Figma MCP",
    description:
      "Access Figma files, components, and design tokens. Read designs, export assets, and inspect component properties.",
    publisher: "Anthropic",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@anthropic/mcp-figma"],
    docsUrl: "https://github.com/anthropics/mcp-figma",
    envVars: [
      {
        name: "FIGMA_ACCESS_TOKEN",
        description: "Your Figma personal access token",
        required: true,
      },
    ],
    categories: ["design", "productivity"],
    verified: true,
  },
  {
    slug: "sentry",
    name: "Sentry MCP",
    description:
      "Query Sentry for errors, issues, and performance data. Get stack traces, error counts, and project health.",
    publisher: "Sentry",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@sentry/mcp-server"],
    docsUrl: "https://github.com/getsentry/sentry-mcp",
    envVars: [
      {
        name: "SENTRY_AUTH_TOKEN",
        description: "Sentry authentication token with project:read scope",
        required: true,
      },
    ],
    categories: ["monitoring", "devtools"],
    verified: true,
  },
  {
    slug: "linear",
    name: "Linear MCP",
    description:
      "Manage Linear issues, projects, and cycles. Create tickets, update status, and query your backlog.",
    publisher: "Linear",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@linear/mcp-server"],
    docsUrl: "https://github.com/linear/linear-mcp",
    envVars: [
      {
        name: "LINEAR_API_KEY",
        description: "Your Linear API key",
        required: true,
      },
    ],
    categories: ["project-management", "productivity"],
    verified: true,
  },
  {
    slug: "github",
    name: "GitHub MCP",
    description:
      "Interact with GitHub repositories, issues, and pull requests. Search code, create issues, and review PRs.",
    publisher: "GitHub",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@github/mcp-server"],
    docsUrl: "https://github.com/github/github-mcp",
    envVars: [
      {
        name: "GITHUB_TOKEN",
        description: "GitHub personal access token",
        required: true,
      },
    ],
    categories: ["devtools", "code"],
    verified: true,
  },
  {
    slug: "notion",
    name: "Notion MCP",
    description:
      "Access Notion pages, databases, and blocks. Search content, create pages, and query databases.",
    publisher: "Notion",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@notionhq/mcp-server"],
    docsUrl: "https://github.com/makenotion/notion-mcp",
    envVars: [
      {
        name: "NOTION_API_KEY",
        description: "Notion internal integration token",
        required: true,
      },
    ],
    categories: ["productivity", "documentation"],
    verified: true,
  },
  {
    slug: "slack",
    name: "Slack MCP",
    description:
      "Send messages, search conversations, and manage Slack channels. Integrate AI into your team communication.",
    publisher: "Slack",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@slack/mcp-server"],
    docsUrl: "https://github.com/slackapi/slack-mcp",
    envVars: [
      {
        name: "SLACK_BOT_TOKEN",
        description: "Slack bot OAuth token (xoxb-...)",
        required: true,
      },
    ],
    categories: ["communication", "productivity"],
    verified: true,
  },
]
```

**Step 2: Create API endpoint for registry**

```typescript
// apps/api/src/routes/registry.ts
import { Hono } from "hono"
import { REGISTRY_SERVERS } from "@athreei/db/seed/mcp-registry"

const registry = new Hono()

/**
 * GET /api/registry
 * List all available MCP servers in the public registry
 */
registry.get("/", async (c) => {
  const category = c.req.query("category")
  const search = c.req.query("search")?.toLowerCase()

  let servers = REGISTRY_SERVERS

  if (category) {
    servers = servers.filter((s) => s.categories.includes(category))
  }

  if (search) {
    servers = servers.filter(
      (s) =>
        s.name.toLowerCase().includes(search) ||
        s.description.toLowerCase().includes(search) ||
        s.publisher.toLowerCase().includes(search)
    )
  }

  return c.json({
    servers: servers.map((s) => ({
      slug: s.slug,
      name: s.name,
      description: s.description,
      publisher: s.publisher,
      iconUrl: s.iconUrl,
      categories: s.categories,
      verified: s.verified,
    })),
    total: servers.length,
  })
})

/**
 * GET /api/registry/:slug
 * Get details for a specific MCP server
 */
registry.get("/:slug", async (c) => {
  const { slug } = c.req.param()
  const server = REGISTRY_SERVERS.find((s) => s.slug === slug)

  if (!server) {
    return c.json({ error: "Server not found" }, 404)
  }

  return c.json({ server })
})

export default registry
```

**Step 3: Register route**

```typescript
// In apps/api/src/routes/index.ts
import registry from "./registry"
app.route("/api/registry", registry)
```

**Step 4: Commit**

```bash
git add packages/db/src/seed/mcp-registry.ts apps/api/src/routes/registry.ts apps/api/src/routes/index.ts
git commit -m "feat(api): add MCP registry with seeded servers"
```

---

## Task 7: Update Registry UI to Use Real Data

**Files:**
- Modify: `apps/platform/src/app/dashboard/registry/page.tsx`
- Create: `apps/platform/src/components/registry/registry-card.tsx`

**Step 1: Create registry card component**

```tsx
// apps/platform/src/components/registry/registry-card.tsx
"use client"

import { CheckCircle, Plus } from "lucide-react"
import Link from "next/link"

interface RegistryServer {
  slug: string
  name: string
  description: string
  publisher: string
  iconUrl?: string
  categories: string[]
  verified: boolean
}

interface RegistryCardProps {
  server: RegistryServer
}

export function RegistryCard({ server }: RegistryCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {server.iconUrl ? (
            <img
              src={server.iconUrl}
              alt={server.name}
              className="h-10 w-10 rounded-lg"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-lg font-bold text-gray-500">
              {server.name[0]}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900">{server.name}</h3>
              {server.verified && (
                <CheckCircle className="h-4 w-4 text-blue-500" title="Verified" />
              )}
            </div>
            <p className="text-xs text-gray-500">by {server.publisher}</p>
          </div>
        </div>

        <Link
          href={`/dashboard/registry/${server.slug}`}
          className="rounded-lg bg-gray-900 p-2 text-white hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
        </Link>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-gray-600">
        {server.description}
      </p>

      <div className="mt-3 flex flex-wrap gap-1">
        {server.categories.map((cat) => (
          <span
            key={cat}
            className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
          >
            {cat}
          </span>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Update registry page**

```tsx
// apps/platform/src/app/dashboard/registry/page.tsx
"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { RegistryCard } from "@/components/registry/registry-card"
import { Search, Loader2 } from "lucide-react"

interface RegistryServer {
  slug: string
  name: string
  description: string
  publisher: string
  iconUrl?: string
  categories: string[]
  verified: boolean
}

export default function RegistryPage() {
  const [servers, setServers] = useState<RegistryServer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const params = new URLSearchParams()
        if (search) params.set("search", search)

        const response = await fetch(`/api/registry?${params.toString()}`)
        if (!response.ok) throw new Error("Failed to fetch")
        const data = await response.json()
        setServers(data.servers || [])
      } catch {
        console.error("Failed to fetch registry")
      } finally {
        setIsLoading(false)
      }
    }

    const debounce = setTimeout(fetchServers, 300)
    return () => clearTimeout(debounce)
  }, [search])

  return (
    <div>
      <PageHeader
        title="MCP Registry"
        description="Browse and install verified MCP servers"
      />

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search MCP servers..."
          className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : servers.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <p className="text-gray-500">No MCP servers found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {servers.map((server) => (
            <RegistryCard key={server.slug} server={server} />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add apps/platform/src/app/dashboard/registry/page.tsx apps/platform/src/components/registry/registry-card.tsx
git commit -m "feat(platform): update registry page with real data"
```

---

## Task 8: One-Click Install from Registry

**Files:**
- Modify: `apps/platform/src/app/dashboard/registry/[slug]/page.tsx`

**Step 1: Create registry detail page with install flow**

```tsx
// apps/platform/src/app/dashboard/registry/[slug]/page.tsx
"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, ExternalLink, Loader2, Plus } from "lucide-react"
import Link from "next/link"
import { OAuthSetupGuide } from "@/components/mcp/oauth-setup-guide"
import { OAUTH_PROVIDERS } from "@/lib/mcp-oauth-detection"

interface RegistryServer {
  slug: string
  name: string
  description: string
  publisher: string
  transport: "stdio" | "sse"
  command?: string
  args?: string[]
  url?: string
  docsUrl: string
  envVars: Array<{
    name: string
    description: string
    required: boolean
  }>
  categories: string[]
  verified: boolean
}

export default function RegistryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const router = useRouter()
  const [server, setServer] = useState<RegistryServer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInstalling, setIsInstalling] = useState(false)
  const [envValues, setEnvValues] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchServer = async () => {
      try {
        const response = await fetch(`/api/registry/${slug}`)
        if (!response.ok) throw new Error("Not found")
        const data = await response.json()
        setServer(data.server)
      } catch {
        router.push("/dashboard/registry")
      } finally {
        setIsLoading(false)
      }
    }
    fetchServer()
  }, [slug, router])

  const handleInstall = async () => {
    if (!server) return

    setIsInstalling(true)
    try {
      // Create the MCP server via API
      const response = await fetch("/api/mcp-servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: server.name,
          description: server.description,
          transport: server.transport,
          command: server.command,
          args: server.args?.join(" "),
          url: server.url,
          envVars: server.envVars.map((v) => ({
            key: v.name,
            value: envValues[v.name] || "",
          })),
        }),
      })

      if (!response.ok) throw new Error("Failed to install")

      const { mcpServer } = await response.json()
      router.push(`/dashboard/mcp-servers/${mcpServer.id}`)
    } catch (error) {
      console.error("Install failed:", error)
    } finally {
      setIsInstalling(false)
    }
  }

  if (isLoading || !server) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const oauthProvider = OAUTH_PROVIDERS[server.slug]
  const requiredEnvVars = server.envVars.filter((v) => v.required)
  const allRequiredFilled = requiredEnvVars.every(
    (v) => envValues[v.name]?.trim()
  )

  return (
    <div className="max-w-2xl">
      {/* Back link */}
      <Link
        href="/dashboard/registry"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to registry
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-100 text-2xl font-bold text-gray-500">
          {server.name[0]}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{server.name}</h1>
            {server.verified && (
              <CheckCircle className="h-5 w-5 text-blue-500" />
            )}
          </div>
          <p className="text-gray-500">by {server.publisher}</p>
        </div>
      </div>

      <p className="mb-6 text-gray-600">{server.description}</p>

      {/* OAuth Guide or Env Vars */}
      {oauthProvider ? (
        <div className="mb-6">
          <OAuthSetupGuide
            provider={oauthProvider}
            envVarName={oauthProvider.envVarNames[0]}
            currentValue={envValues[oauthProvider.envVarNames[0]] || ""}
            onTokenChange={(value) =>
              setEnvValues({ ...envValues, [oauthProvider.envVarNames[0]]: value })
            }
          />
        </div>
      ) : server.envVars.length > 0 ? (
        <div className="mb-6 space-y-4">
          <h3 className="font-medium text-gray-900">Configuration</h3>
          {server.envVars.map((envVar) => (
            <div key={envVar.name}>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {envVar.name}
                {envVar.required && <span className="text-red-500"> *</span>}
              </label>
              <p className="mb-1 text-xs text-gray-500">{envVar.description}</p>
              <input
                type="password"
                value={envValues[envVar.name] || ""}
                onChange={(e) =>
                  setEnvValues({ ...envValues, [envVar.name]: e.target.value })
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
            </div>
          ))}
        </div>
      ) : null}

      {/* Install button */}
      <button
        type="button"
        onClick={handleInstall}
        disabled={!allRequiredFilled || isInstalling}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-3 font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {isInstalling ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Installing...
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Install {server.name}
          </>
        )}
      </button>

      {/* Docs link */}
      <div className="mt-4 text-center">
        <a
          href={server.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          View documentation
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/platform/src/app/dashboard/registry/[slug]/page.tsx
git commit -m "feat(platform): add one-click install from registry"
```

---

## Task 9: Integration Test

**Step 1: Test the full flow**

1. Navigate to Registry page
2. Search for "Figma"
3. Click on Figma MCP
4. See OAuth setup guide
5. Enter a test token
6. Click Install
7. Verify server is created

**Step 2: Test JSON import**

1. Navigate to MCP Servers page
2. Click "Import JSON"
3. Paste a Claude Desktop config
4. See parsed servers
5. Click Import
6. Verify redirected to new server form

**Step 3: Final commit**

```bash
git add .
git commit -m "feat(platform): complete MCP install polish implementation"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | JSON config parser | `lib/mcp-config-parser.ts`, tests |
| 2 | JSON import modal | Component |
| 3 | Integrate JSON import | Page updates |
| 4 | OAuth detection | Utility + guide component |
| 5 | OAuth in form | Form integration |
| 6 | Seed registry | DB seed + API route |
| 7 | Registry UI | Updated page + card |
| 8 | One-click install | Detail page with install |
| 9 | Integration test | Manual verification |

**Total estimated commits:** 9
