# athreei Documentation

Welcome to the athreei documentation. athreei is a privacy-focused platform that connects AI applications to your browser via the Model Context Protocol (MCP).

## Getting Started

New to athreei? Start here:

- [Quick Start Guide](./getting-started/quick-start.md) - Get up and running in 5 minutes
- [Core Concepts](./getting-started/concepts.md) - Understand namespaces, endpoints, and gateways

## Guides

Step-by-step guides for common tasks:

- [Setting Up a Local Gateway](./guides/local-gateway.md) - Run the gateway on your machine
- [Using the Cloud Gateway](./guides/cloud-gateway.md) - Connect to the athreei Platform
- [Managing API Keys](./guides/api-keys.md) - Create, rotate, and secure API keys
- [Team Collaboration](./guides/team-collaboration.md) - Share configurations with your team
- [Deployment Guide](./guides/deployment.md) - Deploy athreei services to production

## Reference

Detailed technical documentation:

- [API Reference](./reference/api.md) - MCP tools and Platform REST API
- [MCP Server Configuration](./reference/mcp-config.md) - Configure MCP servers
- [Troubleshooting](./reference/troubleshooting.md) - Diagnose and fix common issues

## Architecture

```
AI Apps (Claude, GPT) <-> MCP Server (stdio/SSE) <-> Native Host <-> Chrome Extension <-> Websites
```

athreei creates a secure bridge between AI applications and your browser:

1. **AI Apps** communicate using the Model Context Protocol (MCP)
2. **Gateway** aggregates multiple MCP servers into a single connection
3. **Native Host** provides a secure bridge between the gateway and browser
4. **Extension** executes actions in the browser and reports results

## Key Features

- **Privacy-First**: All data stays local unless you opt-in to sync
- **End-to-End Encryption**: Synced data is encrypted with keys only you hold
- **Open Protocol**: Built on the standard Model Context Protocol
- **Extensible**: Add any MCP-compatible server
- **Team-Ready**: Collaborate with shared namespaces and configurations

## Quick Links

- [GitHub Repository](https://github.com/athreei/athreei)
- [Platform Dashboard](https://athreei.com)
- [Discord Community](https://discord.gg/athreei)
- [Report an Issue](https://github.com/athreei/athreei/issues)

## License

athreei is open source software licensed under the MIT License.
