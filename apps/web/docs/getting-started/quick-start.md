# Quick Start Guide

Get athreei up and running in 5 minutes.

## What is athreei?

athreei is a privacy-focused platform that connects AI applications (Claude Desktop, ChatGPT, etc.) to your browser via the Model Context Protocol (MCP). It enables AI assistants to interact with web pages - reading content, clicking buttons, filling forms - all while keeping your data under your control.

## Prerequisites

Before you begin, make sure you have:

- [Bun](https://bun.sh) (v1.0+) or Node.js (v18+)
- A supported browser (Chrome, Edge, or Chromium-based)
- An AI application that supports MCP (Claude Desktop, etc.)

## Installation

### 1. Install the Gateway

The gateway aggregates MCP servers and provides a single connection point for AI apps.

```bash
# Install globally
bun install -g @athreei/gateway

# Or use npx
npx @athreei/gateway
```

### 2. Install the Browser Extension

Install the athreei extension from your browser's extension store:

- [Chrome Web Store](#) (coming soon)
- [Firefox Add-ons](#) (coming soon)

Or load it manually for development:

```bash
# Clone the repository
git clone https://github.com/athreei/athreei.git
cd athreei

# Install dependencies
bun install

# Build the extension
cd packages/extension
bun run build

# Load the 'dist' folder as an unpacked extension in your browser
```

### 3. Configure Your AI App

Add the athreei gateway to your AI application's MCP configuration.

**For Claude Desktop:**

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "athreei": {
      "command": "athreei-gateway",
      "args": []
    }
  }
}
```

**For other MCP-compatible apps:**

Use the stdio transport (default) or SSE transport:

```bash
# Stdio (default)
athreei-gateway

# SSE on port 3000
athreei-gateway -t sse -p 3000
```

### 4. Connect to the Platform (Optional)

For cloud sync, team collaboration, and analytics:

1. Create an account at [athreei.com](https://athreei.com)
2. Create a namespace and endpoint
3. Generate an API key
4. Configure your gateway:

```bash
# Create config file
mkdir -p ~/.athreei
cat > ~/.athreei/config.json << 'EOF'
{
  "apiKey": "atr_your_api_key_here",
  "endpoint": "your-endpoint-name",
  "platformUrl": "https://athreei.com"
}
EOF
```

## Verify Installation

### Check Gateway Status

```bash
# The gateway logs to stderr
athreei-gateway -d  # Debug mode
```

### Test Browser Connection

1. Open any web page in your browser
2. You should see the athreei extension icon turn green
3. Ask your AI assistant to "list my browser tabs"

### Expected Output

Your AI assistant should be able to respond with something like:

```
Assistant: I can see you have 3 tabs open:
1. GitHub - Your Repositories (active)
2. Google - Search Results
3. Stack Overflow - JavaScript Question
```

## Next Steps

- Read about [Core Concepts](./concepts.md) to understand namespaces, endpoints, and gateways
- Follow the [Local Gateway Guide](../guides/local-gateway.md) for advanced configuration
- Check the [API Reference](../reference/api.md) for available browser tools

## Troubleshooting

### Extension not connecting?

1. Make sure the native host is installed: `athreei-native-host --install`
2. Restart your browser after installation
3. Check extension permissions in browser settings

### Gateway not starting?

1. Verify your config file exists: `cat ~/.athreei/config.json`
2. Check API key validity on the Platform dashboard
3. Run with debug flag: `athreei-gateway -d`

See [Troubleshooting Guide](../reference/troubleshooting.md) for more solutions.
