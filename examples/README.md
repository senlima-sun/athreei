# athreei SDK Examples

This directory contains example projects demonstrating how to integrate the athreei SDK into your website.

## Available Examples

### [Basic Example](./basic/)

A minimal example showing the core SDK features:
- Simple tool registration
- Mock mode for testing
- Real-time UI feedback
- Clean, well-commented code

**Best for**: First-time users, understanding the basics, quick testing

### E-commerce Example (Coming Soon)

Demonstrates a realistic e-commerce integration with:
- Product search tool
- Add to cart functionality
- Checkout process
- Multiple tool interactions

**Best for**: Understanding complex multi-tool scenarios, realistic use cases

### Form Wizard Example (Coming Soon)

Shows how to build an AI-assisted multi-step form:
- Form field filling
- Validation feedback
- Step navigation
- Complex state management

**Best for**: Form-heavy applications, step-by-step workflows

## Running the Examples

All examples are static HTML pages with no build step required.

### Quick Start

```bash
# Navigate to an example directory
cd examples/basic

# Start a local HTTP server (choose one):

# Python 3
python3 -m http.server 8000

# Bun
bun --serve index.html

# Node.js http-server (install first: npm i -g http-server)
http-server -p 8000

# Then open http://localhost:8000 in your browser
```

### Why HTTP Server?

Examples use ES modules (`import` statements), which require HTTP(S) protocol. They won't work when opened as `file://` URLs.

## Mock Mode vs Real Extension

All examples support both modes:

### Mock Mode (Default)

- Works without athreei extension installed
- Great for development and testing
- Simulates extension behavior
- Enabled by default in examples

```javascript
import { athreei, enableMockMode } from '@athreei/sdk'

enableMockMode({
  simulateDelay: 100,
  version: '0.1.0-mock'
})
```

### Real Extension Mode

To test with the actual athreei extension:

1. Install the athreei extension
2. Comment out or remove the `enableMockMode()` call
3. Reload the page
4. Connect your AI app (Claude, ChatGPT, etc.) to athreei

## Example Structure

Each example follows the same structure:

```
example-name/
├── index.html          # HTML page with inline CSS
├── script.js           # JavaScript with extensive comments
└── README.md           # Example-specific documentation
```

## Learning Path

We recommend going through the examples in this order:

1. **Basic** - Understand core concepts and API
2. **E-commerce** - See realistic multi-tool scenarios
3. **Form Wizard** - Learn complex state management

## Common Patterns

### Registering a Tool

```javascript
athreei.registerTool({
  name: 'my_tool',
  description: 'What this tool does',
  parameters: {
    param1: { type: 'string', required: true }
  },
  handler: async ({ param1 }) => {
    // Your logic here
    return { result: 'success' }
  }
})
```

### Waiting for Ready

```javascript
athreei.onReady((info) => {
  console.log('Extension ready:', info.version)
  // Extension is connected, tools are registered
})
```

### Handling Lifecycle Events

```javascript
// Before action executes
athreei.onBeforeAction((action) => {
  console.log('About to execute:', action.tool)
})

// After action completes
athreei.onAfterAction((result) => {
  console.log('Completed:', result.tool, result.success)
})
```

## Troubleshooting

### "Module not found" errors

Make sure you're serving the page over HTTP, not opening as `file://`.

### Connection timeout in mock mode

Check browser console for errors. Mock mode should connect instantly.

### Real extension not detected

1. Ensure extension is installed and enabled
2. Check that you removed `enableMockMode()` call
3. Refresh the page
4. Check browser console for connection errors

### SDK import fails

Verify the relative path to the SDK is correct:
```javascript
import { athreei } from '../../packages/sdk/dist/index.js'
```

## Next Steps

After exploring the examples:

- Read the [SDK Documentation](../packages/sdk/README.md) for full API reference
- Check the [Website Integration Guide](../docs/website-integration.md) for best practices
- Join the community discussions (link TBD)
- Build your own integration!

## Contributing

Found a bug or have an idea for a new example? Contributions welcome!

1. Fork the repository
2. Create your example following the existing structure
3. Add clear comments and documentation
4. Submit a pull request

## Need Help?

- Read the [SDK Documentation](../packages/sdk/README.md)
- Check the [Website Integration Guide](../docs/website-integration.md)
- Open an issue on GitHub
- Join our community discussions

## License

Same as the main athreei project - see [LICENSE](../LICENSE) in the root directory.
