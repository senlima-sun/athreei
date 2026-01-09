# API Server

The athreei API server provides the backend for the MCP aggregator platform. It handles authentication, organization management, MCP server registry, namespaces, endpoints, traces, and gateway configuration.

## Tech Stack

- **Runtime:** Bun
- **Framework:** Hono
- **Database:** PostgreSQL (cloud) / SQLite (self-hosted) via Drizzle ORM
- **Authentication:** Better Auth
- **Validation:** Zod
- **Error Tracking:** Sentry

## Getting Started

### Prerequisites

- Bun >= 1.0
- PostgreSQL (for cloud mode) or SQLite (for local mode)

### Installation

```bash
# Install dependencies from monorepo root
bun install
```

### Environment Variables

Create a `.env` file in `apps/api/`:

```bash
# Required
DATABASE_URL=postgres://user:password@localhost:5432/athreei
# Or for SQLite: DATABASE_URL=file:./data.db

# Server
PORT=3001

# Authentication
AUTH_BASE_URL=http://localhost:3001
TRUSTED_ORIGINS=http://localhost:3000,http://localhost:5173

# CORS (production only)
CORS_ORIGINS=https://app.athreei.com

# Email (optional - for verification emails)
RESEND_API_KEY=re_xxx

# Encryption (optional - for storing MCP server env vars)
ENCRYPTION_KEY=your-32-byte-key-in-hex

# Environment
NODE_ENV=development
APP_STAGE=dev
```

### Running the Server

```bash
# Development with hot reload
bun run dev

# Production build
bun run build
bun run start
```

## API Routes

### Health & Config

| Method | Path          | Auth | Description              |
| ------ | ------------- | ---- | ------------------------ |
| GET    | `/health`     | No   | Health check endpoint    |
| GET    | `/api/config` | No   | Feature flags and config |

### Authentication

All `/api/auth/*` routes delegate to Better Auth:

| Path                        | Description             |
| --------------------------- | ----------------------- |
| `/api/auth/sign-up`         | Register new user       |
| `/api/auth/sign-in/email`   | Email/password sign in  |
| `/api/auth/sign-out`        | Sign out                |
| `/api/auth/session`         | Get current session     |
| `/api/auth/forget-password` | Request password reset  |
| `/api/auth/reset-password`  | Reset password          |
| `/api/auth/verify-email`    | Verify email            |
| `/api/auth/cli/*`           | CLI authentication flow |

### Organizations

| Method | Path                                               | Auth | Description               |
| ------ | -------------------------------------------------- | ---- | ------------------------- |
| GET    | `/api/organizations`                               | Yes  | List user's organizations |
| POST   | `/api/organizations`                               | Yes  | Create organization       |
| GET    | `/api/organizations/:id`                           | Yes  | Get organization details  |
| PATCH  | `/api/organizations/:id`                           | Yes  | Update organization       |
| DELETE | `/api/organizations/:id`                           | Yes  | Delete organization       |
| POST   | `/api/organizations/:id/invite`                    | Yes  | Invite member             |
| GET    | `/api/organizations/:id/members`                   | Yes  | List members              |
| PATCH  | `/api/organizations/:id/members/:memberId`         | Yes  | Update member role        |
| DELETE | `/api/organizations/:id/invitations/:invitationId` | Yes  | Cancel invitation         |

### Namespaces

Namespaces are logical groupings of MCP servers (like Kubernetes namespaces).

| Method | Path                                    | Auth | Description                |
| ------ | --------------------------------------- | ---- | -------------------------- |
| GET    | `/api/namespaces?organizationId=`       | Yes  | List namespaces            |
| POST   | `/api/namespaces?organizationId=`       | Yes  | Create namespace           |
| GET    | `/api/namespaces/:id`                   | Yes  | Get namespace with servers |
| PATCH  | `/api/namespaces/:id`                   | Yes  | Update namespace           |
| DELETE | `/api/namespaces/:id`                   | Yes  | Delete namespace           |
| GET    | `/api/namespaces/:id/servers`           | Yes  | List servers in namespace  |
| POST   | `/api/namespaces/:id/servers`           | Yes  | Add server to namespace    |
| PATCH  | `/api/namespaces/:id/servers/:serverId` | Yes  | Enable/disable server      |
| DELETE | `/api/namespaces/:id/servers/:serverId` | Yes  | Remove server              |

### MCP Servers

| Method | Path                                   | Auth | Description               |
| ------ | -------------------------------------- | ---- | ------------------------- |
| GET    | `/api/mcp-servers?organizationId=`     | Yes  | List MCP servers          |
| POST   | `/api/mcp-servers?organizationId=`     | Yes  | Create MCP server         |
| GET    | `/api/mcp-servers/:id`                 | Yes  | Get server details        |
| PATCH  | `/api/mcp-servers/:id`                 | Yes  | Update server             |
| DELETE | `/api/mcp-servers/:id`                 | Yes  | Delete server             |
| GET    | `/api/mcp-servers/:id/env`             | Yes  | Get decrypted env vars    |
| GET    | `/api/mcp-servers/:id/tools`           | Yes  | List server tools         |
| POST   | `/api/mcp-servers/:id/tools/refresh`   | Yes  | Refresh tools from server |
| PATCH  | `/api/mcp-servers/:id/tools/:toolName` | Yes  | Update tool config        |
| GET    | `/api/mcp-servers/:id/health`          | Yes  | Check server health       |
| POST   | `/api/mcp-servers/health-check`        | Yes  | Batch health check        |
| POST   | `/api/mcp-servers/verify`              | Yes  | Verify server connection  |

