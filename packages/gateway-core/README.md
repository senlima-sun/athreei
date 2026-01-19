# @athreei/gateway-core

Shared gateway logic for MCP server aggregation and request routing.

## Overview

This package provides the core functionality used by both the local gateway (`@athreei/gateway`) and cloud gateway (`@athreei/gateway-cloud`). It handles tool aggregation, naming, and routing across multiple MCP servers.

## Installation

```bash
bun install

# Build the package
bun run build
```

## Exports

All functionality is exported from the main entry point:

```typescript
import {
  // Types
  type OAuthConfig,
  type McpServerConfig,
  type ConnectedMcp,
  type AggregatedTool,
  type ParsedToolName,
  type RouterState,
  type ToolCallValidation,
  type RoutingInfo,
  type Logger,
  type AggregateToolsOptions,
  type RouteToolCallOptions,

  // Utilities
  noopLogger,

  // Aggregator functions
  sanitizeName,
  createPrefixedName,
  aggregateTools,
  findAggregatedTool,
  getToolsForServer,
  getAggregationSummary,

  // Router functions
  parseToolName,
  routeToolCall,
  validateToolCall,
  getRoutingInfo,
  isServerAvailable,
  getAvailableServers,
} from "@athreei/gateway-core"
```

## Usage

### Tool Aggregation

```typescript
import {
  aggregateTools,
  findAggregatedTool,
  getAggregationSummary,
} from "@athreei/gateway-core";

// Connected MCP servers
const connectedMcps = [
  {
    name: "browser",
    tools: [
      { name: "navigate", description: "Navigate to URL", inputSchema: {...} },
      { name: "click", description: "Click element", inputSchema: {...} },
    ],
  },
  {
    name: "filesystem",
    tools: [
      { name: "read_file", description: "Read file", inputSchema: {...} },
    ],
  },
];

// Aggregate all tools with prefixed names
const aggregated = aggregateTools({
  connectedMcps,
  logger: console,
});

// Result:
// [
//   { name: "browser__navigate", serverName: "browser", originalName: "navigate", ... },
//   { name: "browser__click", serverName: "browser", originalName: "click", ... },
//   { name: "filesystem__read_file", serverName: "filesystem", originalName: "read_file", ... },
// ]

// Find a specific tool
const tool = findAggregatedTool("browser__navigate", aggregated);

// Get summary
const summary = getAggregationSummary(aggregated);
// { totalTools: 3, serverCount: 2, toolsByServer: { browser: 2, filesystem: 1 } }
```

### Tool Routing

```typescript
import {
  parseToolName,
  routeToolCall,
  validateToolCall,
  getRoutingInfo,
} from "@athreei/gateway-core"

// Parse a prefixed tool name
const parsed = parseToolName("browser__navigate")
// { serverName: "browser", toolName: "navigate" }

// Create router state
const state = { connectedMcps, aggregatedTools }

// Validate a tool call
const validation = validateToolCall(state, "browser__navigate")
// { valid: true }

// Route a tool call
const result = await routeToolCall(
  state,
  "browser__navigate",
  { url: "..." },
  { logger: console }
)

// Get routing info
const info = getRoutingInfo(state, "browser__navigate")
// { serverName: "browser", toolName: "navigate", serverConfig: {...}, isConnected: true }
```

### Name Sanitization

```typescript
import { sanitizeName, createPrefixedName } from "@athreei/gateway-core"

// Sanitize server names for safe prefixing
sanitizeName("my-server") // "my_server"
sanitizeName("My Server!") // "my_server_"

// Create prefixed tool names
createPrefixedName("browser", "navigate") // "browser__navigate"
```

## API Reference

### Types

```typescript
interface OAuthConfig {
  authorizationUrl: string
  tokenUrl: string
  clientId?: string
  scopes?: string[]
  usePKCE?: boolean
}

interface McpServerConfig {
  id: string
  name: string
  description?: string
  transport: "stdio" | "sse" | "streamable-http"
  command?: string
  args?: string
  url?: string
  headers?: Record<string, string>
  env?: Record<string, string>
  version?: string
  capabilities?: string
  status: "active" | "inactive" | "pending"
  oauth?: OAuthConfig
}

interface ConnectedMcp {
  config: McpServerConfig
  sanitizedName: string
  client: Client
  tools: Tool[]
  connectedAt: Date
  lastHeartbeat?: Date
}

interface AggregatedTool {
  name: string // Prefixed name (server__tool)
  serverName: string // Origin server
  originalName: string // Original tool name
  description?: string
  inputSchema: object
}

interface ParsedToolName {
  serverName: string
  toolName: string
}

interface ToolCallValidation {
  valid: boolean
  tool?: AggregatedTool
  serverName?: string
  error?: string
}

interface RoutingInfo {
  serverName: string
  toolName: string
  serverConfig: McpServerConfig
  isConnected: boolean
}

// No-op logger for when no logger is provided
const noopLogger: Logger
```

### Aggregator Functions

| Function                           | Description                        |
| ---------------------------------- | ---------------------------------- |
| `sanitizeName(name)`               | Sanitize a name for safe prefixing |
| `createPrefixedName(server, tool)` | Create a prefixed tool name        |
| `aggregateTools(options)`          | Aggregate tools from all servers   |
| `findAggregatedTool(name, tools)`  | Find a tool by prefixed name       |
| `getToolsForServer(server, tools)` | Get all tools for a server         |
| `getAggregationSummary(tools)`     | Get aggregation statistics         |

### Router Functions

| Function                                | Description                    |
| --------------------------------------- | ------------------------------ |
| `parseToolName(name)`                   | Parse prefixed name into parts |
| `routeToolCall(name, params, options)`  | Route and execute a tool call  |
| `validateToolCall(name, params, tools)` | Validate a tool call           |
| `getRoutingInfo(name, tools)`           | Get routing information        |
| `isServerAvailable(server, tools)`      | Check if server has tools      |
| `getAvailableServers(tools)`            | Get list of available servers  |

## Directory Structure

```
src/
├── index.ts        # Main entry point
├── types.ts        # Type definitions
├── aggregator.ts   # Tool aggregation logic
├── router.ts       # Request routing logic
└── __tests__/
    ├── aggregator.test.ts
    └── router.test.ts
```

## Commands

```bash
# Build the package
bun run build

# Watch mode
bun run dev

# Run tests
bun test

# Watch tests
bun test:watch

# Type check
bun run typecheck
```

## Dependencies

- **@modelcontextprotocol/sdk** - MCP protocol types

## Related Packages

- `@athreei/gateway` - Local gateway using this core
- `@athreei/gateway-cloud` - Cloud gateway using this core
