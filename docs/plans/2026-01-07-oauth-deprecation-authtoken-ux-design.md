# OAuth Deprecation & AuthToken UX Improvement

**Date**: 2026-01-07
**Status**: Approved

## Background

OAuth implementation has high maintenance cost:

- Each SaaS requires Partner program application (e.g., Sentry)
- Each new integration (Slack, GitHub, Linear) adds OAuth server setup/maintenance
- Traditional AuthToken approach is simpler and equally effective

## Decision

1. **Deprecate OAuth** - Move to `_deprecated/` folder, preserve code for future use
2. **Improve AuthToken UX** - Add connection verification on token setup
3. **Create CLI App** - Replace packages/dashboard with `a3i` CLI for local users

## Part 1: OAuth Deprecation

### Files to Move

```
apps/api/src/routes/oauth.ts           → apps/api/src/_deprecated/oauth/routes.ts
apps/api/src/schemas/oauth.ts          → apps/api/src/_deprecated/oauth/schemas.ts
apps/api/src/middleware/oauth-rate-limit.ts → apps/api/src/_deprecated/oauth/rate-limit.ts
apps/api/src/__tests__/routes/oauth.test.ts → apps/api/src/_deprecated/oauth/oauth.test.ts

packages/db/src/schema/pg/oauth.ts     → packages/db/src/schema/_deprecated/pg-oauth.ts
packages/db/src/schema/sqlite/oauth.ts → packages/db/src/schema/_deprecated/sqlite-oauth.ts

apps/platform/src/app/dashboard/oauth/ → apps/platform/src/app/dashboard/_deprecated/oauth/
apps/platform/src/lib/mcp-oauth-detection.ts → apps/platform/src/lib/_deprecated/mcp-oauth-detection.ts
apps/platform/src/components/mcp/oauth-setup-guide.tsx → apps/platform/src/components/mcp/_deprecated/oauth-setup-guide.tsx

packages/gateway-cloud/src/gateway/oauth.ts → packages/gateway-cloud/src/_deprecated/oauth.ts
```

### Code Changes

- Remove OAuth routes mount from `apps/api/src/app.ts`
- Remove OAuth schema exports from `packages/db/src/schema/*/index.ts`
- Keep database tables (don't delete migrations)

## Part 2: AuthToken Setup Flow

### Core Flow

```
User selects MCP Server
       ↓
Display Token setup form (with plain text instructions)
       ↓
User pastes Token
       ↓
Click "Verify & Save"
       ↓
Immediately attempt MCP Server connection
       ↓
Success → Save Token → Show "✓ Connected"
Failure → Show error → Don't save
```

### Verify API

```
POST /api/mcp-servers/verify
Body: { serverUrl: string, authToken: string }

Response (success):
{ success: true, tools: ["tool1", "tool2", ...], toolCount: 12 }

Response (failure):
{ success: false, error: "Connection refused" | "Invalid token" | "Timeout" }
```

### Token Storage

Use existing `encrypted_env` column in `mcp_server` table (AES-256-GCM encryption).

## Part 3: Platform UI (Cloud Users)

**Location**: Integrate into existing MCP Server management page

- `/dashboard/mcp-servers` - Add/edit MCP Server
- Form includes Auth Token field
- Verify connection before saving
- Only allow save on successful verification

### UI Layout

```
┌─────────────────────────────────────────────────┐
│ Setup Sentry MCP Server                         │
├─────────────────────────────────────────────────┤
│ Auth Token                                      │
│ ┌─────────────────────────────────────────────┐ │
│ │ sntrys_xxxxxxxxxxxxxxxxxxxxx                │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ How to get token:                               │
│ 1. Go to sentry.io/settings/auth-tokens        │
│ 2. Click "Create New Token"                    │
│ 3. Select required permission scopes           │
│ 4. Copy the generated token                    │
│                                                 │
│ [Verify & Save]  [Cancel]                       │
│                                                 │
│ ✓ Connected - Found 12 tools                   │
└─────────────────────────────────────────────────┘
```

## Part 4: CLI App (Local Users)

**Package**: `packages/cli`
**Command**: `a3i`

### Commands

```bash
# List all MCP servers
a3i list

# Add MCP server (interactive)
a3i add
> Server name: sentry
> Server URL: https://mcp.sentry.io
> Auth Token: sntrys_xxx
> Verifying connection... ✓ Connected (12 tools)
> Saved to ~/.a3i/config.json

# Add (non-interactive)
a3i add --name sentry --url https://mcp.sentry.io --token sntrys_xxx

# Verify existing connections
a3i verify [name]

# Remove
a3i remove <name>

# Edit config file (like VS Code settings.json)
a3i config
# Opens ~/.a3i/config.json for direct editing
```

### Config File Format (`~/.a3i/config.json`)

```json
{
  "servers": [
    {
      "name": "sentry",
      "url": "https://mcp.sentry.io",
      "token": "encrypted:xxxxx"
    },
    {
      "name": "linear",
      "url": "https://mcp.linear.app",
      "token": "encrypted:xxxxx"
    }
  ]
}
```

### Technical Stack

- Bun compile to single binary
- `@inquirer/prompts` for interactive input
- Token encryption using `@athreei/shared/crypto`

## Implementation Scope

### In Scope

| Task            | Location           | Description                    |
| --------------- | ------------------ | ------------------------------ |
| Deprecate OAuth | Multiple           | Move files to `_deprecated/`   |
| Verify API      | apps/api           | `POST /api/mcp-servers/verify` |
| Token setup UI  | apps/platform      | Integrate into MCP server form |
| CLI App         | packages/cli (new) | `a3i` command                  |

### Out of Scope

- Delete OAuth database tables (preserve data)
- Remove packages/dashboard (decide later)
