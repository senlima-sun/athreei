# @athreei/gateway

Local MCP gateway that aggregates multiple MCP servers through a single connection point.

## Overview

This package implements a Model Context Protocol (MCP) gateway that connects to multiple MCP servers and exposes their tools through a unified interface. It acts as a proxy that routes tool calls to the appropriate underlying server.

### Architecture

```
                           ┌─────────────────┐
                           │  MCP Server 1   │
┌─────────────────┐        ├─────────────────┤
│   AI App        │        │  MCP Server 2   │
│  (Claude, GPT)  │◄──────►│  @athreei/gateway │◄──────►├─────────────────┤
│                 │  MCP   │                 │  MCP   │  MCP Server 3   │
└─────────────────┘        └─────────────────┘        ├─────────────────┤
                                                      │     ...         │
                                                      └─────────────────┘
```

## Installation

```bash
bun install

# Build the gateway
bun run build

# Build standalone binary
bun run build:binary
```

## Usage

### Run in Development

```bash
bun run dev
```

### Run with Configuration

```bash
# With custom config file
bun run dev -- --config ./my-config.json

# With debug logging
bun run dev -- --debug
```

### CLI Options

```
Usage: athreei-gateway [options]

Options:
  -c, --config <path>   Config file path (default: ~/.athreei/config.json)
  -t, --transport <type> Transport type: stdio (default) or sse
  -p, --port <port>     Port for SSE transport (default: 3000)
  -d, --debug           Enable debug logging
  -h, --help            Show help message
  -v, --version         Show version
```

### Configuration File

Create a config file at `~/.athreei/config.json`:

```json
{
  "apiKey": "your-api-key",
  "endpoint": "your-endpoint-id",
  "platformUrl": "https://api.athreei.com",
  "servers": [
    {
      "name": "browser",
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-browser"]
    },
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-server-filesystem", "/path/to/dir"]
    }
  ]
}
```

### Build Standalone Binary

```bash
bun run build:binary
```

This creates a standalone binary that can be distributed without requiring Bun:

```bash
./dist/athreei-gateway --help
```

## Features

- **Server Aggregation** - Connect to multiple MCP servers simultaneously
- **Tool Namespacing** - Prefixes tool names with server names to avoid collisions
- **Configuration Sync** - Syncs configuration from the athreei platform
- **Trace Collection** - Collects and syncs usage traces for analytics
- **Graceful Shutdown** - Clean disconnection from all servers
- **Hot Reload** - Updates server connections when config changes

## Tool Naming

Tools from connected servers are prefixed with the server name:

```
Original: browser_navigate
Prefixed: browser__browser_navigate

Original: read_file
Prefixed: filesystem__read_file
```

This prevents naming collisions when multiple servers expose similar tools.

## Directory Structure

```
src/
├── index.ts           # Entry point with CLI parsing
├── server.ts          # Gateway server setup
├── types.ts           # Type definitions
├── logger.ts          # Logging utility
├── router.ts          # Tool routing logic
├── mcp-client.ts      # MCP server connections
├── config-sync.ts     # Configuration synchronization
├── aggregator.ts      # Tool aggregation
├── trace-collector.ts # Trace collection
├── trace-sync.ts      # Trace synchronization
└── __tests__/         # Unit tests
```

## Commands

```bash
# Build to dist/
bun run build

# Build standalone binary
bun run build:binary

# Development mode (auto-restart)
bun run dev

# Run compiled version
bun run start

# Run tests
bun test

# Watch tests
bun test:watch

# Type check
bun run typecheck
```

## Configuration for Claude Desktop

Add the gateway to your Claude Desktop config:

```json
{
  "mcpServers": {
    "athreei-gateway": {
      "command": "/path/to/athreei-gateway",
      "args": ["--config", "~/.athreei/config.json"]
    }
  }
}
```

## API Reference

### Gateway State

```typescript
interface GatewayState {
  connectedMcps: Map<string, ConnectedMcp>
  aggregatedTools: AggregatedTool[]
  config: GatewayConfig
}
```

### Server Configuration

```typescript
interface McpServerConfig {
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
}
```

## Dependencies

- **@modelcontextprotocol/sdk** - MCP protocol implementation
- **@athreei/shared** - Shared types
- **@athreei/gateway-core** - Core aggregation logic

## Related Packages

- `@athreei/gateway-core` - Shared gateway logic
- `@athreei/gateway-cloud` - Cloud-hosted gateway
- `@athreei/mcp-server` - Browser MCP server
