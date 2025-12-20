# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

athreei is a privacy-focused platform connecting AI apps to browsers via the Model Context Protocol (MCP). Users run a local MCP server, add it to their AI apps (Claude Desktop, ChatGPT, etc.), and a Chrome extension exposes browser capabilities via Native Messaging.

**Architecture flow:**
```
AI Apps (Claude, GPT) ←→ MCP Server (stdio/SSE) ←→ Native Host ←→ Chrome Extension ←→ Websites
```

## Tech stack documentations

You can find detailed documentation for each technology used in this project:

- [Bun](https://bun.com/llms.txt)
- [Zod](https://zod.dev/llms.txt)
- [Better Auth](https://www.better-auth.com/llms.txt)
- [Tailwind CSS](https://tailwindcss.com/docs/*)
- [Vite](https://vite.dev/llms.txt)
- [Vitest](https://vitest.dev/llms.txt)
- [Shadcn UI](https://ui.shadcn.com/llms.txt)
- [Model Context Protocol SDK](https://modelcontextprotocol.io/llms.txt)

About React: I suggest if you have any problem please directly read source code via Github.

## Commands

```bash
# Install dependencies
bun install

# Development (all packages with watch)
bun run dev

# Build all packages
bun run build

# Testing
bun test                    # Run all tests
bun test --watch            # Watch mode
bun test packages/mcp-server  # Single package

# Linting & Formatting
bun run lint               # Check with ESLint
bun run lint:fix           # Auto-fix ESLint issues
bun run format             # Format with Prettier
bun run format:check       # Check formatting

# Type checking
bun run typecheck:all      # All packages

# Database (sync-server)
docker-compose up          # Start PostgreSQL
cd packages/sync-server && bun run migrate
```

### Package-specific commands

```bash
# MCP Server
cd packages/mcp-server
bun run dev       # Watch mode
bun run start     # Run compiled

# Extension
cd packages/extension
bun run build     # Build to dist/
bun run dev       # Watch mode

# Dashboard
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
```

## Architecture

**Monorepo structure using Bun workspaces:**

- `packages/mcp-server` - Local MCP server exposing browser tools to AI apps
- `packages/extension` - Chrome extension (Manifest V3) with content scripts
- `packages/dashboard` - React + Vite + Tailwind CSS v4 + shadcn/ui web dashboard
- `packages/shared` - Shared types, protocols, and crypto utilities
- `packages/native-host` - Native messaging bridge (compiled binary via `bun build --compile`)
- `packages/sync-server` - E2E encrypted sync service (Hono + PostgreSQL)
- `apps/web` - Marketing/documentation site

**Key communication patterns:**
- AI App ↔ MCP Server: Standard MCP protocol (stdio for Claude Desktop, SSE for web apps)
- MCP Server ↔ Extension: Chrome Native Messaging via native-host binary
- Extension ↔ Websites: Content scripts + `aiii:*` custom events

## Code Patterns

**Logging in MCP server:** All logs must go to `stderr` (via `console.error` or the logger utility) because `stdout` is reserved for JSON-RPC communication.

**Adding MCP tools:** Define schema in `packages/shared/src/types/mcp-tools.ts`, then register in `packages/mcp-server/src/tools/browser.ts` using `server.registerTool()`.

**Native Messaging protocol:** Length-prefixed JSON (4-byte little-endian length + JSON payload). Max message size: 1MB.

**Website integration via `aiii:*` events:**
- `aiii:ready` - Extension → Page (extension ready)
- `aiii:request` - Extension → Page (AI requesting action)
- `aiii:response` - Page → Extension (website's response)
- `aiii:register` - Page → Extension (register custom tools)

## Tech Stack

- **Runtime:** Bun
- **Language:** TypeScript 5.7 (strict mode)
- **Backend:** Hono web framework
- **Frontend:** React 18, Vite 6, Tailwind CSS v4, shadcn/ui, Radix UI
- **Database:** PostgreSQL (sync-server), SQLite planned (local storage)
- **Validation:** Zod
- **Crypto:** @noble/hashes, @noble/ciphers, Argon2
- **Testing:** Vitest with jsdom for extension tests
