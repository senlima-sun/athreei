# @athreei/shared

Shared types, schemas, and cryptographic utilities for the athreei platform.

## Overview

This package provides common functionality used across the athreei monorepo, including MCP tool schemas, browser event protocols, and end-to-end encryption utilities.

## Key Exports

### MCP Tool Schemas (`types/mcp-tools.ts`)

Zod schemas and TypeScript types for all MCP browser tools exposed to AI apps:

- `browser_list_tabs` - List all open browser tabs
- `browser_get_active_tab` - Get the active tab information
- `browser_navigate` - Navigate to URLs
- `browser_get_content` - Extract page content (a11y tree, HTML, text, markdown)
- `browser_get_elements` - Get interactive elements with selectors
- `browser_click` - Click elements
- `browser_type` - Type text into inputs
- `browser_scroll` - Scroll pages or elements
- `browser_screenshot` - Capture screenshots
- `browser_execute_script` - Execute JavaScript (requires permission)
- `browser_wait` - Wait for elements or conditions

### Event Schemas (`types/aiii-events.ts`)

Custom event protocols for website integration via `aiii:*` events:

- `aiii:ready` - Extension ready notification
- `aiii:request` - AI tool request
- `aiii:response` - Website response to request
- `aiii:register` - Register custom tools
- `aiii:permission` - Request permission scopes
- `aiii:action:before` / `aiii:action:after` - Action lifecycle events
- `aiii:cancel` - Cancel pending actions

### Core Types (`types/index.ts`)

Shared type definitions:

- **Permission Model** - `Permission`, `PermissionLevel`
- **Audit Logging** - `AuditLogEntry`, `AuditStatus`
- **Session Tracking** - `Session`
- **Native Messaging** - `NativeMessage`, `NativeRequest`, `NativeResponse`, `NativeEvent`
- **Browser Actions** - `AiiiToolType`, `AiiiClickArgs`, `AiiiTypeArgs`, etc.

### Cryptography (`crypto/`)

End-to-end encryption utilities for secure data sync:

- **Key Derivation** - Argon2id password-based key derivation
- **Encryption** - AES-256-GCM authenticated encryption
- **Key Rotation** - Version-based key rotation support
- **Trace Encryption** - Specialized encryption for trace data

```typescript
import { deriveKey, encrypt, decrypt } from "@athreei/shared"

// Derive key from password
const derived = await deriveKey("user-password")

// Encrypt data
const encrypted = encrypt(data, derived.key, derived.version)

// Decrypt data
const reDerived = await deriveKey("user-password", encrypted.salt)
const decrypted = decrypt(encrypted, reDerived.key)
```

### Utilities (`utils/`)

Security and logging utilities:

- **Redaction** - Redact sensitive data from logs and outputs
- **Secure Logger** - Logger that automatically redacts sensitive patterns

```typescript
import {
  redact,
  redactObject,
  createSecureLogger,
  SENSITIVE_PATTERNS,
} from "@athreei/shared"

// Redact sensitive strings
const safe = redact("token: sk_live_abc123") // "token: [REDACTED]"

// Redact sensitive fields from objects
const safeObj = redactObject({ apiKey: "secret", name: "safe" })

// Create a logger that auto-redacts sensitive data
const logger = createSecureLogger(console)
```

### Logger (`logger/`)

Zero-dependency structured logging with JSON/pretty output:

```typescript
import { createLogger, honoLogger, type LoggerEnv } from "@athreei/shared"

// Create a logger instance
const logger = createLogger({
  service: "api",
  level: "info", // "debug" | "info" | "warn" | "error"
  pretty: process.env.NODE_ENV !== "production",
})

// Basic logging
logger.info("Server started", { port: 3000 })
logger.warn("Rate limit approaching", { current: 95, limit: 100 })
logger.error("Database connection failed", { error: new Error("timeout") })
logger.debug("Processing request", { requestId: "abc123" }) // Only shown when level is "debug"

// Child loggers inherit config and merge context
const requestLogger = logger.child({ requestId: "req_123" })
requestLogger.info("Processing") // Includes requestId in all logs

// Hono middleware integration
import { Hono } from "hono"

const app = new Hono<LoggerEnv>()
app.use("*", honoLogger({ logger }))

// Access request-scoped logger in routes
app.get("/", (c) => {
  const log = c.get("logger") // Has requestId context
  log.info("Handling request")
  return c.json({ ok: true })
})
```

**Output Formats:**

JSON (production):
```json
{"level":"info","message":"Server started","timestamp":"2024-01-15T10:30:00.000Z","context":{"service":"api"},"data":{"port":3000}}
```

Pretty (development):
```
[2024-01-15T10:30:00.000Z] INFO  Server started {"service":"api"} {"port":3000}
```

**Log Levels:**
- `debug` - Detailed debugging information
- `info` - General operational messages
- `warn` - Warning conditions (rate limits, deprecations)
- `error` - Error conditions requiring attention

## Directory Structure

```
src/
├── crypto/                     # E2E encryption module
│   ├── argon2.ts              # Argon2id key derivation
│   ├── encryption.ts          # AES-256-GCM encryption
│   ├── rotation.ts            # Key rotation utilities
│   ├── trace-encryption.ts    # Trace-specific encryption
│   ├── types.ts               # Crypto type definitions
│   └── index.ts               # Crypto module exports
├── logger/                    # Structured logging module
│   ├── types.ts               # Logger type definitions
│   ├── formatters.ts          # JSON/pretty output formatters
│   ├── logger.ts              # Logger class implementation
│   ├── hono-middleware.ts     # Hono request logging middleware
│   └── index.ts               # Logger module exports
├── types/                     # Shared type definitions
│   ├── index.ts               # Core types (permissions, audit, native messaging)
│   ├── mcp-tools.ts           # MCP tool schemas and definitions
│   └── aiii-events.ts         # Website integration event schemas
├── utils/                     # Utility functions
│   ├── redact.ts              # Sensitive data redaction
│   └── index.ts               # Utils module exports
└── index.ts                   # Main entry point
```

## Usage

```typescript
import {
  // MCP Tools
  type BrowserNavigateInput,
  BrowserNavigateInputSchema,
  MCP_TOOL_DEFINITIONS,

  // Events
  type AiiiRequestEvent,
  AIII_EVENT_SCHEMAS,

  // Core types
  type Permission,
  type AuditLogEntry,

  // Crypto
  deriveKey,
  encrypt,
  decrypt,

  // Logger
  createLogger,
  honoLogger,
  Logger,
  type LogLevel,
  type LoggerConfig,
  type LoggerEnv,

  // Utils
  redact,
  redactObject,
  createSecureLogger,
  SENSITIVE_PATTERNS,

  // Version
  VERSION,
} from "@athreei/shared"
```

## Dependencies

- **zod** - Schema validation
- **@noble/hashes** - Cryptographic hashing (Argon2)
- **@noble/ciphers** - AES-256-GCM encryption
