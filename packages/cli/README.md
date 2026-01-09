# @athreei/cli

Command-line tool for managing MCP servers locally. This is the **local server management CLI** (`a3i`) for adding, verifying, and managing MCP server connections stored in `~/.a3i/config.json`.

## Relationship to apps/cli

| Package | Binary | Purpose |
|---------|--------|---------|
| `packages/cli` (`@athreei/cli`) | `a3i` | Local MCP server management - add, remove, verify servers |
| `apps/cli` (`a3i`) | `athreei` | Cloud platform CLI - auth, sync, organizations, API keys |

This package focuses on **local-first** MCP server management with encrypted token storage.

## Installation

```bash
# From monorepo root
cd packages/cli
bun install

# Run directly
bun run dev

# Build and use binary
bun run build:binary
./a3i --help
```

## Commands

### list

List all configured MCP servers.

```bash
a3i list
```

Output shows server name, URL, and token status (encrypted/plaintext).

### add

Add a new MCP server. Supports both interactive and non-interactive modes.

```bash
# Interactive mode (prompts for details)
a3i add

# Non-interactive mode
a3i add --name figma --url https://mcp.example.com/figma --token sk-xxx
```

**Options:**
- `-n, --name <name>` - Server name (letters, numbers, hyphens, underscores)
- `-u, --url <url>` - Server URL
- `-t, --token <token>` - API token (encrypted before storage)

### verify

Test connection to MCP server(s) and list available tools.

```bash
# Verify single server
a3i verify figma

# Verify all servers
a3i verify
```

Connects via MCP SSE transport and lists available tools on success.

### remove

Remove an MCP server from configuration.

```bash
# With confirmation prompt
a3i remove figma

# Skip confirmation
a3i remove figma --force
```

**Options:**
- `-f, --force` - Skip confirmation prompt

### config

Open the config file in your default editor.

```bash
a3i config
```

Uses `$EDITOR`, `$VISUAL`, or platform defaults (TextEdit on macOS, notepad on Windows, nano on Linux).

## Configuration

Configuration is stored in `~/.a3i/config.json`:

```json
{
  "servers": [
    {
      "name": "figma",
      "url": "https://mcp.example.com/figma",
      "token": "encrypted:base64..."
    }
  ]
}
```

## Security

Tokens are encrypted at rest using AES-256-GCM with a machine-specific key:

1. A random 32-byte seed is generated and stored in `~/.a3i/.key` (mode 0600)
2. The encryption key is derived from this seed using scrypt
3. Each token is encrypted with a unique 12-byte nonce
4. Encrypted tokens are stored as `encrypted:base64...`

## API Reference

### Config Library (`src/lib/config.ts`)

| Function | Description |
|----------|-------------|
| `readConfig()` | Read configuration from `~/.a3i/config.json` |
| `writeConfig(config)` | Write configuration to file |
| `addServer(server)` | Add or update a server in config |
| `removeServer(name)` | Remove a server by name, returns boolean |
| `getServer(name)` | Get a server by name |
| `getServers()` | Get all configured servers |
| `getConfigPath()` | Get the config file path |

### Crypto Library (`src/lib/crypto.ts`)

| Function | Description |
|----------|-------------|
| `encryptToken(plainToken)` | Encrypt a token, returns `encrypted:base64...` |
| `decryptToken(encryptedToken)` | Decrypt a token, handles both encrypted and plaintext |
| `isEncrypted(token)` | Check if a token is encrypted |

### MCP Library (`src/lib/mcp.ts`)

| Function | Description |
|----------|-------------|
| `verifyServer(server)` | Verify connection to a single MCP server |
| `verifyServers(servers)` | Verify connection to multiple servers in parallel |

### Types (`src/types.ts`)

```typescript
interface ServerConfig {
  name: string
  url: string
  token: string // encrypted:base64... format
}

interface Config {
  servers: ServerConfig[]
}

interface AddOptions {
  name?: string
  url?: string
  token?: string
}

interface VerifyResult {
  name: string
  url: string
  success: boolean
  error?: string
  tools?: string[]
}
```

## Development

```bash
# Run in development mode
bun run dev

# Build JavaScript bundle
bun run build

# Build standalone binary
bun run build:binary

# Type check
bun run typecheck
```

## Dependencies

- `commander` - CLI argument parsing
- `@inquirer/prompts` - Interactive prompts
- `@modelcontextprotocol/sdk` - MCP client for server verification
- `@noble/ciphers` - AES-256-GCM encryption
- `@noble/hashes` - scrypt key derivation
