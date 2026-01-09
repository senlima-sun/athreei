# athreei CLI

Command-line interface for the athreei MCP gateway platform. Built with React Ink for interactive terminal UI and Commander for command parsing.

## Tech Stack

- **React Ink** - Terminal UI framework for React
- **Commander** - Command-line argument parsing
- **ink-spinner** - Loading spinners
- **ink-select-input** - Interactive selection menus
- **Zod** - Input validation

## Installation

```bash
# From the monorepo root
bun install

# Build the CLI
cd apps/cli
bun run build
```

## Usage

```bash
athreei [command] [options]
```

### Global Options

| Option                 | Description                                 |
| ---------------------- | ------------------------------------------- |
| `-p, --profile <name>` | Use a specific profile (default: "default") |
| `-v, --verbose`        | Enable verbose output for debugging         |
| `-q, --quiet`          | Suppress non-essential output               |
| `-V, --version`        | Show version                                |
| `-h, --help`           | Show help                                   |

## Available Commands

### Authentication

```bash
# Login (opens browser for OAuth flow)
athreei auth login [provider]
athreei auth login athreei
athreei auth login github

# Login with token
athreei auth login --token <token>

# Logout
athreei auth logout [provider]

# Show auth status
athreei auth status

# Print access token
athreei auth token [provider]
athreei auth token --no-mask  # Show full token
```

### Organizations

```bash
# List organizations
athreei org list
athreei org list --json

# Switch active organization
athreei org switch <name>

# Show current organization
athreei org current
```

### MCP Servers

```bash
# List MCP servers
athreei mcp list
athreei mcp list --search "figma"
athreei mcp list --status active
athreei mcp list --transport stdio
athreei mcp list --json

# Create MCP server (interactive)
athreei mcp create

# Create MCP server (non-interactive)
athreei mcp create -n "My Server" -t stdio -c npx -a "@company/mcp-server"
athreei mcp create -n "HTTP Server" -t sse -u "https://api.example.com/mcp"

# Update MCP server
athreei mcp update <id> --name "New Name"
athreei mcp update <id> --transport sse --url "https://new-url.com"
athreei mcp update <id> -y  # Skip confirmation

# Show MCP server details
athreei mcp details <id>
athreei mcp details <id> --show-env  # Reveal env values
athreei mcp details <id> --json

# Delete MCP server
athreei mcp delete <id>
athreei mcp delete <id> --confirm  # Skip confirmation

# Verify server connectivity
athreei mcp verify <id>
athreei mcp verify <id> --timeout 5000

# List tools from server
athreei mcp tools <id>
athreei mcp tools <id> --json
```

### MCP Environment Variables

```bash
# List environment variables
athreei mcp env list <id>
athreei mcp env list <id> --show  # Reveal values

# Set environment variable
athreei mcp env set <id> <key> <value>

# Delete environment variable
athreei mcp env delete <id> <key>
athreei mcp env delete <id> <key> --confirm
```

### Configuration

```bash
# Initialize config file (interactive)
athreei config init
athreei config init --path ./custom.json

# Show current configuration
athreei config show
athreei config show --show-secrets
athreei config show --json

# Set config value
athreei config set <key> <value>
athreei config set apiUrl "https://api.athreei.com"
athreei config set gateway.port 8080

# Get config value
athreei config get <key>
athreei config get gateway.port

# Validate config file
athreei config validate
```

### Gateway Management

```bash
# Check gateway status
athreei gateway status
athreei gateway status --json

# Start gateway
athreei gateway start
athreei gateway start --port 3000

# Stop gateway
athreei gateway stop
athreei gateway stop --force

# View logs
athreei gateway logs
athreei gateway logs --follow
athreei gateway logs --lines 100
athreei gateway logs --level error

# Gateway configuration
athreei gateway config show
athreei gateway config set port 8080
athreei gateway config set logLevel debug
```

### Sync (Local <-> Cloud)

```bash
# Check sync status
athreei sync status
athreei sync status --json

# Show detailed diff
athreei sync diff
athreei sync diff --json

# Pull from cloud to local
athreei sync pull
athreei sync pull -y  # Skip confirmation

# Push local to cloud
athreei sync push
athreei sync push -y  # Skip confirmation
athreei sync push --delete  # Delete cloud-only servers (dangerous)
```

### Endpoints

```bash
# List endpoints
athreei endpoint list
athreei endpoint list --json

# Create endpoint (interactive)
athreei endpoint create

# Create endpoint (non-interactive)
athreei endpoint create -n "My Endpoint" -s my-endpoint

# Show endpoint details
athreei endpoint details <id>

# Delete endpoint
athreei endpoint delete <id>
athreei endpoint delete <id> --confirm
```

### API Keys

```bash
# List API keys
athreei apikey list
athreei apikey list -e <endpoint-id>
athreei apikey list --json

# Create API key (interactive)
athreei apikey create

# Create API key (non-interactive)
athreei apikey create -n "Production Key" -e <endpoint-id>
athreei apikey create -n "Temp Key" -e <endpoint-id> --expires 2024-12-31

# Revoke API key
athreei apikey revoke <key-id>
athreei apikey revoke <key-id> -e <endpoint-id>
athreei apikey revoke <key-id> --confirm
```

### Shell Completion

```bash
# Bash (add to ~/.bashrc)
eval "$(athreei completion bash)"

# Zsh (add to ~/.zshrc)
eval "$(athreei completion zsh)"

# Fish (add to ~/.config/fish/config.fish)
athreei completion fish | source
```

## Development Commands

```bash
# Development mode with watch
bun run dev

# Build for distribution
bun run build

# Type checking
bun run typecheck

# Run tests
bun run test
bun run test:watch
bun run test:coverage
```

## Architecture Overview

```
src/
  index.tsx          # Entry point, Commander setup, route definitions
  auth/              # Authentication layer
    credentials.ts   # Credential storage
    manager.ts       # Auth session management
    oauth.ts         # OAuth flow handling
    providers/       # Auth provider implementations
  commands/          # Command implementations (React Ink components)
    apikey.tsx       # API key management
    completion.ts    # Shell completion scripts
    config.tsx       # Configuration management
    endpoint.tsx     # Endpoint management
    gateway.tsx      # Gateway lifecycle management
    mcp.tsx          # MCP server management
    org.tsx          # Organization management
    sync.tsx         # Local/cloud sync
  components/        # Shared UI components
    auth-status.tsx  # Auth status display
    error.tsx        # Error display component
    login-flow.tsx   # OAuth login flow UI
  lib/               # Utilities and helpers
    api.ts           # API client
    config-loader.ts # Config file operations
    config-schema.ts # Zod schema for config
    output.ts        # Output formatting utilities
    sync-utils.ts    # Sync diff/merge utilities
    types.ts         # TypeScript type definitions
```

### Key Patterns

**Interactive TUI Components**: Each command renders a React Ink component that handles user input and displays results in a terminal-friendly format.

**State Machine Pattern**: Complex flows (like create/delete operations) use explicit state phases:

```typescript
type Phase = "loading" | "confirm" | "executing" | "success" | "error"
```

**JSON Output Mode**: Most list/status commands support `--json` for scripting:

```bash
athreei mcp list --json | jq '.servers[].name'
```

**Credential Storage**: Auth tokens are stored securely using the credential store in `~/.athreei/`.

**Config File**: Configuration is stored in `athreei.config.json` (project root or `~/.athreei/`).
