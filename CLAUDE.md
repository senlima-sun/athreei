# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent Guidelines

1. **Leverage sub-agents** for non-trivial tasks - dispatch parallel agents for implementation, testing, and review
2. **Test coverage required** - aim for 80%+ coverage on API routes, 90%+ on business logic
3. **Code review before commit** - use code-reviewer agent proactively
4. **Respect code style** - Prettier (no semicolons, double quotes) and ESLint rules
5. **Atomic commits** - one logical change per commit, conventional commit format

## Product Vision

**athreei is the universal MCP gateway** - one connection for AI apps, unified access to all your MCP servers.

### Core Value Proposition

| Audience | Value |
|----------|-------|
| **End Users** | One MCP config for all AI apps. See what AI actually did. Stop guessing, start iterating with data. |
| **Developers** | Build MCP servers once, work with any AI app. Not locked to OpenAI/Anthropic ecosystems. |
| **Businesses** | Observability, data retention, compliance. Better DX for MCP development and inspection. |

### The Problem We Solve

Today, context ownership is controlled by AI app providers. If you use Claude Desktop, Anthropic controls your MCP connections. If you use ChatGPT, OpenAI controls it. Users can't:
- See what tools AI actually called or what data was returned
- Iterate on tool prompts with real data (forced to blind prompt engineering)
- Use the same MCP setup across different AI apps

### How athreei Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        AI Apps                                   │
│         Claude Desktop    ChatGPT    Cursor    (any MCP app)    │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Single MCP connection
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      athreei Gateway                             │
│   ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│   │ Aggregate │  │  Routing  │  │  Logging  │  │ Auth/ACL  │   │
│   └───────────┘  └───────────┘  └───────────┘  └───────────┘   │
└───────────────────────────────┬─────────────────────────────────┘
                                │ Fan-out to many
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
        ┌──────────┐      ┌──────────┐      ┌──────────┐
        │  Figma   │      │  Sentry  │      │  Linear  │  ...
        │   MCP    │      │   MCP    │      │   MCP    │
        └──────────┘      └──────────┘      └──────────┘
```

### Deployment Modes

- **Local (self-hosted):** Gateway binary runs on user's machine. Free, privacy-first.
- **Cloud (hosted):** Gateway runs on athreei infrastructure. Paid B2B with data retention, analytics, and better DX.

### Key User Journeys

**1. MCP Aggregation (connect once, access many)**
```
User → Install athreei → Add MCP servers (JSON or one-click) → Connect AI app to athreei → Done
```

**2. Observability (see what AI did)**
```
User → Uses AI app → Opens athreei dashboard → Views trace timeline → Sees tool calls + inputs + outputs
```

**3. Iteration Loop (improve with data, not guesswork)**
```
User → Spots issue in trace → Edits tool description/prompt → Retries → Validates improvement
```

### Business Model

- **Local:** Free/self-hosted for developers and privacy-conscious users
- **Cloud:** Paid B2B targeting businesses who need:
  - Data retention and audit logs
  - MCP development/inspection tools
  - Better DX for building and testing MCPs

## Project Overview

athreei is an MCP aggregator platform available both locally and in the cloud. The browser extension (exposing browser capabilities via Native Messaging) is one example of an MCP server that can connect to athreei - not the core product.

**Architecture flow:**

```
AI Apps (Claude, ChatGPT, Cursor, etc.)
            │
            ▼ (single connection)
    athreei Gateway (local or cloud)
            │
            ▼ (fan-out)
    Multiple MCP Servers (Figma, Sentry, Linear, Browser, custom, etc.)
```

## Tech Stack Documentation

- [Bun](https://bun.com/llms.txt)
- [Zod](https://zod.dev/llms.txt)
- [Better Auth](https://www.better-auth.com/llms.txt)
- [Tailwind CSS](https://tailwindcss.com/docs/*)
- [Vite](https://vite.dev/llms.txt)
- [Vitest](https://vitest.dev/llms.txt)
- [Shadcn UI](https://ui.shadcn.com/llms.txt)
- [Model Context Protocol SDK](https://modelcontextprotocol.io/llms.txt)
- [Drizzle ORM](https://orm.drizzle.team/llms.txt)
- [Hono](https://hono.dev/docs)

## Commands

```bash
# Install dependencies
bun install

# Development (all packages with watch)
bun run dev

# Build all packages
bun run build

# Testing
bun test                      # Run all tests
bun test --watch              # Watch mode
bun test packages/mcp-server  # Single package

# Linting & Formatting
bun run lint               # Check with ESLint
bun run lint:fix           # Auto-fix ESLint issues
bun run format             # Format with Prettier
bun run format:check       # Check formatting

# Type checking
bun run typecheck:all      # All packages

# Database (@athreei/db)
cd packages/db
bun run generate           # Generate migrations
bun run migrate            # Run migrations
bun run push               # Push schema changes
bun run studio             # Open Drizzle Studio
bun run seed               # Seed database
```

### Package-specific Commands

```bash
# MCP Server
cd packages/mcp-server
bun run dev       # Watch mode
bun run start     # Run compiled

