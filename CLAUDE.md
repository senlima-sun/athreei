# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

athreei is an AI toolset gateway. It connects AI apps (Claude Desktop, ChatGPT, Cursor) to multiple tool servers (Figma, Sentry, Linear, etc.) via a single connection. The athreei Gateway handles tool aggregation, namespacing, and trace collection.

```
AI Apps (Claude Desktop, ChatGPT, Cursor)
            │
            ▼ (single MCP connection)
    athreei Gateway (local binary or cloud)
            │
            ├── Tool aggregation & namespacing (github__create_issue)
            ├── Trace collection for observability
            │
            ▼ (fan-out)
    Multiple MCP Servers (Figma, Sentry, Linear, etc.)
```

**CLI modes:** `--local` flag > `ATHREEI_MODE` env > config shape detection

## Commands

```bash
bun install              # Install dependencies
bun run dev              # Dev mode (all packages)
bun run build            # Build all

bun run test             # Vitest (NOT bun test)
npx vitest run <path>    # Single test file
bun run test:sqlite      # SQLite-specific tests

bun run typecheck:all    # Type check
bun run lint             # ESLint
bun run format           # Prettier
```

**Database (packages/db):** `bun run generate | migrate | push | studio | seed`

**Package dev:** Run `bun run dev` in specific package directory.

## Architecture

Bun monorepo with workspaces.

**Shared:**

- `packages/shared` — Types, protocols, crypto, Zod schemas
- `packages/db` — Drizzle ORM (PostgreSQL/SQLite dual support)
- `packages/auth` — Better Auth wrapper
- `packages/ui` — shadcn/ui components

**Gateway:**

- `packages/gateway` — Local binary (`bun build --compile`)
- `packages/gateway-core` — Shared MCP protocol logic
- `packages/gateway-cloud` — Hosted gateway (Hono)

**Apps:**

- `apps/api` — Platform API (Hono, :3001)
- `apps/platform` — Frontend (Next.js 15, React 19)
- `apps/cli` — Unified CLI (Commander + Ink)
- `apps/desktop` — Tauri 2.0 native app (Vite + React)
- `apps/docs` — Documentation site (Next.js + Fumadocs)

## Key Patterns

**Database auto-detection:**

```typescript
import { getDb, getSchema, getPgDb, getSqliteDb } from "@athreei/db"
const db = getDb() // Auto-detect: postgres:// → PG, else → SQLite
const pg = getPgDb() // Explicit PG (throws if wrong type)
const sqlite = getSqliteDb() // Explicit SQLite (throws if wrong type)
```

**Auth with Hono:**

```typescript
import { createAuth } from "@athreei/auth/server"
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw))
```

**Bun server export:**

```typescript
export default { port: PORT, fetch: app.fetch }
```

**Tool namespacing:** `create_issue` → `github__create_issue`

**Site SDK events:** `aiii:ready`, `aiii:request`, `aiii:response`, `aiii:register`

**Gateway transports:** stdio (default), SSE, HTTP API — selected via `--transport` flag

**CLI commands:** `athreei auth|org|mcp|config|gateway|sync|endpoint|apikey|completion`

## Tech Stack

Bun, TypeScript 5.7 (strict), Hono, React 19, Next.js 15, Tailwind v4, shadcn/ui, Tauri 2.0, Drizzle ORM, Better Auth, Zod, Vitest

## Tech Stack Docs

- [Bun](https://bun.com/llms.txt), [Hono](https://hono.dev/docs), [Drizzle](https://orm.drizzle.team/llms.txt)
- [Better Auth](https://www.better-auth.com/llms.txt), [Zod](https://zod.dev/llms.txt)
- [MCP SDK](https://modelcontextprotocol.io/llms.txt), [Vitest](https://vitest.dev/llms.txt)
- [shadcn/ui](https://ui.shadcn.com/llms.txt), [Tailwind](https://tailwindcss.com/docs/*)

## Agent Guidelines

1. **Sub-agents** — Dispatch parallel agents for implementation, testing, review
2. **Test coverage** — API routes 80%+, business logic 90%+
3. **Code review** — Use code-reviewer agent before commits
4. **Style** — Prettier (no semicolons, double quotes), ESLint
5. **Commits** — Atomic, conventional format
