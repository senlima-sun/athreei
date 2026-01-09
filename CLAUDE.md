# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Agent Guidelines

1. **Leverage sub-agents** for non-trivial tasks - dispatch parallel agents for implementation, testing, and review
2. **Test coverage required** - aim for 80%+ coverage on API routes, 90%+ on business logic
3. **Code review before commit** - use code-reviewer agent proactively
4. **Respect code style** - Prettier (no semicolons, double quotes) and ESLint rules
5. **Atomic commits** - one logical change per commit, conventional commit format

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

## Project Overview

athreei is an MCP aggregator platform available both locally and in the cloud. Users connect their AI apps (Claude Desktop, Cursor, ChatGPT) to a single athreei gateway, which then fans out to multiple MCP servers. This provides unified access, observability, and tool management.

**Architecture flow:**

```
AI Apps (Claude Desktop, ChatGPT, Cursor)
            │
            ▼ (single MCP connection)
    athreei Gateway (local binary or cloud service)
            │
            ├── Aggregates tools from all servers
            ├── Namespaces tools (github__create_issue)
            ├── Collects traces for observability
            │
            ▼ (fan-out)
    Multiple MCP Servers (Figma, Sentry, Linear, custom, etc.)
```

**CLI (`athreei`):**

The unified CLI supports both local and cloud modes:

```bash
# Local mode (offline, file-based config)
athreei --local mcp list
athreei --local mcp add --name myserver --transport stdio --command npx ...

# Cloud mode (connected to Platform)
athreei mcp list
athreei auth login
athreei org switch myorg
```

Mode detection priority: `--local`/`--cloud` flags > `ATHREEI_MODE` env var > config shape

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

# Testing (Vitest)
bun run test                  # Run all tests
bun run test:watch            # Watch mode
npx vitest run <path>         # Single file/package
bun run test:sqlite           # SQLite tests only (bun:sqlite)

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
# Gateway (local MCP gateway)
cd packages/gateway
bun run dev           # Watch mode
bun run dev:sse       # SSE transport mode
bun run build:binary  # Compile to binary

# Gateway Cloud (hosted MCP gateway)
cd packages/gateway-cloud
bun run dev       # Watch mode

# Sync Server
cd packages/sync-server
bun run dev       # Watch mode
bun run db:migrate    # Run DB migrations
bun run db:studio     # Open Drizzle Studio

# API Server
cd apps/api
bun run dev       # Watch mode on :3001

# Platform (Next.js frontend)
cd apps/platform
bun run dev       # Next.js dev server with Turbopack

# Desktop App (Tauri)
cd apps/desktop
bun run tauri:dev     # Development mode
bun run tauri:build   # Build for current platform

# CLI App
cd apps/cli
bun run dev       # Watch mode

# Email templates
cd packages/email
bun run email:dev # Email preview on :3030

# Docs site
cd apps/docs
bun run dev       # Docs dev server
```

## Architecture

**Monorepo structure using Bun workspaces:**

### Packages (Shared Libraries)

- `packages/shared` - Shared types, protocols, crypto utilities, Zod schemas
- `packages/db` - Drizzle ORM with dual PostgreSQL/SQLite support
- `packages/auth` - Better Auth configuration (server + client exports)
- `packages/email` - Resend email templates with React Email
- `packages/ui` - shadcn/ui component library (Radix UI + Tailwind)

### Packages (Local/Self-hosted)

- `packages/gateway` - Local MCP gateway (compiled binary via `bun build --compile`)
- `packages/gateway-core` - Shared gateway logic and MCP protocol handling

### Packages (Cloud/Hosted)

- `packages/sync-server` - E2E encrypted sync service (Hono + PostgreSQL)
- `packages/gateway-cloud` - Hosted MCP gateway service (Hono)

### Apps

- `apps/api` - API server (Hono + Better Auth + Drizzle) on :3001
- `apps/platform` - Platform frontend (Next.js 15 + Turbopack)
- `apps/web` - Marketing site (Next.js 15)
- `apps/desktop` - Desktop application (Tauri 2.0 + React)
- `apps/cli` - Unified CLI (`athreei` command) with local/cloud mode support (React Ink)
- `apps/docs` - Documentation site (Fumadocs + Next.js)

### Experimental

- `experimental/site-sdk` - Website integration SDK (`@athreei/site-sdk`)

**Key communication patterns:**

- AI App ↔ Gateway: MCP protocol (stdio for Claude Desktop, SSE for web apps)
- Gateway ↔ MCP Servers: Fan-out to multiple servers, tool namespacing (e.g., `github__create_issue`)
- Platform ↔ API: REST API with Better Auth sessions
- Gateway ↔ Sync Server: E2E encrypted config sync and trace storage

## Code Patterns

### Gateway Trace Collection

The gateway collects tool call traces with optional E2E encryption:

```typescript
// packages/gateway/src/trace-collector.ts
// Traces encrypted with XChaCha20-Poly1305 before sync
```

### Tool Namespacing

When aggregating multiple MCP servers, tools are namespaced to avoid conflicts:

```
Original: create_issue (from github server)
Namespaced: github__create_issue
```

### Website Integration via `aiii:*` Events

Used by `@athreei/site-sdk` for website-to-AI communication:

- `aiii:ready` - SDK → Page (SDK initialized)
- `aiii:request` - AI → Page (AI requesting action)
- `aiii:response` - Page → AI (website's response)
- `aiii:register` - Page → AI (register custom tools)

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

- **Primary test runner:** Vitest (`bun run test`)
- Run single test file: `npx vitest run <path>`
- SQLite tests (bun:sqlite): `bun run test:sqlite`
- Node environment for most tests, jsdom for browser simulation when needed

**Important:** Do NOT use `bun test` directly - most tests use Vitest-specific APIs (`vi.hoisted`, `vi.mocked`, jsdom environment) that are incompatible with Bun's native test runner.

## Tech Stack

- **Runtime:** Bun
- **Language:** TypeScript 5.7 (strict mode)
- **Backend:** Hono web framework
- **Frontend:** React 19, Next.js 15, Tailwind CSS v4, shadcn/ui
- **Desktop:** Tauri 2.0 + React
- **Database:** PostgreSQL (cloud), SQLite (self-hosted)
- **ORM:** Drizzle ORM with dual schema support
- **Auth:** Better Auth
- **Email:** Resend + React Email
- **Validation:** Zod
- **Crypto:** @noble/hashes, @noble/ciphers (XChaCha20-Poly1305), Argon2
- **Testing:** Vitest
