# E-commerce Example - athreei SDK

This example demonstrates how to integrate the athreei SDK into an e-commerce website. It shows how AI assistants can help users search for products, add items to their cart, and complete checkout.

## Features

- Product catalog with search and category filtering
- Shopping cart with add/remove functionality
- Four custom AI tools registered with athreei:
  - `search_products` - Search the product catalog
  - `add_to_cart` - Add items to the shopping cart
  - `get_cart` - View cart contents
  - `checkout` - Complete the purchase

## How to Run

1. Make sure the SDK is built:
   ```bash
   cd ../../packages/sdk
   bun run build
   ```

2. Serve the example with any HTTP server:
   ```bash
   # Using Python
   python3 -m http.server 8080

   # Or using Bun
   bunx serve .

   # Or using Node
   npx serve .
   ```

3. Open your browser to `http://localhost:8080`

## Testing with Mock Mode

The example uses **mock mode** by default, which means it works without the athreei extension installed. Mock mode automatically:

- Simulates the extension connecting after 1 second
- Auto-triggers demo AI actions to show the tools in action:
  - Searches for "headphones" after 2 seconds
  - Adds wireless headphones to cart after 4 seconds
  - Retrieves cart contents after 5 seconds

You can watch these actions in the "AI Assistant Status" panel on the right side.

## Testing with Real Extension

To test with the actual athreei extension:

1. Remove or comment out the `enableMockMode()` call in `script.js`
2. Make sure the athreei extension is installed and running
3. The AI assistant in Claude Desktop or other AI apps will be able to use the registered tools

## What to Try

Ask your AI assistant to:

- "Find me some headphones"
- "Search for books under $20"
- "Add the wireless headphones to my cart"
- "What's in my shopping cart?"
- "Show me all electronics"
- "Checkout my cart"

## Code Structure

- `index.html` - UI with product grid, search, and shopping cart
- `script.js` - SDK integration and tool implementations
  - Product data (fake, for demo purposes)
  - Cart state management
  - UI rendering functions
  - athreei tool registration
  - Mock mode configuration

## Key Integration Points

### 1. Import the SDK
```javascript
import { athreei, enableMockMode } from '../../packages/sdk/dist/index.js'
```

### 2. Enable Mock Mode (for testing)
```javascript
enableMockMode({
  simulateDelay: 1000,
  autoTriggerTools: [...]
})
```

### 3. Wait for Ready
```javascript
athreei.onReady((info) => {
  console.log('Connected to athreei v' + info.version)
})
```

### 4. Register Tools
```javascript
athreei.registerTool({
  name: 'search_products',
  description: 'Search for products...',
  parameters: { ... },
  handler: async (args) => { ... }
})
```

### 5. Track AI Actions (optional)
```javascript
athreei.onBeforeAction((action) => {
  console.log('AI is calling:', action.tool)
})
```

## Learn More

- [athreei SDK Documentation](../../packages/sdk/README.md)
- [Website Integration Guide](../../docs/website-integration.md)
- [More Examples](../)
