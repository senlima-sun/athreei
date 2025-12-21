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

### For Users

1. **Install the MCP Server**

   ```bash
   # Download the binary for your platform from releases
   # Or build from source:
   git clone https://github.com/yourusername/athreei.git
   cd athreei
   bun install
   cd packages/native-host && bun run build
   ```

2. **Install the Chrome Extension**
   - Load unpacked from `packages/extension/dist/` (developer mode)
   - Or install from Chrome Web Store (coming soon)

3. **Configure Your AI App**

   For Claude Desktop, add to `claude_desktop_config.json`:

   ```json
   {
     "mcpServers": {
       "athreei": {
         "command": "/path/to/athreei-host"
       }
     }
   }
   ```

4. **Start Using**
   - Open Chrome and navigate to any website
   - Ask your AI to interact with the page
   - Grant permissions when prompted

See the [User Guide](docs/user-guide.md) for detailed instructions.

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

### For Website Owners

Integrate athreei into your website to provide custom AI tools:

```javascript
// Register a custom tool
window.addEventListener("aiii:ready", () => {
  window.dispatchEvent(
    new CustomEvent("aiii:register", {
      detail: {
        tool: "add_to_cart",
        description: "Add a product to the shopping cart",
        parameters: {
          productId: { type: "string", required: true },
          quantity: { type: "number", default: 1 },
        },
      },
    })
  )
})

// Handle tool calls
window.addEventListener("aiii:request", (e) => {
  if (e.detail.tool === "add_to_cart") {
    // Your implementation
    addToCart(e.detail.args.productId, e.detail.args.quantity)

    window.dispatchEvent(
      new CustomEvent("aiii:response", {
        detail: {
          requestId: e.detail.requestId,
          success: true,
          result: { cartCount: getCartCount() },
        },
      })
    )
  }
})
```

See the [Website Integration Guide](docs/website-integration.md) for the complete API.

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

- [User Guide](docs/user-guide.md) - Installation and usage for end users
- [Developer Guide](docs/developer-guide.md) - Development setup and contribution
- [Website Integration](docs/website-integration.md) - Integrate athreei into your website
- [API Reference](docs/api-reference.md) - Complete `aiii:*` events API

## Project Structure

```
athreei/
├── packages/
│   ├── mcp-server/      # Local MCP server (Bun)
│   ├── extension/       # Chrome extension (Manifest V3)
│   ├── dashboard/       # Web dashboard (React + Vite)
│   ├── shared/          # Shared types & utilities
│   ├── native-host/     # Native messaging bridge binary
│   └── sync-server/     # E2E encrypted sync service
└── apps/
    └── web/             # Marketing/documentation site
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
