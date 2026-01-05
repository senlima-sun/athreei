# athreei

A privacy-focused platform that connects AI apps to your browser via the Model Context Protocol (MCP). Your data stays local while enabling powerful browser automation.

## What is athreei?

athreei lets you use AI assistants (Claude, ChatGPT, Gemini, etc.) to interact with websites on your behalf - filling forms, clicking buttons, reading content, and more. Unlike traditional browser automation tools, athreei:

- **Works with any AI provider** - Not locked to a single vendor
- **Keeps data local** - Your browsing data never leaves your machine
- **Gives you control** - Granular permissions per website and action
- **Lets websites customize** - Sites can register custom tools for better AI integration

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   AI App        │     │  Local MCP      │     │  Chrome         │
│  (Claude, GPT)  │◄───►│  Server         │◄───►│  Extension      │◄───► Websites
│                 │ MCP │  (Bun + TS)     │ NM  │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
              ┌─────▼─────┐ ┌────▼────-┐ ┌────▼────┐
              │  SQLite   │ |Dashboard │ │  Sync   │
              │  (local)  │ │  (Web)   │ │  (opt.) │
              └───────────┘ └──────────┘ └─────────┘
```

## Quick Start

### Automated Setup

```bash
git clone https://github.com/yourusername/athreei.git
cd athreei

# macOS / Linux
./scripts/setup.sh

# Windows (PowerShell)
.\scripts\setup.ps1
```

The setup script guides you through the entire installation process.

### Manual Setup

See [INSTALL.md](INSTALL.md) for detailed step-by-step instructions, platform-specific notes, and troubleshooting.

### For Developers

```bash
# Clone and install
git clone https://github.com/yourusername/athreei.git
cd athreei
bun install

# Development (all packages with watch)
bun run dev

# Run tests
bun test

# Build all packages
bun run build
```

See the [Developer Guide](docs/developer-guide.md) for detailed instructions.

### For Website Owners (Experimental)

> ⚠️ This feature requires AI apps to support iframe rendering in messages. Currently, no AI apps support this.

Integrate athreei into your website using the Site SDK:

```bash
npm install @athreei/site-sdk
```

```javascript
import { athreei } from "@athreei/site-sdk"

// Wait for athreei to be ready
athreei.onReady((info) => {
  console.log("athreei ready:", info.version)
})

// Register a custom tool
athreei.registerTool({
  name: "add_to_cart",
  description: "Add a product to the shopping cart",
  parameters: {
    productId: { type: "string", required: true },
    quantity: { type: "number", default: 1 },
  },
  handler: async ({ productId, quantity }) => {
    await addToCart(productId, quantity)
    return {
      success: true,
      cartCount: getCartCount(),
    }
  },
})
```

See the [Site SDK Documentation](experimental/site-sdk/README.md) for the complete API.

## Available Browser Tools

| Tool                     | Description                                                    |
| ------------------------ | -------------------------------------------------------------- |
| `browser_list_tabs`      | List all open browser tabs                                     |
| `browser_get_active_tab` | Get the current active tab                                     |
| `browser_navigate`       | Navigate to a URL                                              |
| `browser_get_content`    | Get page content (accessibility tree, HTML, text, or markdown) |
| `browser_get_elements`   | List interactive elements on the page                          |
| `browser_click`          | Click an element                                               |
| `browser_type`           | Type text into an input field                                  |
| `browser_scroll`         | Scroll the page or an element                                  |
| `browser_screenshot`     | Take a screenshot                                              |
| `browser_execute_script` | Execute JavaScript (requires permission)                       |
| `browser_wait`           | Wait for an element or condition                               |

## Documentation

- [Installation Guide](INSTALL.md) - Complete installation instructions with troubleshooting
- [User Guide](docs/user-guide.md) - Usage guide for end users
- [Developer Guide](docs/developer-guide.md) - Development setup and contribution
- [Site SDK Documentation](experimental/site-sdk/README.md) - Experimental SDK for website integration
- [Website Integration](docs/website-integration.md) - Integrate athreei into your website
- [Examples](examples/README.md) - Working code examples
- [API Reference](docs/api-reference.md) - Complete `aiii:*` events API

## Project Structure

```
athreei/
├── packages/                # Core product
│   ├── gateway/             # Local MCP gateway (binary)
│   ├── gateway-cloud/       # Cloud-hosted MCP gateway
│   ├── gateway-core/        # Shared gateway logic
│   ├── dashboard/           # Local gateway web dashboard
│   ├── db/                  # Database layer (PostgreSQL/SQLite)
│   ├── auth/                # Authentication (Better Auth)
│   ├── shared/              # Shared types & utilities
│   ├── email/               # Email templates
│   └── sync-server/         # E2E encrypted sync service
├── experimental/            # Experimental projects
│   ├── browser-mcp/         # Browser automation MCP server
│   ├── extension/           # Chrome extension
│   ├── native-host/         # Native messaging bridge
│   └── site-sdk/            # Website integration SDK
├── apps/
│   ├── api/                 # Platform API
│   ├── platform/            # Platform web UI
│   └── web/                 # Marketing site
└── examples/                # SDK usage examples
```

## Security

athreei is designed with security as a priority:

- **Default deny** - No action without explicit user permission
- **Origin-scoped permissions** - Permissions are per-website
- **Tool-scoped permissions** - Granular control per action type
- **Full audit logging** - Every AI interaction is logged
- **E2E encryption** - Optional sync uses AES-256-GCM encryption
- **Local-first** - Data stays on your machine by default

## Tech Stack

- **Runtime:** Bun
- **Language:** TypeScript 5.7 (strict mode)
- **Backend:** Hono web framework
- **Frontend:** React 18, Vite 6, Tailwind CSS v4, shadcn/ui
- **Database:** SQLite (local), PostgreSQL (sync server)
- **Protocol:** Model Context Protocol (MCP)
- **Testing:** Vitest

## Contributing

Contributions are welcome! Please read the [Developer Guide](docs/developer-guide.md) for development setup and guidelines.

## License

GPL-3.0 - See [LICENSE](LICENSE) for details.
