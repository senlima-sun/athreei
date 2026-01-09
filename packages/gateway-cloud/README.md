# @athreei/gateway-cloud

Cloud-hosted MCP gateway service with SSE endpoints for clients that can't run local binaries.

## Overview

This package provides a cloud-hosted version of the MCP gateway using [Hono](https://hono.dev/) as the web framework. It exposes Server-Sent Events (SSE) endpoints that allow AI applications to connect without installing local software.

### Architecture

```
┌─────────────────┐       HTTPS/SSE        ┌─────────────────┐
│   AI App        │◄─────────────────────► │  Gateway Cloud  │
│  (Web client)   │                        │  (this package) │
└─────────────────┘                        └────────┬────────┘
                                                    │
                           ┌────────────────────────┼────────────────────────┐
                           │                        │                        │
                           ▼                        ▼                        ▼
                  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
                  │  MCP Server 1   │      │  MCP Server 2   │      │  MCP Server n   │
                  └─────────────────┘      └─────────────────┘      └─────────────────┘
```

## Installation

```bash
bun install
```

## Usage

### Development

```bash
bun run dev
```

### Production

```bash
bun run build
bun run start
```

## Configuration

### Environment Variables

| Variable       | Description               | Default       |
| -------------- | ------------------------- | ------------- |
| `PORT`         | Server port               | `3001`        |
| `PLATFORM_URL` | Platform API URL          | Required      |
| `NODE_ENV`     | Environment mode          | `development` |
| `SENTRY_DSN`   | Sentry error tracking DSN | Optional      |

## API Endpoints

### Health Check

```
GET /health
```

Returns server health status.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### SSE Connection

```
GET /sse
```

Establishes an SSE connection for MCP communication.

**Headers:**

- `Authorization: Bearer <api-key>` - API key for authentication

**Response:** Server-Sent Events stream

## Features

- **Hono Web Framework** - Fast, lightweight, and TypeScript-first
- **SSE Transport** - Real-time bidirectional communication
- **Per-Connection Gateways** - Isolated gateway instances per client
- **Session Management** - Track active connections
- **CORS Support** - Cross-origin requests enabled
- **Sentry Integration** - Error tracking and monitoring
- **Health Monitoring** - Health check endpoint for load balancers

## Directory Structure

```
src/
├── index.ts           # Entry point with Hono app and server setup
├── instrument.ts      # Sentry instrumentation
├── types.ts           # Type definitions
├── gateway/
│   └── session.ts     # Session management
├── routes/
│   ├── health.ts      # Health check endpoint
│   └── sse.ts         # SSE endpoint
└── services/
    └── trace-recorder.ts  # Trace recording for observability
```

## Commands

```bash
# Build to dist/
bun run build

# Development mode (auto-restart)
bun run dev

# Run compiled version
bun run start

# Run tests
bun test

# Watch tests
bun test:watch

# Test coverage
bun test:coverage

# Type check
bun run typecheck
```

## Deployment

### Docker

```dockerfile
FROM oven/bun:latest
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
EXPOSE 3001
CMD ["bun", "run", "start"]
```

### Environment Setup

```bash
# Required
export PLATFORM_URL="https://api.athreei.com"

# Optional
export PORT=3001
export NODE_ENV=production
export SENTRY_DSN="https://..."
```

## API Reference

### Session Types

```typescript
interface GatewaySession {
  id: string
  apiKey: string
  connectedMcps: Map<string, ConnectedMcp>
  aggregatedTools: AggregatedTool[]
  createdAt: Date
}
```

### SSE Message Format

```typescript
// Server → Client
{
  event: "message",
  data: {
    jsonrpc: "2.0",
    method: "tools/list",
    result: {...}
  }
}

// Client → Server (via POST)
{
  jsonrpc: "2.0",
  method: "tools/call",
  params: {
    name: "server__tool_name",
    arguments: {...}
  }
}
```

## Dependencies

- **hono** - Web framework
- **zod** - Schema validation
- **@sentry/bun** - Error tracking
- **@modelcontextprotocol/sdk** - MCP protocol
- **@athreei/gateway-core** - Shared gateway logic
- **@athreei/shared** - Shared types

## Related Packages

- `@athreei/gateway-core` - Shared gateway logic
- `@athreei/gateway` - Local gateway binary
- `apps/api` - Platform API server