### Endpoints

Endpoints are public connection points for AI apps (URL format: `https://athreei.com/mcp/{slug}/sse`).

| Method | Path                             | Auth | Description          |
| ------ | -------------------------------- | ---- | -------------------- |
| GET    | `/api/endpoints?organizationId=` | Yes  | List endpoints       |
| POST   | `/api/endpoints`                 | Yes  | Create endpoint      |
| GET    | `/api/endpoints/:id`             | Yes  | Get endpoint details |
| PATCH  | `/api/endpoints/:id`             | Yes  | Update endpoint      |
| DELETE | `/api/endpoints/:id`             | Yes  | Delete endpoint      |

### API Keys

| Method | Path                                           | Auth | Description            |
| ------ | ---------------------------------------------- | ---- | ---------------------- |
| GET    | `/api/endpoints/:endpointId/keys`              | Yes  | List API keys (masked) |
| POST   | `/api/endpoints/:endpointId/keys`              | Yes  | Create API key         |
| DELETE | `/api/endpoints/:endpointId/keys/:keyId`       | Yes  | Revoke API key         |
| GET    | `/api/endpoints/:endpointId/keys/:keyId/stats` | Yes  | Get key usage stats    |

### Gateway

Used by the athreei Gateway to fetch configuration. Authenticates via Bearer token (API key).

| Method | Path                            | Auth    | Description            |
| ------ | ------------------------------- | ------- | ---------------------- |
| GET    | `/api/gateway/config?endpoint=` | API Key | Fetch namespace config |
| POST   | `/api/gateway/traces`           | API Key | Report traces          |

### Traces

| Method | Path                          | Auth | Description              |
| ------ | ----------------------------- | ---- | ------------------------ |
| GET    | `/api/traces?organizationId=` | Yes  | List traces with filters |
| GET    | `/api/traces/:id`             | Yes  | Get trace details        |

### Profile & Sessions

| Method | Path                       | Auth | Description          |
| ------ | -------------------------- | ---- | -------------------- |
| PATCH  | `/api/profile`             | Yes  | Update user profile  |
| POST   | `/api/profile/password`    | Yes  | Change password      |
| GET    | `/api/sessions`            | Yes  | List active sessions |
| DELETE | `/api/sessions/:sessionId` | Yes  | Revoke session       |

### Dashboard

| Method | Path                                      | Auth | Description        |
| ------ | ----------------------------------------- | ---- | ------------------ |
| GET    | `/api/dashboard/stats?organizationId=`    | Yes  | Get org statistics |
| GET    | `/api/dashboard/activity?organizationId=` | Yes  | Get activity feed  |

### Registry

| Method | Path            | Auth | Description               |
| ------ | --------------- | ---- | ------------------------- |
| GET    | `/api/registry` | No   | Public MCP server catalog |

### Audit & Permissions

| Method | Path                         | Auth | Description          |
| ------ | ---------------------------- | ---- | -------------------- |
| GET    | `/api/audit?organizationId=` | Yes  | Get audit logs       |
| GET    | `/api/permissions`           | Yes  | Get user permissions |

## Development

### Testing

```bash
# Run all tests
bun run test

# Watch mode
bun run test:watch

# Single file
npx vitest run src/__tests__/routes/api-keys.test.ts
```

### Type Checking

```bash
bun run typecheck
```

## Architecture

### Directory Structure

```
src/
  index.ts           # Entry point, server startup
  app.ts             # Hono app configuration
  instrument.ts      # Sentry initialization
  lib/
    auth.ts          # Better Auth instance
    db.ts            # Database client
    email.ts         # Email callbacks
    encryption.ts    # Env var encryption
  middleware/
    auth.ts          # Session verification
    error.ts         # Error handler
    rate-limit.ts    # Rate limiting
  routes/            # Route handlers
  schemas/           # Zod validation schemas
  services/          # Business logic
  data/              # Static data (registry)
  __tests__/         # Test files
```

### Authentication Flow

1. Session-based auth via Better Auth for web clients
2. API key auth (Bearer token) for gateway clients
3. Auth middleware verifies sessions and attaches user context

### Error Handling

- `ApiError` class for structured HTTP errors
- Global error handler with Sentry integration
- Client errors (4xx) logged locally only
- Server errors (5xx) sent to Sentry

### Rate Limiting

- In-memory rate limiting per API key
- Configurable per endpoint
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Related Packages

- `@athreei/db` - Database schema and client
- `@athreei/auth` - Better Auth configuration
- `@athreei/email` - Email templates
- `@athreei/shared` - Shared types and utilities
- `packages/gateway-cloud` - Hosted MCP gateway (consumes this API)
