# Platform Frontend

The **Platform** is the main web dashboard for athreei, providing a user interface for managing MCP servers, viewing traces, and configuring endpoints. It serves as the primary interface for both local self-hosted deployments and cloud-hosted instances.

## Tech Stack

- **Framework**: Next.js 15 with Turbopack
- **React**: 19.x
- **Authentication**: Better Auth (via `@athreei/auth`)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Validation**: Zod
- **Monitoring**: Sentry
- **E2E Testing**: Playwright

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) runtime
- API server running (see `apps/api`)

### Installation

```bash
# From monorepo root
bun install

# Navigate to platform
cd apps/platform
```

### Environment Setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

Configure the following variable:

| Variable              | Description    | Default                 |
| --------------------- | -------------- | ----------------------- |
| `NEXT_PUBLIC_API_URL` | API server URL | `http://localhost:3001` |

### Development

```bash
# Standard development (cloud mode)
bun run dev

# Local/self-hosted mode (bypasses authentication)
bun run dev:local
```

The development server runs on `http://localhost:3000`.

## Deployment Modes

The platform supports two deployment modes:

### Cloud Mode (Default)

- Full authentication flow
- Organization management
- Multi-tenant support
- Output: `standalone` (Docker-ready)

### Local Mode

- Authentication bypassed
- Single-user experience
- Privacy-first, runs on user's machine
- Output: `export` (static files)

Set `ATHREEI_MODE=local` and `NEXT_PUBLIC_ATHREEI_MODE=local` for local mode builds.

## Pages & Routes

### Authentication (`/`)

| Route              | Description                          |
| ------------------ | ------------------------------------ |
| `/login`           | Sign in with email/password or OAuth |
| `/register`        | Create new account                   |
| `/forgot-password` | Request password reset               |
| `/reset-password`  | Reset password with token            |
| `/verify-email`    | Email verification                   |
| `/onboarding`      | New user onboarding wizard           |
| `/auth/cli`        | CLI authentication flow              |

### Dashboard (`/dashboard`)

| Route                                   | Description                        |
| --------------------------------------- | ---------------------------------- |
| `/dashboard`                            | Home with stats and quick actions  |
| `/dashboard/traces`                     | View tool call traces and activity |
| `/dashboard/traces/[id]`                | Trace detail view                  |
| `/dashboard/mcp-servers`                | Manage MCP server configurations   |
| `/dashboard/mcp-servers/new`            | Create new MCP server              |
| `/dashboard/mcp-servers/[id]`           | Edit MCP server                    |
| `/dashboard/endpoints`                  | Manage MCP endpoints and API keys  |
| `/dashboard/endpoints/new`              | Create new endpoint                |
| `/dashboard/endpoints/[id]`             | Endpoint details                   |
| `/dashboard/namespaces`                 | Organize servers into namespaces   |
| `/dashboard/namespaces/new`             | Create namespace                   |
| `/dashboard/namespaces/[id]`            | Namespace details                  |
| `/dashboard/registry`                   | Browse MCP server registry         |
| `/dashboard/registry/[slug]`            | Registry item details              |
| `/dashboard/organizations`              | Manage organizations               |
| `/dashboard/organizations/new`          | Create organization                |
| `/dashboard/organizations/[id]`         | Organization details               |
| `/dashboard/organizations/[id]/members` | Team member management             |
| `/dashboard/servers`                    | View active servers                |
| `/dashboard/logs`                       | Server logs                        |
| `/dashboard/permissions`                | Permission management              |
| `/dashboard/sessions`                   | Active sessions                    |
| `/dashboard/settings`                   | User settings                      |
| `/dashboard/settings/profile`           | Profile settings                   |

## Development Commands

```bash
# Development server
bun run dev              # Cloud mode with Turbopack
bun run dev:local        # Local mode with Turbopack

# Build
bun run build            # Cloud mode (standalone output)
bun run build:local      # Local mode (static export)

# Production
bun run start            # Start production server

# Quality
bun run lint             # ESLint check
bun run typecheck        # TypeScript validation

# E2E Testing
bun run test:e2e         # Run Playwright tests
bun run test:e2e:ui      # Playwright UI mode
bun run test:e2e:headed  # Run tests in headed browser
bun run test:e2e:debug   # Debug mode
```

## Architecture

```
src/
├── app/                  # Next.js App Router pages
│   ├── (auth)/           # Auth pages (grouped layout)
│   ├── dashboard/        # Dashboard pages (protected)
│   ├── onboarding/       # Onboarding wizard
│   └── auth/             # CLI auth flow
├── components/           # React components
│   ├── auth/             # Auth forms and layouts
│   ├── dashboard/        # Dashboard shell components
│   ├── endpoints/        # Endpoint management UI
│   ├── mcp/              # MCP server components
│   ├── namespaces/       # Namespace components
│   ├── onboarding/       # Onboarding wizard steps
│   └── traces/           # Trace viewer components
├── lib/                  # Utility modules
│   ├── api.ts            # Mode-aware API client
│   ├── auth-client.ts    # Better Auth client hooks
│   ├── auth-server.ts    # Server-side session handling
│   ├── mode.ts           # Local/cloud mode detection
│   └── mcp-config-parser.ts  # MCP JSON config parser
├── constants/            # App constants
├── types/                # TypeScript type definitions
└── utils/                # Helper functions
```

### Key Patterns

**Mode-Aware API Client**

The `fetchApi` function automatically handles local vs cloud mode differences:

```typescript
import { fetchApi } from "@/lib/api"

const data = await fetchApi<DataType>("/api/endpoint", {
  organizationId: activeOrg?.id,
})
```

**Server-Side Authentication**

Protected routes use `getServerSession()` to validate authentication:

```typescript
import { getServerSession } from "@/lib/auth-server"

const { user, session } = await getServerSession()
if (!user) redirect("/login")
```

**Organization Context**

Cloud mode requires organization context for most API calls:

```typescript
import { useActiveOrganizationSafe } from "@/lib/auth-client"

const { data: activeOrg, isPending } = useActiveOrganizationSafe()
```

## Related Packages

| Package                  | Description                  |
| ------------------------ | ---------------------------- |
| `@athreei/auth`          | Authentication configuration |
| `@athreei/db`            | Database client and schemas  |
| `apps/api`               | Backend API server           |
| `packages/gateway`       | Local MCP gateway            |
| `packages/gateway-cloud` | Cloud MCP gateway            |

## Testing

E2E tests use Playwright and are configured to run against the dev server:

```bash
# Run all tests
bun run test:e2e

# Run with UI for debugging
bun run test:e2e:ui
```

Test configuration is in `playwright.config.ts`.
