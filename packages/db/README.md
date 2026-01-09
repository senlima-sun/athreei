# @athreei/db

Unified Drizzle ORM interface supporting both PostgreSQL (cloud) and SQLite (self-hosted).

## Overview

This package provides a database abstraction layer using [Drizzle ORM](https://orm.drizzle.team/) that auto-detects the database type from the connection URL. This enables the same codebase to run with PostgreSQL in production and SQLite for local development or self-hosting.

## Installation

```bash
bun install
```

## Exports

| Export               | Description                  |
| -------------------- | ---------------------------- |
| `@athreei/db`        | Main entry (schema + client) |
| `@athreei/db/client` | Database client utilities    |
| `@athreei/db/schema` | Schema definitions           |
| `@athreei/db/seeds`  | Seed data utilities          |

## Usage

### Basic Usage

```typescript
import { createClient, getDb } from "@athreei/db"

// Create a new client with explicit URL
const db = createClient("postgres://user:pass@localhost:5432/athreei")

// Or use the singleton with DATABASE_URL env var
const db = getDb()
```

### Auto-Detection

The package automatically detects database type from the URL:

```typescript
import { detectDatabaseType } from "@athreei/db"

detectDatabaseType("postgres://...") // Returns: "postgresql"
detectDatabaseType("postgresql://...") // Returns: "postgresql"
detectDatabaseType("./local.db") // Returns: "sqlite"
detectDatabaseType("file:./data.sqlite") // Returns: "sqlite"
```

### Schema Access

```typescript
import { getSchema, detectDatabaseType } from "@athreei/db"

const dbType = detectDatabaseType(process.env.DATABASE_URL)
const schema = getSchema(dbType)

// Access tables
const { users, organizations, endpoints, traces } = schema
```

### Direct Schema Import

```typescript
// PostgreSQL schemas
import * as pgSchema from "@athreei/db/schema/pg"

// SQLite schemas
import * as sqliteSchema from "@athreei/db/schema/sqlite"
```

## Schema Tables

Both PostgreSQL and SQLite schemas include identical table structures:

### Auth Tables

- `users` - User accounts
- `sessions` - User sessions
- `accounts` - OAuth accounts
- `verifications` - Email verifications

### Organization Tables

- `organizations` - Organization entities
- `members` - Organization membership

### MCP Tables

- `mcpServers` - MCP server registry
- `namespaces` - Tool namespaces
- `endpoints` - API endpoints
- `apiKeys` - API key management
- `traces` - Request/response traces

### Additional Tables

- `cliTokens` - CLI authentication tokens
- `auditLog` - Audit log entries
- `permissions` - Permission definitions

## Commands

```bash
# Generate migrations from schema changes
bun run generate

# Run pending migrations
bun run migrate

# Push schema changes directly (development)
bun run push

# Open Drizzle Studio (database GUI)
bun run studio

# Seed database with initial data
bun run seed

# Run tests
bun run test

# Type check
bun run typecheck
```

## Configuration

### Environment Variables

| Variable       | Description             | Example                             |
| -------------- | ----------------------- | ----------------------------------- |
| `DATABASE_URL` | Database connection URL | `postgres://user:pass@host:5432/db` |

### PostgreSQL URL Format

```
postgres://username:password@hostname:port/database
postgresql://username:password@hostname:port/database
```

### SQLite URL Format

```
./path/to/database.sqlite
file:./path/to/database.sqlite
:memory:  # In-memory database
```

## Directory Structure

```
src/
├── index.ts           # Main entry point
├── client.ts          # Database client factory
├── schema/
│   ├── index.ts       # Schema entry point
│   ├── pg/            # PostgreSQL schemas
│   │   ├── index.ts
│   │   ├── auth.ts
│   │   ├── audit-log.ts
│   │   ├── cli-tokens.ts
│   │   ├── mcp-servers.ts
│   │   ├── namespaces.ts
│   │   ├── endpoints.ts
│   │   ├── permissions.ts
│   │   └── traces.ts
│   ├── sqlite/        # SQLite schemas (identical structure)
│   └── _deprecated/   # Deprecated schemas
├── seeds/
│   ├── index.ts
│   ├── run.ts         # Seed runner
│   └── mcp-registry.ts
└── __tests__/
    ├── client.test.ts
    └── schema/        # Schema tests
```

## API Reference

### `createClient(databaseUrl?)`

Creates a new Drizzle database client.

**Parameters:**

- `databaseUrl` - Optional connection URL (defaults to `DATABASE_URL` env var)

**Returns:** Drizzle database client

### `getDb()`

Returns the singleton database client instance. Creates a new client if one doesn't exist.

**Returns:** Drizzle database client

### `resetDb()`

Resets the singleton instance. Useful for testing or switching databases.

### `detectDatabaseType(url)`

Detects database type from connection URL.

**Parameters:**

- `url` - Database connection URL

**Returns:** `"postgresql"` or `"sqlite"`

### `getSchema(dbType)`

Returns the appropriate schema for the given database type.

**Parameters:**

- `dbType` - `"postgresql"` or `"sqlite"`

**Returns:** Schema object with all table definitions

## Development

### Adding New Tables

1. Create the table in both `src/schema/pg/` and `src/schema/sqlite/`
2. Export from the respective `index.ts` files
3. Run `bun run generate` to create migrations
4. Run `bun run migrate` to apply

### Testing

```bash
# Run all tests
bun run test

# Watch mode
bun run test:watch
```

## Dependencies

- **drizzle-orm** - TypeScript ORM
- **postgres** - PostgreSQL client
- **better-sqlite3** - SQLite client

## Dev Dependencies

- **drizzle-kit** - Migration and introspection tools

## Related Packages

- `@athreei/auth` - Auth using this database
- `@athreei/sync-server` - Sync server with its own PostgreSQL instance
- `apps/api` - API server using this database
