# Self-Hosted Quick Start

Run athreei locally without any cloud dependencies.

## Prerequisites

- [Bun](https://bun.sh) 1.0+
- Node.js 20+ (for some MCP servers)

## Quick Start

### 1. Download Gateway Binary

```bash
# macOS Apple Silicon
curl -L https://github.com/athreei/athreei/releases/latest/download/athreei-gateway-darwin-arm64 -o athreei-gateway

# macOS Intel
curl -L https://github.com/athreei/athreei/releases/latest/download/athreei-gateway-darwin-x64 -o athreei-gateway

# Linux
curl -L https://github.com/athreei/athreei/releases/latest/download/athreei-gateway-linux-x64 -o athreei-gateway

chmod +x athreei-gateway
```

### 2. Create Configuration

```bash
mkdir -p ~/.athreei
cat > ~/.athreei/config.json << 'EOF'
{
  "servers": [
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/Documents"]
    }
  ]
}
EOF
```

### 3. Run Gateway

```bash
./athreei-gateway --local
```

## Configure Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "athreei": {
      "command": "/path/to/athreei-gateway",
      "args": ["--local"]
    }
  }
}
```

Restart Claude Desktop.

## View Local Dashboard

```bash
# Terminal 1: Gateway with HTTP API
./athreei-gateway --local --api-port 3001

# Terminal 2: Dashboard (from source)
git clone https://github.com/athreei/athreei.git
cd athreei/packages/dashboard
bun install
bun run dev

# Open http://localhost:5173
```

## Adding More Servers

Edit `~/.athreei/config.json`:

```json
{
  "servers": [
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
    },
    {
      "name": "github",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_your_token_here"
      }
    },
    {
      "name": "postgres",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_URL": "postgresql://localhost/mydb"
      }
    },
    {
      "name": "custom-sse",
      "transport": "sse",
      "url": "http://localhost:8080/sse"
    }
  ]
}
```

Restart the gateway to apply changes.

## Build From Source

```bash
git clone https://github.com/athreei/athreei.git
cd athreei
bun install

# Build gateway
cd packages/gateway
bun run build:binary

# Binary is at dist/athreei-gateway
```

## Limitations vs Cloud

| Feature | Local | Cloud |
|---------|-------|-------|
| MCP aggregation | Yes | Yes |
| Trace viewing | Yes (in-memory) | Yes (persistent) |
| Cross-device sync | No | Yes |
| Team sharing | No | Yes |
| Trace history | No (lost on restart) | Yes (retained) |

## Troubleshooting

### Gateway won't start
- Check config.json syntax with `cat ~/.athreei/config.json | jq .`
- Ensure command paths are correct

### MCP server not connecting
- Test server manually: `npx -y @modelcontextprotocol/server-filesystem /tmp`
- Check stderr output for errors

### Dashboard not showing traces
- Ensure gateway started with `--api-port 3001`
- Check http://localhost:3001/api/status
