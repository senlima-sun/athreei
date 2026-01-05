# API Code Reorganization Design

**Date:** 2026-01-06
**Status:** In Progress

## Problem

The `apps/api/src/routes/` files have grown to contain multiple concerns:

- Zod validation schemas (input/output)
- Helper functions (ID generation, slug generation, verification)
- Business logic (rate limiting, audit logging, encryption)
- Route handlers

This makes the code:

1. Hard to **read** - you have to scroll through 500-800 lines to find what you need
2. Hard to **manage** - changing a schema requires touching a handler file
3. Hard to **test** - can't unit test business logic in isolation

## Solution

Separate concerns into distinct directories:

```
apps/api/src/
├── schemas/              # Zod validation schemas
│   ├── index.ts          # Re-exports all schemas
│   ├── common.ts         # Shared schemas (pagination, etc.)
│   ├── mcp-servers.ts    # MCP server CRUD schemas
│   ├── namespaces.ts     # Namespace schemas
│   ├── endpoints.ts      # Endpoint schemas
│   ├── api-keys.ts       # API key schemas
│   ├── gateway.ts        # Gateway config/trace schemas
│   ├── organizations.ts  # Organization schemas
│   ├── tools.ts          # Tool schemas
│   ├── traces.ts         # Trace query schemas
│   └── registry.ts       # Registry query schemas
│
├── services/             # Business logic & shared helpers
│   ├── index.ts          # Re-exports all services
│   ├── organization.ts   # verifyOrganizationMembership (SHARED)
│   ├── id-generator.ts   # generateId, generateSlug, generateResourceId
│   ├── api-key.ts        # hashApiKey, generateApiKey, validateApiKey
│   ├── rate-limit.ts     # In-memory rate limiting for env access
│   ├── audit-log.ts      # Audit logging service (env access events)
│   └── endpoint-url.ts   # buildEndpointUrl, buildConnectionConfig
│
├── routes/               # Thin HTTP handlers only
│   └── ... (same files, much smaller)
│
├── lib/                  # Keep as-is (db, auth, encryption)
├── middleware/           # Keep as-is
└── ...
```

## Implementation Steps

### Phase 1: Create schemas/ directory

Extract all Zod schemas from:

- `mcp-servers.ts` → `schemas/mcp-servers.ts`
- `namespaces.ts` → `schemas/namespaces.ts`
- `endpoints.ts` → `schemas/endpoints.ts`
- `api-keys.ts` → `schemas/api-keys.ts`
- `gateway.ts` → `schemas/gateway.ts`
- `organizations.ts` → `schemas/organizations.ts`
- `tools.ts` → `schemas/tools.ts`
- `traces.ts` → `schemas/traces.ts`
- `registry.ts` → `schemas/registry.ts`

### Phase 2: Create services/ directory

Extract shared helpers:

1. **organization.ts** - `verifyOrganizationMembership()` (used in 7+ files)
2. **id-generator.ts** - `generateId()`, `generateSlug()`, `generateResourceId()`
3. **api-key.ts** - `hashApiKey()`, `generateApiKey()`, `validateApiKey()`
4. **rate-limit.ts** - Env access rate limiter from `mcp-servers.ts`
5. **audit-log.ts** - Audit logging types and functions from `mcp-servers.ts`
6. **endpoint-url.ts** - `buildEndpointUrl()`, `buildConnectionConfig()`

### Phase 3: Refactor route files

Update all route files to import from new modules:

- Remove inline schema definitions
- Remove duplicated helper functions
- Import from `../schemas` and `../services`

### Phase 4: Testing

- Run existing tests to ensure no regressions
- Add tests for new services if not covered

## Design Decisions

### Why separate schemas/?

- Schemas can be reused in multiple places (validation, OpenAPI docs, client SDK)
- Easy to find all input/output types in one place
- Can be imported independently without HTTP framework dependencies

### Why separate services/?

- Testable in isolation without HTTP layer
- DRY - no more duplicated `verifyOrganizationMembership()` in 7 files
- Clear separation: services contain logic, routes contain HTTP glue

### What stays in routes/?

- Hono app initialization
- Route definitions with HTTP verbs
- Middleware application
- Request/response handling
- Calling services and returning JSON

## File Size Impact (Estimated)

| File             | Before    | After      |
| ---------------- | --------- | ---------- |
| mcp-servers.ts   | 801 lines | ~400 lines |
| namespaces.ts    | 685 lines | ~350 lines |
| endpoints.ts     | 496 lines | ~250 lines |
| gateway.ts       | 483 lines | ~200 lines |
| api-keys.ts      | 261 lines | ~120 lines |
| organizations.ts | 330 lines | ~200 lines |

## Migration Strategy

1. Create new directories and files first
2. Copy code to new locations
3. Update imports in route files one-by-one
4. Delete duplicated code from route files
5. Run tests after each file migration
6. Commit frequently with descriptive messages
