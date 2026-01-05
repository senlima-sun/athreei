# @athreei/browser-mcp

> ⚠️ **Experimental Project**
>
> This is an experimental project for testing browser automation via MCP. It is **not part of the athreei core product vision**. The core athreei product is the MCP Gateway that aggregates multiple MCP servers - this browser MCP is just one example integration for experimentation.

Local MCP server for browser automation that connects AI apps to your browser via the Model Context Protocol (MCP).

## Overview

This package implements a Model Context Protocol (MCP) server that exposes browser automation capabilities to AI applications like Claude Desktop, ChatGPT, and other MCP-compatible clients.

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AI App        │     │  MCP Server     │     │  Chrome         │
│  (Claude, GPT)  │◄───►│  (this package) │◄───►│  Extension      │
│                 │ MCP │                 │ NM  │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

- **AI App ↔ MCP Server**: Standard MCP protocol (stdio or SSE)
- **MCP Server ↔ Extension**: Chrome Native Messaging (Phase 2.3, not yet implemented)

## Features

### Phase 2.1 - Core MCP Server ✅

- [x] MCP server with stdio transport (for Claude Desktop)
- [x] SSE transport placeholder (for web-based AI apps)
- [x] Graceful shutdown handling (SIGINT, SIGTERM)
- [x] CLI argument parsing
- [x] Error handling and logging

### Phase 2.2 - Browser Tools Registration ✅

All 11 browser automation tools are registered with **stub handlers** that return mock data:

| Tool                     | Description                                        | Status |
| ------------------------ | -------------------------------------------------- | ------ |
| `browser_list_tabs`      | List all open browser tabs                         | ✅     |
| `browser_get_active_tab` | Get the currently active tab                       | ✅     |
| `browser_navigate`       | Navigate to a URL                                  | ✅     |
| `browser_get_content`    | Get page content (a11y tree, HTML, text, markdown) | ✅     |
| `browser_get_elements`   | List interactive elements on the page              | ✅     |
| `browser_click`          | Click an element                                   | ✅     |
| `browser_type`           | Type text into an input field                      | ✅     |
| `browser_scroll`         | Scroll the page or an element                      | ✅     |
| `browser_screenshot`     | Take a screenshot                                  | ✅     |
| `browser_execute_script` | Execute JavaScript code                            | ✅     |
| `browser_wait`           | Wait for an element or condition                   | ✅     |

**Note**: These tools currently return mock data. Phase 2.3 will connect them to the Chrome extension via Native Messaging.

## Installation

```bash
# Install dependencies
bun install

# Build the server
bun run build

# Run in development mode (with auto-restart)
bun run dev

# Run the built version
bun run start
```

## Usage

### Run with stdio transport (default)

For use with Claude Desktop or other stdio-based MCP clients:

```bash
bun run src/index.ts
# or
bun run dev
```

### Run with custom client name

Useful for identifying different MCP server instances:

```bash
bun run src/index.ts --client work-claude
```

### Command-line options

```
Usage: bun run src/index.ts [options]

Options:
  -t, --transport <type>   Transport type: stdio (default) or sse
  -p, --port <port>        Port for SSE transport (default: 3000)
  -c, --client <name>      Custom client name for identification
  -h, --help               Show this help message
```

## Project Structure

```
packages/mcp-server/
├── src/
│   ├── index.ts              # Entry point with CLI arg parsing
│   ├── server.ts             # MCP server setup and configuration
│   ├── tools/
│   │   └── browser.ts        # Browser tool registrations (stub implementations)
│   ├── utils/
│   │   └── logger.ts         # Logging utility (stderr only for stdio)
│   ├── bridge/               # Native Messaging bridge (Phase 2.3)
│   └── db/                   # SQLite storage (Phase 2.4)
├── dist/                     # Build output
├── package.json
├── tsconfig.json
└── README.md
```

## Development

### Logging

**CRITICAL**: For stdio transport, all logs go to `stderr` (via `console.error`) because `stdout` is reserved for JSON-RPC communication with the MCP client.

```typescript
import { logger } from "./utils/logger.js"

logger.info("This goes to stderr")
logger.error("This also goes to stderr")
logger.debug("Only shown if DEBUG=1") // Set DEBUG env var
```

### Adding New Tools

To add a new tool:

1. Define the tool schema in `packages/shared/src/types/mcp-tools.ts`
2. Add the tool registration in `src/tools/browser.ts`:

```typescript
server.registerTool(
  "tool_name",
  {
    description: "Tool description",
    inputSchema: yourInputSchema,
  },
  async (params) => {
    // Tool implementation
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    }
  }
)
```

### Testing

```bash
# Run all tests
bun test

# Run specific test file
bun test src/server.test.ts

# Watch mode
bun test --watch
```

## Configuration for Claude Desktop

Add this to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "athreei": {
      "command": "bun",
      "args": [
        "run",
        "/absolute/path/to/athreei/packages/mcp-server/src/index.ts"
      ]
    }
  }
}
```

After updating the config, restart Claude Desktop. You should see the browser tools available in the UI.

## Next Steps

- **Phase 2.3**: Implement Native Messaging bridge to connect to Chrome extension
- **Phase 2.4**: Implement SQLite storage for audit logs, permissions, and sessions
- **Phase 3**: Build the Chrome extension with content scripts and Native Messaging client

## License

GNU General Public License v3.0

## Related Packages

- `@athreei/shared` - Shared types and protocols
- `@athreei/extension` - Chrome extension (Phase 3)
- `@athreei/dashboard` - Web dashboard (Phase 4)
- `@athreei/native-host` - Native Messaging host binary (Phase 2.3)