# Extension
cd packages/extension
bun run build     # Build to dist/
bun run dev       # Watch mode

# Dashboard (local UI)
cd packages/dashboard
bun run dev       # Vite dev server on :5173

# Native Host
cd packages/native-host
bun run build         # Current platform binary
bun run build:all     # All platform binaries (macOS arm64/x64, Windows, Linux)

# Sync Server
cd packages/sync-server
bun run dev       # Watch mode
bun run migrate   # Run DB migrations

# Gateway (local MCP gateway)
cd packages/gateway
bun run dev           # Watch mode
bun run build:binary  # Compile to binary

# Gateway Cloud (hosted MCP gateway)
cd packages/gateway-cloud
bun run dev       # Watch mode

# API Server
cd apps/api
bun run dev       # Watch mode on :3001

# Platform (Next.js auth frontend)
cd apps/platform
bun run dev       # Next.js dev server with Turbopack

# Email templates
cd packages/email
bun run email:dev # Email preview on :3030
```

## Architecture

**Monorepo structure using Bun workspaces:**

### Packages (Shared Libraries)

- `packages/shared` - Shared types, protocols, and crypto utilities
- `packages/db` - Drizzle ORM with dual PostgreSQL/SQLite support
- `packages/auth` - Better Auth configuration (server + client exports)
- `packages/email` - Resend email templates with React Email
- `packages/sdk` - Official SDK for website integration

### Packages (Local/Self-hosted)

- `packages/mcp-server` - Local MCP server exposing browser tools to AI apps
- `packages/extension` - Chrome extension (Manifest V3) with content scripts
- `packages/dashboard` - React + Vite local web dashboard
- `packages/native-host` - Native messaging bridge (compiled binary via `bun build --compile`)
- `packages/gateway` - Local MCP gateway (compiled binary)
- `packages/gateway-core` - Shared gateway logic

### Packages (Cloud/Hosted)

- `packages/sync-server` - E2E encrypted sync service (Hono + PostgreSQL)
- `packages/gateway-cloud` - Hosted MCP gateway service (Hono)

### Apps

- `apps/api` - API server (Hono + Better Auth + Drizzle)
- `apps/platform` - Platform frontend (Next.js 15 + Turbopack)
- `apps/web` - Marketing site (Preact + Vite)

**Key communication patterns:**

- AI App ↔ MCP Server: Standard MCP protocol (stdio for Claude Desktop, SSE for web apps)
- MCP Server ↔ Extension: Chrome Native Messaging via native-host binary
- Extension ↔ Websites: Content scripts + `aiii:*` custom events

## Code Patterns

### Logging in MCP Server

All logs must go to `stderr` (via `console.error` or the logger utility) because `stdout` is reserved for JSON-RPC communication:

```typescript
import { logger } from "./utils/logger"
logger.info("message") // Goes to stderr
```

### Adding MCP Tools

Define schema in `packages/shared/src/types/mcp-tools.ts`, then register in `packages/mcp-server/src/tools/browser.ts` using `server.registerTool()`.

### Native Messaging Protocol

Length-prefixed JSON (4-byte little-endian length + JSON payload). Max message size: 1MB.

### Website Integration via `aiii:*` Events

- `aiii:ready` - Extension → Page (extension ready)
- `aiii:request` - Extension → Page (AI requesting action)
- `aiii:response` - Page → Extension (website's response)
- `aiii:register` - Page → Extension (register custom tools)

### Database Pattern

`@athreei/db` auto-detects database type from URL and provides dual schema support:

```typescript
import { createClient, getDb, getSchema, detectDatabaseType } from "@athreei/db"

// Auto-detect: postgres:// → PostgreSQL, anything else → SQLite
const db = createClient(process.env.DATABASE_URL)
// Or use singleton
const db = getDb()
```

### Authentication Pattern

`@athreei/auth` wraps Better Auth with project defaults:

```typescript
import { createAuth } from "@athreei/auth/server"
import { db } from "@athreei/db"

export const auth = createAuth(db)

// Use with Hono
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))
```

### Hono Server Pattern

API servers use Bun's native server export:

```typescript
export default {
  port: PORT,
  fetch: app.fetch,
}
```

## Testing

- Vitest with `jsdom` environment for extension tests (browser simulation)
- Node environment for all other tests
- Run single test file: `bun test packages/mcp-server/src/server.test.ts`
- Extension tests require jsdom for DOM APIs

## Tech Stack

- **Runtime:** Bun
- **Language:** TypeScript 5.7 (strict mode)
- **Backend:** Hono web framework
- **Frontend:** React 18/19, Next.js 15, Vite 6, Tailwind CSS v4, shadcn/ui
- **Marketing:** Preact + Vite
- **Database:** PostgreSQL (cloud), SQLite (self-hosted)
- **ORM:** Drizzle ORM with dual schema support
- **Auth:** Better Auth
- **Email:** Resend + React Email
- **Validation:** Zod
- **Crypto:** @noble/hashes, @noble/ciphers, Argon2
- **Testing:** Vitest with jsdom for extension tests
