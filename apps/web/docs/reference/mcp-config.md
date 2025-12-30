# MCP Server Configuration

This document covers the configuration options for MCP servers within athreei namespaces.

## Configuration File

The gateway reads configuration from `~/.athreei/config.json`:

```json
{
  "apiKey": "atr_your_api_key",
  "endpoint": "my-endpoint",
  "platformUrl": "https://athreei.com",
  "syncInterval": 300000
}
```

### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `apiKey` | string | Yes* | - | API key for Platform authentication |
| `endpoint` | string | Yes* | - | Endpoint name to connect to |
| `platformUrl` | string | No | `https://athreei.com` | Platform API URL |
| `syncInterval` | number | No | `300000` (5 min) | Config sync interval in ms |
| `standalone` | boolean | No | `false` | Run without Platform connection |
| `servers` | array | No* | - | MCP server configurations (standalone mode) |

*Required unless running in standalone mode with local server configs.

## Standalone Configuration

For offline operation without the Platform:

```json
{
  "standalone": true,
  "servers": [
    {
      "name": "browser",
      "type": "builtin"
    },
    {
      "name": "filesystem",
      "command": "mcp-server-filesystem",
      "args": ["/home/user/documents"]
    }
  ]
}
```

## Server Configuration

### Server Object Schema

```json
{
  "name": "server-name",
  "type": "builtin",
  "command": "/path/to/server",
  "args": ["--flag", "value"],
  "env": {
    "KEY": "value"
  },
  "timeout": 30000,
  "disabled": false
}
```

### Configuration Fields

#### name (required)

Unique identifier for the server within the namespace. Used for:

- Tool namespacing (e.g., `server-name.tool_name`)
- Logging and debugging
- Configuration references

**Rules:**
- Must be unique within the namespace
- Alphanumeric characters, hyphens, underscores only
- Case-sensitive
- Maximum 64 characters

```json
{
  "name": "my-github-server"
}
```

#### type

Server type. Currently only `"builtin"` is recognized:

```json
{
  "name": "browser",
  "type": "builtin"
}
```

When `type` is `"builtin"`, the gateway uses the internal browser server. Omit for external MCP servers.

#### command

Path or command name to start the MCP server:

```json
{
  "name": "filesystem",
  "command": "mcp-server-filesystem"
}
```

The command is resolved using PATH. For absolute paths:

```json
{
  "command": "/usr/local/bin/my-mcp-server"
}
```

#### args

Command-line arguments passed to the server:

```json
{
  "name": "filesystem",
  "command": "mcp-server-filesystem",
  "args": [
    "--root", "/home/user",
    "--read-only",
    "--max-file-size", "10mb"
  ]
}
```

#### env

Environment variables for the server process:

```json
{
  "name": "github",
  "command": "mcp-server-github",
  "env": {
    "GITHUB_TOKEN": "ghp_xxxx",
    "GITHUB_ORG": "my-org"
  }
}
```

**Variable Expansion:**

Use `${VAR}` to reference system environment variables:

```json
{
  "env": {
    "GITHUB_TOKEN": "${GITHUB_TOKEN}",
    "HOME": "${HOME}"
  }
}
```

#### timeout

Connection timeout in milliseconds:

```json
{
  "name": "slow-server",
  "command": "slow-mcp-server",
  "timeout": 60000
}
```

Default: `30000` (30 seconds)

#### disabled

Temporarily disable a server without removing it:

```json
{
  "name": "experimental",
  "command": "experimental-server",
  "disabled": true
}
```

Disabled servers are not started and their tools are not exposed.

## Built-in Servers

### Browser Server

The built-in browser server provides browser automation tools:

```json
{
  "name": "browser",
  "type": "builtin"
}
```

No additional configuration required. Tools exposed:

- `browser.browser_list_tabs`
- `browser.browser_get_active_tab`
- `browser.browser_navigate`
- `browser.browser_get_content`
- `browser.browser_get_elements`
- `browser.browser_click`
- `browser.browser_type`
- `browser.browser_scroll`
- `browser.browser_screenshot`
- `browser.browser_execute_script`
- `browser.browser_wait`

## Popular MCP Servers

### Filesystem Server

Access local files:

```json
{
  "name": "fs",
  "command": "mcp-server-filesystem",
  "args": ["/allowed/path"],
  "env": {
    "MCP_FS_READ_ONLY": "false"
  }
}
```

### GitHub Server

Interact with GitHub:

