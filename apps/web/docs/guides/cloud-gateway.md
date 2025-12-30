# Using the Cloud Gateway

The athreei Cloud Gateway enables team collaboration, remote access, and centralized management of your MCP servers.

## Overview

The Cloud Gateway provides:

- **Centralized configuration**: Manage servers from the Platform dashboard
- **Team collaboration**: Share endpoints with team members
- **Remote access**: Connect from anywhere
- **Analytics**: Track usage and performance
- **End-to-end encryption**: Your data stays private

## Prerequisites

Before using the Cloud Gateway, you need:

1. An athreei Platform account
2. An organization (created automatically with your account)
3. At least one namespace
4. An endpoint within that namespace
5. An API key with access to the endpoint

## Setting Up

### 1. Create an Account

Visit [athreei.com](https://athreei.com) and sign up. You'll automatically get:

- A personal organization
- A default namespace
- A starter endpoint

### 2. Configure Your Namespace

In the Platform dashboard:

1. Navigate to **Namespaces**
2. Select your namespace or create a new one
3. Add MCP servers to the namespace

Example namespace configuration:

```json
{
  "name": "development",
  "servers": [
    {
      "name": "browser",
      "type": "builtin"
    },
    {
      "name": "github",
      "command": "mcp-server-github"
    }
  ]
}
```

### 3. Create an Endpoint

Endpoints are connection points for your local gateway:

1. Go to **Endpoints** in your namespace
2. Click **Create Endpoint**
3. Give it a memorable name (e.g., `my-laptop`, `office-workstation`)

### 4. Generate an API Key

1. Go to **Settings > API Keys**
2. Click **Generate New Key**
3. Select the endpoint(s) this key can access
4. Copy the key (you won't see it again!)

API keys follow the format: `atr_xxxxxxxxxxxxxxxxxxxx`

### 5. Configure Your Local Gateway

Create `~/.athreei/config.json`:

```json
{
  "apiKey": "atr_your_api_key_here",
  "endpoint": "my-laptop",
  "platformUrl": "https://athreei.com"
}
```

Start the gateway:

```bash
athreei-gateway
```

## How It Works

### Initial Sync

When the gateway starts:

1. Authenticates with the Platform using your API key
2. Fetches your namespace configuration
3. Connects to all configured MCP servers
4. Begins accepting tool calls

### Continuous Sync

The gateway periodically checks for configuration changes:

- Default interval: 5 minutes
- Automatically reconnects when servers are added/removed
- No restart required for config changes

### Tool Routing

When an AI app calls a tool:

1. Gateway receives the tool call
2. Routes to the appropriate MCP server
3. Executes the action
4. Returns the result
5. Logs a trace (encrypted)

## Configuration Sync

### Understanding Config Versions

Each configuration has a version string. The gateway compares versions to detect changes:

```
Config version: ns_abc123_v15
                 |    |    |
                 |    |    +-- Version number
                 |    +------- Namespace ID
                 +------------ Prefix
```

### Manual Sync

Force a configuration refresh:

```bash
# Using the Platform dashboard
# Click "Sync Now" on your endpoint

# Or restart the gateway
pkill athreei-gateway && athreei-gateway
```

### Sync Interval

Adjust how often config is checked:

```json
{
  "apiKey": "atr_...",
  "endpoint": "my-laptop",
  "syncInterval": 60000
}
```

Value is in milliseconds. Minimum recommended: 60000 (1 minute).

## Trace Syncing

### What Gets Synced

Tool calls generate traces containing:

- Tool name and server
- Timestamp and duration
- Status (success/error)
- Arguments and results (encrypted)

### Encryption

Trace data is encrypted before leaving your machine:

1. A unique key is derived from your passphrase
2. Arguments and results are encrypted with XChaCha20-Poly1305
3. Only encrypted blobs are sent to the Platform
4. You hold the only decryption key

### Viewing Traces

In the Platform dashboard:

1. Go to **Traces**
2. Enter your decryption passphrase
3. View decrypted trace data

Without the passphrase, traces show only metadata (tool name, timestamp, status).

## Multi-Device Setup

### Same Endpoint

Connect multiple devices to the same endpoint for unified analytics:

```bash
# Device 1: Laptop
athreei-gateway -c ~/.athreei/laptop.json

# Device 2: Desktop
athreei-gateway -c ~/.athreei/desktop.json
```

Both configs point to the same endpoint but can use different API keys.

### Different Endpoints

Create separate endpoints for different purposes:

```
my-namespace/
  |-- laptop (personal development)
  |-- desktop (heavy workloads)
  |-- ci-server (automated tasks)
```

## Offline Fallback

If the Platform is unreachable:

1. Gateway uses cached configuration
2. Continues operating normally
3. Traces are stored locally
4. Syncs when connection is restored

### Cache Location

Configuration cache: `~/.athreei/cache/config.json`
Trace buffer: `~/.athreei/cache/traces.json`

## Security Considerations

### API Key Security

- Store API keys securely (use environment variables in CI)
- Rotate keys periodically
- Use separate keys for different environments
- Revoke compromised keys immediately

### Network Security

- All Platform communication uses HTTPS
- Certificate pinning prevents MITM attacks
- API keys are transmitted only in headers

### Data Privacy

- Trace payloads are encrypted client-side
- Platform cannot read your data
- Delete your traces from the dashboard anytime

## Troubleshooting

### "Authentication failed"

1. Verify API key is correct
2. Check key hasn't been revoked
3. Ensure key has endpoint access

### "Endpoint not found"

1. Confirm endpoint name matches exactly
2. Check endpoint exists in the Platform
3. Verify API key has access to that endpoint

### "Config sync failed"

1. Check internet connectivity
2. Verify Platform URL is correct
3. Try `athreei-gateway -d` for details

See [Troubleshooting Guide](../reference/troubleshooting.md) for more help.

## Next Steps

- [Managing API Keys](./api-keys.md)
- [Team Collaboration](./team-collaboration.md)
- [API Reference](../reference/api.md)
