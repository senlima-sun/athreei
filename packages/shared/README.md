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

## Directory Structure

```
src/
├── crypto/                 # E2E encryption module
│   ├── argon2.ts          # Argon2id key derivation
│   ├── encryption.ts      # AES-256-GCM encryption
│   ├── rotation.ts        # Key rotation utilities
│   └── types.ts           # Crypto type definitions
├── types/                 # Shared type definitions
│   ├── index.ts           # Core types (permissions, audit, native messaging)
│   ├── mcp-tools.ts       # MCP tool schemas and definitions
│   └── aiii-events.ts     # Website integration event schemas
└── index.ts               # Main entry point
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
} from "@athreei/shared"
```

## Dependencies

- **zod** - Schema validation
- **@noble/hashes** - Cryptographic hashing (Argon2)
- **@noble/ciphers** - AES-256-GCM encryption
