# Setting Up a Local Gateway

This guide walks you through setting up and configuring a local athreei gateway for personal use or development.

## Overview

The local gateway runs on your machine and provides:

- **Offline operation**: No internet required after setup
- **Full control**: All data stays on your machine
- **Custom servers**: Add any MCP-compatible server
- **Fast response**: No network latency

## Installation

### Using Bun (Recommended)

```bash
# Install the gateway package
bun install -g @athreei/gateway

# Verify installation
athreei-gateway --help
```

### Using npm

```bash
npm install -g @athreei/gateway
```

### From Source

```bash
git clone https://github.com/athreei/athreei.git
cd athreei/packages/gateway
bun install
bun run build
```

## Basic Configuration

### Standalone Mode (No Platform)

For completely local operation, create a minimal config:

```bash
mkdir -p ~/.athreei
```

Create `~/.athreei/config.json`:

```json
{
  "standalone": true,
  "servers": [
    {
      "name": "browser",
      "type": "builtin"
    }
  ]
}
```

Start the gateway:

```bash
athreei-gateway
```

### Connected Mode (With Platform)

To sync with the athreei Platform:

```json
{
  "apiKey": "atr_your_api_key",
  "endpoint": "my-workstation",
  "platformUrl": "https://athreei.com"
}
```

## Adding MCP Servers

### Built-in Browser Server

The browser server is included by default:

```json
{
  "servers": [
    {
      "name": "browser",
      "type": "builtin"
    }
  ]
}
```

### External MCP Servers

Add any MCP-compatible server by specifying its command:

```json
{
  "servers": [
    {
      "name": "browser",
      "type": "builtin"
    },
    {
      "name": "filesystem",
      "command": "mcp-server-filesystem",
      "args": ["/home/user/documents"],
      "env": {}
    },
    {
      "name": "github",
      "command": "mcp-server-github",
      "args": [],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  ]
}
```

### Server Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `name` | string | Unique server identifier (used in tool names) |
| `type` | string | `"builtin"` for athreei servers, omit for external |
| `command` | string | Command to start the server |
| `args` | string[] | Command line arguments |
| `env` | object | Environment variables (supports `${VAR}` expansion) |
| `timeout` | number | Connection timeout in milliseconds |
| `disabled` | boolean | Temporarily disable without removing |

## Transport Options

### Stdio (Default)

Best for AI apps like Claude Desktop that launch the gateway as a subprocess:

```bash
athreei-gateway
# or explicitly
athreei-gateway -t stdio
```

Configure in Claude Desktop:

```json
{
  "mcpServers": {
    "athreei": {
      "command": "athreei-gateway",
      "args": ["-c", "/path/to/config.json"]
    }
  }
}
```

### SSE (Server-Sent Events)

For web-based AI apps or multiple clients:

```bash
athreei-gateway -t sse -p 3000
```

Connect from your application:

```javascript
const eventSource = new EventSource('http://localhost:3000/sse');
```

## Logging and Debugging

### Log Levels

```bash
# Normal operation
athreei-gateway

# Debug logging (verbose)
athreei-gateway -d

# Quiet mode (errors only)
athreei-gateway -q
```

### Log Output

Logs go to stderr (stdout is reserved for MCP communication):

```bash
# Redirect logs to file
athreei-gateway 2> ~/.athreei/gateway.log
```

### Debug Environment Variables

```bash
# Enable verbose MCP protocol logging
DEBUG=mcp:* athreei-gateway -d
```

## Managing the Gateway Process

### Running as a Service (macOS)

Create `~/Library/LaunchAgents/com.athreei.gateway.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.athreei.gateway</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/athreei-gateway</string>
        <string>-t</string>
        <string>sse</string>
        <string>-p</string>
        <string>3000</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>/tmp/athreei-gateway.log</string>
</dict>
</plist>
```

Load the service:

```bash
launchctl load ~/Library/LaunchAgents/com.athreei.gateway.plist
```

### Running as a Service (Linux)

Create `/etc/systemd/user/athreei-gateway.service`:

```ini
[Unit]
Description=athreei Gateway
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/athreei-gateway -t sse -p 3000
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
```

Enable and start:

```bash
systemctl --user enable athreei-gateway
systemctl --user start athreei-gateway
```

## Advanced Configuration

### Config Sync Interval

When connected to the Platform, control how often config is refreshed:

```json
{
  "apiKey": "atr_...",
  "endpoint": "my-workstation",
  "syncInterval": 300000
}
```

Default is 5 minutes (300,000 ms).

### Custom Config Path

```bash
athreei-gateway -c /custom/path/config.json
```

### Multiple Gateways

Run multiple gateways with different configs:

```bash
# Development gateway
athreei-gateway -c ~/.athreei/dev.json -t sse -p 3001

# Production gateway
athreei-gateway -c ~/.athreei/prod.json -t sse -p 3002
```

## Troubleshooting

### Gateway won't start

1. Check config syntax: `cat ~/.athreei/config.json | jq .`
2. Verify required fields are present
3. Run with debug: `athreei-gateway -d`

### Server not connecting

1. Verify the server command exists: `which mcp-server-name`
2. Check server logs in debug output
3. Test server independently first

### Tools not appearing

1. Confirm server is connected (check debug logs)
2. Verify tool names are properly namespaced
3. Restart your AI application

See the [Troubleshooting Guide](../reference/troubleshooting.md) for more solutions.

## Next Steps

- [Using the Cloud Gateway](./cloud-gateway.md)
- [Managing API Keys](./api-keys.md)
- [MCP Configuration Reference](../reference/mcp-config.md)