```json
{
  "name": "github",
  "command": "mcp-server-github",
  "env": {
    "GITHUB_TOKEN": "${GITHUB_TOKEN}"
  }
}
```

### Slack Server

Send Slack messages:

```json
{
  "name": "slack",
  "command": "mcp-server-slack",
  "env": {
    "SLACK_BOT_TOKEN": "${SLACK_BOT_TOKEN}"
  }
}
```

### Database Servers

PostgreSQL:

```json
{
  "name": "postgres",
  "command": "mcp-server-postgres",
  "env": {
    "DATABASE_URL": "${DATABASE_URL}"
  }
}
```

SQLite:

```json
{
  "name": "sqlite",
  "command": "mcp-server-sqlite",
  "args": ["--db", "/path/to/database.db"]
}
```

## Tool Namespacing

When multiple servers expose tools, names are prefixed with the server name:

```
[server-name].[tool-name]
```

Examples:

```
browser.browser_navigate
github.create_issue
fs.read_file
slack.send_message
```

### Avoiding Conflicts

If two servers expose the same tool name, the namespace prefix disambiguates:

```
server1.common_tool
server2.common_tool
```

## Namespace Configuration (Platform)

When using the Platform, server configuration lives in the namespace:

```json
{
  "namespaceId": "ns_abc123",
  "namespaceName": "development",
  "servers": [
    {
      "name": "browser",
      "type": "builtin"
    },
    {
      "name": "github",
      "command": "mcp-server-github",
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  ],
  "configVersion": "ns_abc123_v15"
}
```

Edit in the Platform dashboard or via API.

## Configuration Sync

### How Sync Works

1. Gateway starts and authenticates with Platform
2. Fetches namespace configuration for the endpoint
3. Connects to all configured servers
4. Periodically checks for updates (default: 5 minutes)
5. Automatically reconnects when config changes

### Config Versioning

Each configuration has a version string:

```
ns_abc123_v15
```

The gateway compares versions to detect changes. Changes trigger:

1. Disconnection from removed servers
2. Connection to new servers
3. Tool list refresh
4. Event notification

### Manual Refresh

Force a config refresh:

```bash
# Via Platform dashboard: Endpoints > Sync Now

# Or restart the gateway
```

## Environment Variable Handling

### Expansion

Variables in `${VAR}` format are expanded from the gateway's environment:

```json
{
  "env": {
    "API_KEY": "${MY_API_KEY}"
  }
}
```

If `MY_API_KEY=secret123` in the gateway's environment, the server receives `API_KEY=secret123`.

### Missing Variables

If a referenced variable doesn't exist:

- Empty string is used
- Warning logged
- Server may fail to start (depending on the server)

### Security

**Never commit secrets to configuration files.** Use environment variables:

```bash
# In your shell profile
export GITHUB_TOKEN="ghp_xxxx"

# Config file (safe to commit)
{
  "env": {
    "GITHUB_TOKEN": "${GITHUB_TOKEN}"
  }
}
```

## Validation

### Config Validation

The gateway validates configuration on startup:

```bash
athreei-gateway -d  # Shows validation errors
```

Common validation errors:

- Missing required fields
- Invalid server names
- Duplicate server names
- Invalid command paths

### Testing Servers

Test a server configuration:

```bash
# Test server independently
mcp-server-github --help

# Check server starts
mcp-server-github &
echo '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}' | nc localhost 3000
```

## Examples

### Development Setup

```json
{
  "apiKey": "atr_dev_key",
  "endpoint": "dev-laptop",
  "servers": [
    {
      "name": "browser",
      "type": "builtin"
    },
    {
      "name": "fs",
      "command": "mcp-server-filesystem",
      "args": ["${HOME}/projects"]
    },
    {
      "name": "github",
      "command": "mcp-server-github",
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  ]
}
```

### CI/CD Setup

```json
{
  "apiKey": "${ATHREEI_API_KEY}",
  "endpoint": "ci-runner",
  "servers": [
    {
      "name": "github",
      "command": "mcp-server-github",
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  ]
}
```

### Air-gapped Setup

```json
{
  "standalone": true,
  "servers": [
    {
      "name": "browser",
      "type": "builtin"
    },
    {
      "name": "fs",
      "command": "mcp-server-filesystem",
      "args": ["/data"]
    }
  ]
}
```

## Next Steps

- [API Reference](./api.md)
- [Troubleshooting](./troubleshooting.md)
- [Local Gateway Setup](../guides/local-gateway.md)
