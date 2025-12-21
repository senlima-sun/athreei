# Developer Guide

This guide covers development setup, architecture, and contribution guidelines for athreei.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Package Overview](#package-overview)
- [Development Workflow](#development-workflow)
- [Architecture Deep Dive](#architecture-deep-dive)
- [Adding New MCP Tools](#adding-new-mcp-tools)
- [Testing](#testing)
- [Code Style](#code-style)
- [Building for Production](#building-for-production)
- [Contributing](#contributing)

## Development Setup

### Prerequisites

- **Bun** >= 1.0 (runtime and package manager)
- **Node.js** >= 18 (for some tooling)
- **Chrome** or Chromium-based browser
- **PostgreSQL** (for sync-server development)
- **Docker** (optional, for PostgreSQL)

### Installation

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Clone the repository
git clone https://github.com/yourusername/athreei.git
cd athreei

# Install all dependencies
bun install
```

### Environment Setup

For sync-server development, create `.env`:

```bash
cd packages/sync-server
cp .env.example .env
# Edit .env with your PostgreSQL connection string
```

Start PostgreSQL with Docker:

```bash
docker-compose up -d
```

Run database migrations:

```bash
cd packages/sync-server
bun run migrate
```

## Project Structure

```
athreei/
├── packages/
│   ├── mcp-server/           # Local MCP server
│   │   ├── src/
│   │   │   ├── index.ts      # Entry point, CLI args
│   │   │   ├── server.ts     # MCP server setup
│   │   │   ├── tools/        # MCP tool implementations
│   │   │   ├── bridge/       # Native messaging bridge
│   │   │   ├── db/           # SQLite database layer
│   │   │   └── utils/        # Utilities (logger, etc.)
│   │   └── package.json
│   │
│   ├── extension/            # Chrome extension
│   │   ├── src/
│   │   │   ├── background/   # Service worker
│   │   │   ├── content/      # Content scripts
│   │   │   │   ├── a11y/     # Accessibility tree reader
│   │   │   │   ├── actions/  # Action handlers
│   │   │   │   └── ...
│   │   │   └── popup/        # Popup UI (optional)
│   │   ├── manifest.json
│   │   └── package.json
│   │
│   ├── dashboard/            # Web dashboard
│   │   ├── src/
│   │   │   ├── api/          # Hono backend
│   │   │   ├── components/   # React components
│   │   │   └── lib/          # Utilities
│   │   └── package.json
│   │
│   ├── shared/               # Shared code
│   │   ├── src/
│   │   │   ├── types/        # TypeScript types
│   │   │   └── crypto/       # Encryption utilities
│   │   └── package.json
│   │
│   ├── native-host/          # Native messaging binary
│   │   ├── src/
│   │   │   ├── index.ts      # Entry point
│   │   │   ├── protocol.ts   # Message protocol
│   │   │   └── handlers.ts   # Request handlers
│   │   └── package.json
│   │
│   └── sync-server/          # E2E encrypted sync
│       ├── src/
│       │   ├── index.ts      # Server entry
│       │   ├── routes/       # API routes
│       │   └── db/           # Database layer
│       └── package.json
│
├── apps/
│   └── web/                  # Marketing site
│
├── package.json              # Root workspace config
├── tsconfig.json             # Base TypeScript config
├── CLAUDE.md                 # Development guidelines
└── PLAN.md                   # Implementation roadmap
```

## Package Overview

### packages/mcp-server

The core local MCP server that AI apps connect to.

**Key files:**

- `src/server.ts` - Creates and configures the MCP server
- `src/tools/browser.ts` - Registers all 11 browser tools
- `src/bridge/native-messaging.ts` - Handles Chrome extension communication
- `src/db/repositories/` - Database access layer

**Important:** All logging must go to stderr (`console.error` or logger utility) because stdout is reserved for JSON-RPC communication.

```bash
cd packages/mcp-server
bun run dev        # Watch mode
bun run start      # Run compiled
bun test           # Run tests
```

### packages/extension

Chrome extension (Manifest V3) with content scripts for browser automation.

**Key files:**

- `src/background/index.ts` - Service worker managing native host
- `src/content/index.ts` - Content script entry point
- `src/content/a11y/index.ts` - Accessibility tree builder
- `src/content/actions/` - Action handlers (click, type, scroll, etc.)
- `src/content/website-bridge.ts` - Website integration via `aiii:*` events

```bash
cd packages/extension
bun run dev        # Watch mode
bun run build      # Build to dist/
bun test           # Run tests
```

### packages/dashboard

React web dashboard for audit logs and permission management.

**Key files:**

- `src/api/server.ts` - Standalone Hono API server
- `src/api/routes/` - API endpoints
- `src/components/` - React components (shadcn/ui)

```bash
cd packages/dashboard
bun run dev        # Vite dev server on :5173
bun run server     # API server on :3001
```

### packages/shared

Shared types, schemas, and utilities.

**Key files:**

- `src/types/mcp-tools.ts` - MCP tool schemas (Zod)
- `src/types/aiii-events.ts` - Website event schemas
- `src/crypto/` - Encryption utilities

### packages/native-host

Native messaging bridge compiled to a standalone binary.

```bash
cd packages/native-host
bun run build          # Current platform
bun run build:all      # All platforms
```

### packages/sync-server

Optional E2E encrypted sync service.

```bash
cd packages/sync-server
bun run dev        # Watch mode
bun run migrate    # Run migrations
```

## Development Workflow

### Running All Packages

```bash
# From root - starts all packages in watch mode
bun run dev
```

### Running Specific Packages

```bash
# Terminal 1: MCP server
cd packages/mcp-server && bun run dev

# Terminal 2: Extension (rebuild on change)
cd packages/extension && bun run dev

# Terminal 3: Dashboard
cd packages/dashboard && bun run dev
```

### Loading the Extension in Chrome

1. Build the extension: `cd packages/extension && bun run build`
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `packages/extension/dist/`

After code changes, rebuild and click the refresh button on the extension card.

### Debugging

**MCP Server:**

```bash
# View all output including stderr
athreei-host 2>&1 | tee debug.log
```

**Extension Service Worker:**

1. Go to `chrome://extensions/`
2. Find athreei
3. Click "Inspect views: service worker"

**Content Scripts:**

1. Open DevTools on any page
2. Console messages from content scripts appear there

**Dashboard:**

- React DevTools browser extension
- Network tab for API calls

## Architecture Deep Dive

### Communication Flow

```
AI App                MCP Server           Native Host          Extension           Website
  │                      │                     │                    │                  │
  │─────initialize──────►│                     │                    │                  │
  │◄────capabilities─────│                     │                    │                  │
  │                      │                     │                    │                  │
  │──browser_click───────►│                     │                    │                  │
  │                      │──────request───────►│                    │                  │
  │                      │                     │────native msg─────►│                  │
  │                      │                     │                    │───content msg───►│
  │                      │                     │                    │◄──action done────│
  │                      │                     │◄───response────────│                  │
  │                      │◄─────response───────│                    │                  │
  │◄───────result────────│                     │                    │                  │
```

### Native Messaging Protocol

Messages are length-prefixed JSON:

```
┌─────────────────┬────────────────────────────┐
│ 4 bytes (LE)    │ JSON payload               │
│ message length  │                            │
└─────────────────┴────────────────────────────┘
```

Maximum message size: 1MB

**Request format:**

```typescript
interface NativeRequest {
  id: string // Unique request ID
  type: "request"
  method: string // Tool name
  payload: Record<string, unknown>
}
```

**Response format:**

```typescript
interface NativeResponse {
  id: string // Matching request ID
  type: "response"
  success: boolean
  payload: unknown
  error?: string
}
```

### Accessibility Tree

The extension builds an accessibility tree from the DOM for AI understanding:

```typescript
interface A11yNode {
  role: string // ARIA role (button, link, textbox, etc.)
  name: string // Accessible name
  description?: string
  value?: string
  disabled?: boolean
  hidden?: boolean
  bounds?: {
    x: number
    y: number
    width: number
    height: number
  }
  selector?: string // CSS selector for targeting
  children?: A11yNode[]
}
```

### Permission Model

```typescript
interface Permission {
  id: string
  origin: string // Website origin (e.g., "https://example.com")
  tool: string // MCP tool name
  allowed: "denied" | "allowed" | "ask"
  createdAt: number
  updatedAt: number
}
```

Permissions are checked before each action. Default is "ask" for most tools, "denied" for `browser_execute_script`.

## Adding New MCP Tools

### Step 1: Define the Schema

Edit `packages/shared/src/types/mcp-tools.ts`:

```typescript
// Add input schema
export const BrowserNewToolInput = z.object({
  param1: z.string().describe("Description of param1"),
  param2: z.number().optional().describe("Optional param2"),
})

// Add output schema
export const BrowserNewToolOutput = z.object({
  result: z.string(),
})

// Add to MCP_TOOL_DEFINITIONS
export const MCP_TOOL_DEFINITIONS = {
  // ... existing tools
  browser_new_tool: {
    name: "browser_new_tool",
    description: "Description of what this tool does",
    inputSchema: BrowserNewToolInput,
    outputSchema: BrowserNewToolOutput,
  },
}
```

### Step 2: Register the Tool

Edit `packages/mcp-server/src/tools/browser.ts`:

```typescript
server.tool(
  "browser_new_tool",
  "Description of what this tool does",
  {
    param1: z.string().describe("Description"),
    param2: z.number().optional().describe("Optional"),
  },
  async ({ param1, param2 }) => {
    // Implementation
    const result = await nativeMessaging.send({
      method: "browser_new_tool",
      payload: { param1, param2 },
    })

    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    }
  }
)
```

### Step 3: Implement in Extension

Edit `packages/extension/src/content/actions/` (create new file if needed):

```typescript
// packages/extension/src/content/actions/new-tool.ts
export async function handleNewTool(params: {
  param1: string
  param2?: number
}) {
  // Implementation
  return { result: "success" }
}
```

Register in the content script's message handler.

### Step 4: Add Tests

```typescript
// packages/mcp-server/src/tools/__tests__/browser.test.ts
describe("browser_new_tool", () => {
  it("should do the expected thing", async () => {
    // Test implementation
  })
})
```

## Testing

### Running Tests

```bash
# All tests
bun test

# Watch mode
bun test --watch

# Specific package
bun test packages/mcp-server

# Specific file
bun test packages/mcp-server/src/server.test.ts

# With coverage
bun test --coverage
```

### Test Structure

- Unit tests: `**/*.test.ts` or `**/__tests__/*.ts`
- Integration tests: `**/*.integration.test.ts`

### Testing Extensions

Content script tests use jsdom:

```typescript
import { describe, it, expect, beforeEach } from "vitest"
import { JSDOM } from "jsdom"

describe("Content Script", () => {
  beforeEach(() => {
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>")
    global.document = dom.window.document
    global.window = dom.window as unknown as Window & typeof globalThis
  })

  it("should do something", () => {
    // Test
  })
})
```

## Code Style

### TypeScript

- Strict mode enabled
- No `any` types (use `unknown` if needed)
- Explicit return types for exported functions
- Use Zod for runtime validation at boundaries

### Formatting

```bash
# Format all files
bun run format

# Check formatting
bun run format:check
```

### Linting

```bash
# Check
bun run lint

# Auto-fix
bun run lint:fix
```

### Type Checking

```bash
# All packages
bun run typecheck:all

# Specific package
cd packages/mcp-server && bun run typecheck
```

### Naming Conventions

- Files: `kebab-case.ts`
- Types/Interfaces: `PascalCase`
- Functions/Variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`
- MCP tools: `snake_case` (e.g., `browser_click`)

## Building for Production

### All Packages

```bash
bun run build
```

### Native Host Binaries

```bash
cd packages/native-host

# Current platform
bun run build

# All platforms
bun run build:all

# Specific platform
bun run build:macos
bun run build:windows
bun run build:linux
```

Output in `packages/native-host/dist/`:

- `athreei-host-macos-arm64`
- `athreei-host-macos-x64`
- `athreei-host-windows.exe`
- `athreei-host-linux`

### Chrome Extension

```bash
cd packages/extension
bun run build
```

Output in `packages/extension/dist/` - ready for Chrome Web Store or unpacked loading.

## Contributing

### Getting Started

1. Fork the repository
2. Clone your fork
3. Create a feature branch: `git checkout -b feature/my-feature`
4. Make changes
5. Run tests: `bun test`
6. Run linting: `bun run lint`
7. Commit with clear message
8. Push and create PR

### Commit Messages

Follow conventional commits:

```
feat: add new browser tool for form filling
fix: resolve native messaging timeout issue
docs: update developer guide
refactor: simplify accessibility tree builder
test: add unit tests for permission repository
chore: update dependencies
```

### Pull Request Guidelines

- Keep PRs focused on a single feature/fix
- Include tests for new functionality
- Update documentation as needed
- Ensure CI passes
- Request review from maintainers

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass and cover new code
- [ ] Documentation updated
- [ ] No security vulnerabilities introduced
- [ ] Performance considerations addressed
- [ ] Backwards compatibility maintained (or breaking changes documented)

## Resources

- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
- [Chrome Extensions Docs](https://developer.chrome.com/docs/extensions/) - Manifest V3
- [Bun Documentation](https://bun.sh/docs) - Runtime and tooling
- [Hono Documentation](https://hono.dev/) - Web framework
- [Zod Documentation](https://zod.dev/) - Schema validation
