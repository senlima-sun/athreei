# @athreei/auth

Better Auth integration for the athreei platform with Drizzle adapter and organization support.

## Overview

This package provides authentication functionality using [Better Auth](https://www.better-auth.com/) with a Drizzle ORM adapter. It supports both server-side and client-side authentication with organization multi-tenancy.

## Installation

```bash
bun install
```

## Exports

The package provides multiple entry points:

| Export                 | Description               |
| ---------------------- | ------------------------- |
| `@athreei/auth`        | Main entry (all exports)  |
| `@athreei/auth/server` | Server-side auth creation |
| `@athreei/auth/client` | Client-side auth client   |
| `@athreei/auth/config` | Configuration utilities   |

## Usage

### Server-side Setup

```typescript
import { db } from "@athreei/db"
import { createAuth } from "@athreei/auth/server"

export const auth = createAuth(db)

// Use with Hono
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw)
})
```

### Client-side Setup

```typescript
import { createClient } from "@athreei/auth/client"

export const authClient = createClient("http://localhost:3000")

// Sign in
await authClient.signIn.email({
  email: "user@example.com",
  password: "password",
})

// Get current session
const session = await authClient.getSession()
```

### Advanced Configuration

```typescript
import { createAuth, createAuthConfig } from "@athreei/auth/server"
import type { AuthConfigOptions } from "@athreei/auth/config"

const options: AuthConfigOptions = {
  baseUrl: "https://api.example.com",
  trustedOrigins: ["https://app.example.com"],
  emailCallbacks: {
    sendVerificationEmail: async ({ user, url }) => {
      // Custom email sending logic
    },
    sendPasswordResetEmail: async ({ user, url }) => {
      // Custom email sending logic
    },
  },
}

export const auth = createAuth(db, options)
```

## API Reference

### `createAuth(db, options?)`

Creates a Better Auth instance with the Drizzle adapter.

**Parameters:**

- `db` - Drizzle database instance from `@athreei/db`
- `options` - Optional `AuthConfigOptions` to override defaults

**Returns:** Better Auth instance

### `createClient(baseUrl)`

Creates a client-side auth client.

**Parameters:**

- `baseUrl` - The base URL of your API server

**Returns:** Auth client instance

### Types

```typescript
type Auth = ReturnType<typeof betterAuth>

interface AuthConfigOptions {
  baseUrl?: string
  trustedOrigins?: string[]
  emailCallbacks?: EmailCallbacks
}

interface EmailCallbacks {
  sendVerificationEmail?: (params: { user: User; url: string }) => Promise<void>
  sendPasswordResetEmail?: (params: {
    user: User
    url: string
  }) => Promise<void>
}
```

## Directory Structure

```
src/
├── index.ts      # Main entry point (re-exports)
├── server.ts     # Server-side auth creation
├── client.ts     # Client-side auth client
├── config.ts     # Configuration utilities
└── __tests__/    # Unit tests
    ├── server.test.ts
    ├── client.test.ts
    └── config.test.ts
```

## Development

```bash
# Run tests
bun test

# Watch mode
bun test:watch

# Type check
bun run typecheck
```

## Dependencies

- **better-auth** - Authentication library

## Peer Dependencies

- **@athreei/db** - Database package (required for Drizzle adapter)

## Related Packages

- `@athreei/db` - Database schema with auth tables
- `@athreei/email` - Email templates for verification/reset
- `apps/api` - API server using this auth package
- `apps/platform` - Platform frontend with auth UI
