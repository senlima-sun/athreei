# @athreei/extension

Chrome extension (Manifest V3) that exposes browser capabilities to AI apps via the athreei platform. Communicates with the local MCP server through Native Messaging and enables websites to register custom AI tools.

## Architecture

The extension consists of three main components:

- **Background Service Worker** (`src/background/`) - Manages native host connection, routes messages between native host and content scripts, handles browser tab operations
- **Content Scripts** (`src/content/`) - Injected into web pages, executes browser actions (click, type, scroll, etc.), bridges custom website tools to AI apps
- **Popup** (`src/popup/`) - Extension popup UI showing connection status

Communication flow:

```
AI App -> MCP Server -> Native Host -> Extension Background -> Content Script -> Website
```

## Development

```bash
# Install dependencies
bun install

# Development mode (watch for changes)
bun run dev

# Build for production
bun run build

# Run tests
bun test

# Type checking
bun run typecheck
```

## Project Structure

```
src/
├── background/          # Service worker (native messaging, tab management)
├── content/            # Content scripts injected into pages
│   ├── actions/        # Browser actions (click, type, scroll, form, etc.)
│   ├── a11y/          # Accessibility utilities
│   ├── provider-bridge.ts  # Bridge to AI providers
│   ├── website-bridge.ts   # Bridge for custom website tools
│   ├── events.ts       # aiii:* custom events
│   └── registry.ts     # Custom tool registry
├── popup/             # Extension popup UI
└── index.ts           # Shared exports

dist/                  # Compiled output (generated)
manifest.json          # Chrome extension manifest
popup.html            # Popup UI template
```

## Loading in Chrome

1. Build the extension:

   ```bash
   bun run build
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top-right corner)

4. Click "Load unpacked"

5. Select the `packages/extension` directory

6. The extension icon should appear in your toolbar

The extension requires the native host to be installed for full functionality. See the native-host package for installation instructions.

## Custom Events

The extension dispatches and listens for custom `aiii:*` events on web pages:

- `aiii:ready` - Extension ready signal
- `aiii:request` - AI requesting action on the page
- `aiii:response` - Website response to AI request
- `aiii:register` - Register custom tools for AI interaction

Websites can integrate with athreei by listening for these events and registering custom tools.
