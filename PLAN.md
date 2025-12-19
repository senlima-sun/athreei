# athreei Implementation Plan

> A privacy-focused platform that lets users connect any AI app to their browser via MCP, giving them full control over their data while enabling website automation.

## Overview

### Core Concept

- Users run a **local MCP server** on their device
- Users add this MCP server to their AI apps (Claude Desktop, ChatGPT, Gemini, etc.)
- A **Chrome extension** exposes browser capabilities to the MCP server via Native Messaging
- **Dashboard** provides audit logs and permission management
- **E2E encrypted sync** (optional) via Postgres for cross-device access

### Key Differentiators from ChatGPT App Store

| ChatGPT App Store     | athreei                                   |
| --------------------- | ----------------------------------------- |
| OpenAI-only           | Any AI provider                           |
| Data flows to OpenAI  | Data stays local                          |
| Website loses control | Website can customize via `aiii:*` events |
| Centralized           | User-controlled                           |

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AI App        │     │  Local MCP      │     │  Chrome         │
│  (Claude, GPT)  │◄───►│  Server         │◄───►│  Extension      │◄───► Websites
│                 │ MCP │  (Bun + TS)     │ NM  │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
              ┌─────▼─────┐ ┌────▼────┐ ┌─────▼─────┐
              │  SQLite   │ │ Dashboard│ │  Postgres │
              │  (local)  │ │  (Web)   │ │  (sync)   │
              └───────────┘ └──────────┘ └───────────┘
```

**Communication:**

- AI App ↔ MCP Server: Standard MCP protocol (stdio/SSE)
- MCP Server ↔ Extension: Chrome Native Messaging
- Extension ↔ Websites: Content scripts + `aiii:*` custom events

---

## Phase 1: Foundation

### 1.1 Project Setup

- [x] Initialize monorepo structure (Bun workspaces)
- [x] Setup shared TypeScript config
- [x] Configure ESLint, Prettier
- [x] Setup testing framework (Vitest)

**Directory Structure:**

```
athreei/
├── packages/
│   ├── mcp-server/        # Local MCP server (Bun)
│   ├── extension/         # Chrome extension
│   ├── dashboard/         # Web dashboard
│   ├── shared/            # Shared types & utilities
│   └── native-host/       # Native messaging host binary
├── apps/
│   └── web/               # Marketing site + docs
├── bun.lockb
├── package.json
└── tsconfig.json
```

### 1.2 Shared Types & Protocols

- [x] Define MCP tool schemas for browser operations
- [x] Define Native Messaging message types
- [x] Define `aiii:*` event payload schemas
- [x] Define permission model types
- [x] Define audit log schemas

---

## Phase 2: MCP Server

### 2.1 Core MCP Server

- [ ] Setup Bun project with MCP SDK
- [ ] Implement MCP server with stdio transport
- [ ] Add SSE transport option for web-based AI apps
- [ ] Implement graceful shutdown handling

### 2.2 Browser Tools (MCP Tools)

Expose these capabilities to AI apps:

| Tool                     | Description                         |
| ------------------------ | ----------------------------------- |
| `browser_list_tabs`      | List open tabs with titles and URLs |
| `browser_get_active_tab` | Get current active tab info         |
| `browser_navigate`       | Navigate to URL                     |
| `browser_get_content`    | Get page content (a11y tree or DOM) |
| `browser_get_elements`   | List interactive elements           |
| `browser_click`          | Click an element                    |
| `browser_type`           | Type text into element              |
| `browser_scroll`         | Scroll page or element              |
| `browser_screenshot`     | Take screenshot                     |
| `browser_execute_script` | Run JS (with permission)            |
| `browser_wait`           | Wait for element/condition          |

### 2.3 Native Messaging Bridge

- [ ] Implement Native Messaging host (compiled binary)
- [ ] Message serialization/deserialization
- [ ] Request/response correlation (message IDs)
- [ ] Connection health monitoring
- [ ] Auto-reconnect logic

### 2.4 Local Storage (SQLite)

- [ ] Setup better-sqlite3 or Bun's SQLite
- [ ] Schema for sessions, permissions, audit logs
- [ ] Migrations system
- [ ] Query helpers

**SQLite Schema (initial):**

```sql
-- Permissions
CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  origin TEXT NOT NULL,          -- Website origin
  tool TEXT NOT NULL,            -- MCP tool name
  allowed INTEGER NOT NULL,      -- 0=denied, 1=allowed, 2=ask
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(origin, tool)
);

-- Audit Log
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  ai_app TEXT,                   -- Which AI app made the request
  tool TEXT NOT NULL,            -- MCP tool called
  origin TEXT,                   -- Website involved
  args TEXT,                     -- JSON of arguments
  result TEXT,                   -- JSON of result (truncated)
  status TEXT NOT NULL           -- success, denied, error
);

-- Sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  tab_id INTEGER,
  origin TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  metadata TEXT                  -- JSON
);
```

---

## Phase 3: Chrome Extension

### 3.1 Extension Structure

- [ ] Manifest V3 setup
- [ ] Service worker (background)
- [ ] Content script
- [ ] Popup UI (optional, for status)

### 3.2 Native Messaging Client

- [ ] Connect to native host
- [ ] Handle incoming commands
- [ ] Send responses back
- [ ] Connection state management

### 3.3 Content Script - A11y Reader

- [ ] Build accessibility tree from DOM
- [ ] Extract interactive elements with:
  - Role (button, link, input, etc.)
  - Label/text
  - Bounding box
  - Actionable state (enabled, visible)
- [ ] Handle dynamic content (MutationObserver)
- [ ] Efficient serialization for large pages

### 3.4 Content Script - Action Executor

- [ ] Click simulation (trusted events)
- [ ] Text input handling
- [ ] Form interaction
- [ ] Scroll handling
- [ ] Wait for conditions

### 3.5 Website Integration (`aiii:*` Events)

Custom events for website owners:

| Event             | Direction        | Purpose                   |
| ----------------- | ---------------- | ------------------------- |
| `aiii:ready`      | Extension → Page | Extension is ready        |
| `aiii:request`    | Extension → Page | AI is requesting action   |
| `aiii:response`   | Page → Extension | Website's custom response |
| `aiii:register`   | Page → Extension | Register custom tools     |
| `aiii:permission` | Page → Extension | Request permission scope  |

**Example website integration:**

```javascript
// Website registers custom tool
window.addEventListener("aiii:ready", () => {
  window.dispatchEvent(
    new CustomEvent("aiii:register", {
      detail: {
        tool: "add_to_cart",
        description: "Add product to shopping cart",
        parameters: {
          productId: { type: "string", required: true },
          quantity: { type: "number", default: 1 },
        },
      },
    })
  )
})

// Website handles custom tool calls
window.addEventListener("aiii:request", (e) => {
  if (e.detail.tool === "add_to_cart") {
    const { productId, quantity } = e.detail.args
    // Website's own logic
    addToCart(productId, quantity)

    window.dispatchEvent(
      new CustomEvent("aiii:response", {
        detail: {
          requestId: e.detail.requestId,
          success: true,
          result: { cartCount: getCartCount() },
        },
      })
    )
  }
})
```

---

## Phase 4: Dashboard

### 4.1 Dashboard Setup

- [ ] Bun + Hono backend (or just serve from MCP server)
- [ ] React/Preact frontend
- [ ] Local-first (connects to local MCP server)

### 4.2 Features

- [ ] **Audit Log View**: Searchable, filterable log of all AI interactions
- [ ] **Permission Manager**: Grant/revoke permissions per origin + tool
- [ ] **Active Sessions**: View current browser sessions
- [ ] **Connection Status**: MCP server, extension, AI apps status
- [ ] **Settings**: Configure default permissions, retention, etc.

### 4.3 UI Components

- [ ] Data table with virtual scrolling (for large logs)
- [ ] Permission toggle matrix (origin × tool)
- [ ] Real-time status indicators
- [ ] Dark/light theme

---

## Phase 5: Sync & Encryption (Optional)

### 5.1 E2E Encryption

- [ ] Key derivation from user password (Argon2)
- [ ] Encrypt sensitive data before sync
- [ ] Key rotation mechanism

### 5.2 Postgres Sync

- [ ] Setup sync server (separate service)
- [ ] Conflict resolution strategy
- [ ] Selective sync (user chooses what to sync)
- [ ] Account management

---

## Phase 6: Distribution

### 6.1 MCP Server Distribution

- [ ] Single binary with Bun compile
- [ ] macOS, Windows, Linux builds
- [ ] Auto-update mechanism
- [ ] Installation script that:
  - Installs binary
  - Registers Native Messaging host
  - Opens dashboard for setup

### 6.2 Chrome Extension

- [ ] Chrome Web Store submission
- [ ] Self-hosted option (for enterprise)

### 6.3 Documentation

- [ ] User guide
- [ ] Website integration guide
- [ ] API reference for `aiii:*` events

---

## Security Considerations

### Permission Model

1. **Default deny**: No action without explicit permission
2. **Origin-scoped**: Permissions are per-website
3. **Tool-scoped**: Permissions are per-tool
4. **Expirable**: Optional time-limited permissions
5. **Audit everything**: Every action is logged

### Threat Mitigations

| Threat                | Mitigation                              |
| --------------------- | --------------------------------------- |
| Malicious AI prompt   | User must grant permissions first       |
| Website impersonation | Origin validation in extension          |
| Data exfiltration     | Local-first, E2E encrypted sync         |
| Extension compromise  | CSP, sandboxed content scripts          |
| MCP server compromise | Sandboxed execution, minimal privileges |

---

## Success Metrics

### MVP Criteria

- [ ] User can install MCP server and extension
- [ ] User can add MCP server to Claude Desktop
- [ ] AI can read page content via a11y tree
- [ ] AI can click buttons and fill forms
- [ ] User can view audit log in dashboard
- [ ] User can manage permissions

### Post-MVP

- [ ] Website owner can register custom tools
- [ ] Cross-device sync working
- [ ] Multiple browser support
- [ ] Mobile companion app

---

## Resolved Decisions

### Native Host Language: Bun + TypeScript

Use `bun build --compile` to create a standalone binary (~50MB). No need for Rust/Go - keeps the entire stack in TypeScript.

```bash
bun build ./packages/native-host/index.ts --compile --outfile athreei-host
```

### AI App Detection: MCP Protocol Native

The MCP protocol includes `clientInfo` in the initialization request:

```json
{
  "method": "initialize",
  "params": {
    "clientInfo": {
      "name": "Claude Desktop", // Auto-detected!
      "version": "0.7.0"
    }
  }
}
```

Optionally, users can add URL path suffix for custom naming:

- `http://localhost:3000/mcp` → uses `clientInfo.name`
- `http://localhost:3000/mcp/work-claude` → tagged as "work-claude"

### Rate Limiting: User Configurable

No default rate limit. Users can optionally set a fixed number in settings (e.g., max 10 actions per minute).

### Undo System: Not Implemented

No undo system - keeps implementation simple.

---

## Next Steps

1. Initialize monorepo with Bun workspaces
2. Implement basic MCP server with 2-3 tools
3. Build minimal Chrome extension with Native Messaging
4. Connect end-to-end and test with Claude Desktop
5. Iterate on tools and permissions
