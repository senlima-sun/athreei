# Core Concepts

Understanding the key concepts in athreei will help you get the most out of the platform.

## Architecture Overview

```
AI Apps (Claude, GPT) <-> MCP Server (stdio/SSE) <-> Native Host <-> Chrome Extension <-> Websites
```

athreei creates a secure bridge between AI applications and your browser. Here's how the pieces fit together:

1. **AI Apps** communicate using the Model Context Protocol (MCP)
2. **Gateway** aggregates multiple MCP servers into a single connection
3. **Native Host** provides a secure bridge between the gateway and browser
4. **Extension** executes actions in the browser and reports results

## Namespaces

A **namespace** is a logical grouping of MCP servers that work together. Think of it as a project or workspace.

### Why Namespaces?

- **Organization**: Group related MCP servers (browser tools, file access, APIs)
- **Access Control**: Different teams can have different namespaces
- **Configuration**: Each namespace can have its own settings
- **Isolation**: Servers in one namespace don't affect others

### Example Namespace Structure

```
my-company/
  |-- development/
  |     |-- browser (athreei browser tools)
  |     |-- filesystem (local file access)
  |     |-- github (GitHub API integration)
  |
  |-- production/
        |-- browser (browser tools with stricter permissions)
        |-- slack (Slack API integration)
```

## Endpoints

An **endpoint** is a named connection point within a namespace. It defines how AI apps connect to your MCP servers.

### Endpoint Types

| Type | Description | Use Case |
|------|-------------|----------|
| Local | Runs on your machine | Development, personal use |
| Cloud | Hosted by athreei | Team collaboration, remote access |
| Self-hosted | On your infrastructure | Enterprise, compliance |

### Creating an Endpoint

```json
{
  "name": "my-workstation",
  "namespace": "development",
  "servers": [
    { "name": "browser", "type": "builtin" },
    { "name": "filesystem", "command": "mcp-fs", "args": ["/home/user"] }
  ]
}
```

## Gateway

The **gateway** is the central component that:

1. Aggregates multiple MCP servers
2. Routes tool calls to the correct server
3. Syncs configuration with the Platform
4. Manages authentication and authorization

### Gateway Modes

**Standalone Mode** (no Platform connection):
- Works completely offline
- All configuration is local
- Good for personal use or air-gapped environments

**Connected Mode** (with Platform):
- Syncs namespace configuration automatically
- Enables team collaboration
- Provides analytics and tracing
- End-to-end encrypted data sync

### Tool Namespacing

When multiple servers provide tools, the gateway prefixes tool names with the server name to avoid conflicts:

```
browser.browser_navigate      # Navigate tool from browser server
github.create_issue           # Create issue tool from github server
filesystem.read_file          # Read file tool from filesystem server
```

## MCP Servers

**MCP servers** expose tools that AI assistants can use. athreei comes with built-in browser tools, but you can add any MCP-compatible server.

### Built-in Browser Tools

| Tool | Description |
|------|-------------|
| `browser_list_tabs` | List all open tabs |
| `browser_get_active_tab` | Get current tab info |
| `browser_navigate` | Navigate to a URL |
| `browser_get_content` | Get page content (a11y, HTML, text, markdown) |
| `browser_get_elements` | List interactive elements |
| `browser_click` | Click an element |
| `browser_type` | Type text into an input |
| `browser_scroll` | Scroll the page |
| `browser_screenshot` | Take a screenshot |
| `browser_execute_script` | Run JavaScript (requires permission) |
| `browser_wait` | Wait for element or condition |

### Adding Custom Servers

In your namespace configuration:

```json
{
  "servers": [
    {
      "name": "my-custom-server",
      "command": "my-mcp-server",
      "args": ["--config", "/path/to/config.json"],
      "env": {
        "API_KEY": "secret"
      }
    }
  ]
}
```

## Permissions

athreei uses a granular permission system to control what AI assistants can do.

### Permission Levels

| Level | Description | Example |
|-------|-------------|---------|
| **Allow** | Automatically permit | Reading page titles |
| **Ask** | Prompt user each time | Executing scripts |
| **Deny** | Always block | Accessing sensitive sites |

### Permission Scopes

- **Tool-level**: Control access to specific tools
- **Domain-level**: Allow/deny actions on specific websites
- **Pattern-level**: Use wildcards for URL patterns

### Example Permission Configuration

```json
{
  "permissions": {
    "browser_navigate": "allow",
    "browser_execute_script": "ask",
    "browser_screenshot": "allow"
  },
  "domains": {
    "*.company.com": "allow",
    "*.bank.com": "deny",
    "mail.google.com": "ask"
  }
}
```

## Traces

**Traces** record every tool call for debugging, auditing, and analytics.

### What's Captured

- Tool name and arguments
- Execution time
- Result or error
- Timestamp
- User/session context

### Privacy

Trace data is encrypted end-to-end when synced to the Platform:

- Only you can decrypt your trace data
- Platform stores encrypted blobs
- Keys never leave your device
- Zero-knowledge architecture

## Security Model

athreei is designed with security as a core principle:

### Local-First

- All processing happens locally by default
- No data leaves your machine unless you opt-in
- Works completely offline

### End-to-End Encryption

- XChaCha20-Poly1305 encryption for synced data
- Argon2 key derivation from your passphrase
- Keys are derived locally, never transmitted

### Permission Prompts

- Sensitive actions require explicit user approval
- Per-domain and per-tool permission controls
- Audit log of all AI actions

### Browser Isolation

- Extension runs in isolated context
- Content scripts have limited access
- Native messaging provides secure IPC

## Next Steps

- [Set up a Local Gateway](../guides/local-gateway.md)
- [Connect to the Cloud Gateway](../guides/cloud-gateway.md)
- [Manage API Keys](../guides/api-keys.md)
- [Configure Team Collaboration](../guides/team-collaboration.md)
