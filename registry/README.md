# MCP Server Registry

This directory contains the curated list of MCP (Model Context Protocol) servers available for one-click installation in athreei.

## Contributing

We welcome contributions! To add a new MCP server to the registry:

### Requirements

Your MCP server must:

- Be publicly accessible (open source or publicly documented)
- Follow the MCP protocol specification
- Have documentation for setup and usage
- Be tested and functional

### How to Add a Server

1. Fork this repository
2. Edit `mcp-servers.json`
3. Add your server entry to the `servers` array
4. Submit a pull request

### Server Entry Format

```json
{
  "slug": "your-server",
  "name": "Your Server Name",
  "description": "A brief description of what your server does",
  "publisher": "Your Name or Organization",
  "iconUrl": "https://example.com/icon.ico",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@your-org/mcp-server"],
  "docsUrl": "https://github.com/your-org/your-mcp-server",
  "envVars": [
    {
      "name": "YOUR_API_KEY",
      "description": "Description of what this key is for",
      "required": true
    }
  ],
  "categories": ["category1", "category2"],
  "verified": false
}
```

### Field Descriptions

| Field         | Type             | Required | Description                                               |
| ------------- | ---------------- | -------- | --------------------------------------------------------- |
| `slug`        | string           | Yes      | Unique identifier (lowercase, alphanumeric, hyphens only) |
| `name`        | string           | Yes      | Display name of the server                                |
| `description` | string           | Yes      | Brief description of functionality                        |
| `publisher`   | string           | Yes      | Name of the publisher/maintainer                          |
| `iconUrl`     | string           | No       | URL to the server's icon (favicon)                        |
| `transport`   | "stdio" \| "sse" | Yes      | Transport protocol used                                   |
| `command`     | string           | No\*     | Command to run (required for stdio)                       |
| `args`        | string[]         | No       | Command arguments                                         |
| `url`         | string           | No\*     | Server URL (required for sse)                             |
| `docsUrl`     | string           | Yes      | Link to documentation                                     |
| `envVars`     | array            | Yes      | Required environment variables (can be empty array)       |
| `categories`  | string[]         | Yes      | Categories for filtering                                  |
| `verified`    | boolean          | Yes      | Set to `false` for community contributions                |

### Categories

Use existing categories when possible:

- `design` - Design tools (Figma, etc.)
- `developer-tools` - Development utilities
- `productivity` - General productivity tools
- `communication` - Chat and messaging
- `documentation` - Docs and knowledge bases
- `monitoring` - Observability and logging
- `project-management` - Issue tracking, etc.
- `version-control` - Git and VCS tools

### Verification Status

- `verified: true` - Tested and verified by the athreei team
- `verified: false` - Community contribution, not yet verified

Community contributions start as unverified. The athreei team will review and test servers before marking them as verified.

## Validation

The registry file is validated against a Zod schema. Run validation locally:

```bash
bun run validate:registry
```

## Questions?

- Open an issue for questions about the registry
- Check existing MCP servers for examples
- See the [MCP specification](https://modelcontextprotocol.io/) for protocol details
