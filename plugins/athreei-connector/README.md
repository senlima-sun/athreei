# athreei Connector

Connect Claude Code to the athreei platform for seamless plugin management, MCP server discovery, and configuration sync.

## Features

- **Plugin Sync**: Automatically sync installed plugins from athreei marketplace
- **Gateway Proxy**: Route tool calls through athreei gateway to access MCP servers
- **Configuration Management**: Keep local and cloud configurations in sync

## Installation

### Via athreei CLI

```bash
athreei plugin install athreei-connector
athreei plugin sync
```

### Manual Installation

Clone this repository to your Claude Code plugins directory:

```bash
git clone https://github.com/athreei/athreei-connector ~/.claude/plugins/athreei-connector
```

## Prerequisites

1. Install the athreei CLI:
   ```bash
   bun install -g @athreei/cli
   ```

2. Authenticate with athreei:
   ```bash
   athreei auth login
   ```

3. Select your organization:
   ```bash
   athreei org switch <org-name>
   ```

## Commands

### `/athreei sync`

Sync plugins and MCP server configurations from the athreei platform.

## Skills

### athreei-proxy

Invoke MCP server tools through the athreei gateway. Access all configured MCP servers in your organization.

## Configuration

The plugin uses your athreei CLI credentials. No additional configuration needed.

## Troubleshooting

### Gateway not running

```bash
athreei gateway start
```

### Authentication issues

```bash
athreei auth logout
athreei auth login
```

### Plugin sync issues

```bash
athreei plugin sync --dry-run  # Preview changes
athreei plugin sync            # Apply changes
```

## License

MIT
