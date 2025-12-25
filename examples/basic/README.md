# Basic Example - athreei SDK

This is a minimal example demonstrating how to integrate the athreei SDK into a simple HTML page.

## What This Example Shows

1. **Simple Integration**: How to import and use the athreei SDK with just a few lines of code
2. **Mock Mode**: Testing your integration without needing the athreei extension installed
3. **Custom Tool**: Registering a custom tool (`get_page_info`) that AI apps can use
4. **UI Feedback**: Displaying connection status and tool responses in real-time
5. **Event Handling**: Listening to action lifecycle events

## Files

- `index.html` - Clean, minimal HTML page with inline CSS
- `script.js` - JavaScript with extensive inline comments explaining each step
- `README.md` - This file

## How to Run

### Option 1: Simple HTTP Server (Recommended)

The example needs to be served over HTTP (not `file://`) because it uses ES modules.

```bash
# From the athreei root directory
cd examples/basic

# Using Python 3
python3 -m http.server 8000

# OR using Bun (if you have it installed)
bun --serve index.html

# OR using Node.js http-server (install globally first: npm i -g http-server)
http-server -p 8000
```

Then open http://localhost:8000 in your browser.

### Option 2: Using Bun Dev Server

From the athreei root directory:

```bash
cd examples/basic
bun run ../../packages/sdk/dist/index.js --serve
```

## What You'll See

1. **Connection Status**: Shows when athreei is ready (immediately in mock mode)
2. **Extension Info**: Displays version, extension ID, and capabilities
3. **Test Button**: Click to simulate an AI app calling your custom tool
4. **Response Log**: See the JSON responses from your tool handler

## Understanding the Code

### Mock Mode

```javascript
import { athreei, enableMockMode } from '@athreei/sdk'

// Enable mock mode for testing without the extension
enableMockMode({
  simulateDelay: 100,
  version: '0.1.0-mock',
  capabilities: ['click', 'type', 'navigate', 'scroll', 'screenshot']
})
```

Mock mode allows you to develop and test your integration before installing the athreei extension.

### Registering a Tool

```javascript
athreei.registerTool({
  name: 'get_page_info',
  description: 'Get information about the current page',
  parameters: {
    includeMetadata: {
      type: 'boolean',
      description: 'Whether to include additional metadata',
      required: false,
      default: false
    }
  },
  handler: async ({ includeMetadata = false }) => {
    // Your tool logic here
    return {
      title: document.title,
      url: window.location.href,
      timestamp: new Date().toISOString()
    }
  }
})
```

### Handling Ready Event

```javascript
athreei.onReady((info) => {
  console.log('athreei ready:', info.version)
  // Extension is ready, your tools are registered
})
```

## Testing with the Real Extension

Once you have the athreei extension installed:

1. Remove or comment out the `enableMockMode()` call
2. Reload the page
3. The extension will detect your registered tools
4. AI apps like Claude can now use your custom tools

## Next Steps

- Check out the [e-commerce example](../ecommerce/) for a more complex integration
- Check out the [form wizard example](../form-wizard/) for multi-step interactions
- Read the [SDK documentation](../../packages/sdk/README.md) for the full API reference
- Read the [website integration guide](../../docs/website-integration.md) for best practices

## Troubleshooting

### Module not found errors

Make sure you're serving the page over HTTP, not opening it as a `file://` URL.

### Connection status stays "pending"

In mock mode, this should resolve quickly. If it doesn't, check the browser console for errors.

### Tool not being called

Check that:
1. Mock mode is enabled
2. You're clicking the test button
3. The browser console shows no errors

## Learn More

- [athreei SDK Documentation](../../packages/sdk/README.md)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Website Integration Guide](../../docs/website-integration.md)
