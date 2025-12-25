# @athreei/sdk

Official SDK for integrating websites with athreei AI browser automation.

## Installation

### NPM

```bash
npm install @athreei/sdk
```

```bash
yarn add @athreei/sdk
```

```bash
pnpm add @athreei/sdk
```

```bash
bun add @athreei/sdk
```

### CDN (unpkg)

```html
<!-- ESM -->
<script type="module">
  import { athreei } from 'https://unpkg.com/@athreei/sdk@latest/dist/index.js'

  athreei.onReady((info) => {
    console.log('athreei ready:', info.version)
  })
</script>

<!-- UMD (coming soon) -->
<script src="https://unpkg.com/@athreei/sdk@latest/dist/index.umd.js"></script>
<script>
  window.athreei.onReady((info) => {
    console.log('athreei ready:', info.version)
  })
</script>
```

## Quick Start

### Simple API (Recommended)

The simple API uses a singleton instance that handles setup automatically:

```javascript
import { athreei } from '@athreei/sdk'

// Wait for athreei extension to be ready
athreei.onReady((info) => {
  console.log('athreei ready:', info.version)
  console.log('Capabilities:', info.capabilities)
})

// Register a custom tool
athreei.registerTool({
  name: 'search_products',
  description: 'Search for products in the catalog',
  parameters: {
    query: {
      type: 'string',
      required: true,
      description: 'Search query text'
    },
    category: {
      type: 'string',
      description: 'Filter by category',
      enum: ['electronics', 'clothing', 'home']
    },
    maxResults: {
      type: 'number',
      default: 10,
      description: 'Maximum number of results to return'
    }
  },
  handler: async ({ query, category, maxResults }) => {
    // Your implementation
    const results = await searchProducts(query, category, maxResults)
    return {
      count: results.length,
      products: results
    }
  }
})

// Or register just the handler for a pre-registered tool
athreei.onRequest('add_to_cart', async ({ productId, quantity }) => {
  await addToCart(productId, quantity)
  return {
    success: true,
    cartCount: getCartCount()
  }
})
```

### Class-based API (Advanced)

For more control, use the `AthreeiClient` class:

```javascript
import { AthreeiClient } from '@athreei/sdk'

const client = new AthreeiClient({
  debug: true,      // Log events to console
  timeout: 30000    // Request timeout in ms
})

// Wait for ready with async/await
const info = await client.waitForReady()
console.log('Extension version:', info.version)

// Register tools
client.registerTool({
  name: 'my_tool',
  description: 'Does something awesome',
  parameters: {
    input: { type: 'string', required: true }
  },
  handler: async ({ input }) => {
    return { result: `Processed: ${input}` }
  }
})

// Hook into actions
client.onBeforeAction((action) => {
  console.log('About to execute:', action.tool)
  // Return false to cancel the action
  if (action.tool === 'dangerous_action') {
    return false
  }
})

client.onAfterAction((result) => {
  console.log('Action completed:', result.tool, result.success)
})

// Clean up when done
client.destroy()
```

## API Reference

### Simple API

#### `athreei.onReady(callback)`

Wait for the athreei extension to be ready.

**Parameters:**
- `callback: (info: AthreeiInfo) => void` - Called when extension is ready

**Example:**
```javascript
athreei.onReady((info) => {
  console.log('Version:', info.version)
  console.log('Capabilities:', info.capabilities)
})
```

#### `athreei.registerTool(definition)`

Register a custom tool that AI can invoke.

**Parameters:**
- `definition: ToolDefinition` - Tool definition object

**ToolDefinition Type:**
```typescript
interface ToolDefinition {
  name: string                          // Tool name (snake_case)
  description: string                   // What the tool does
  parameters: Record<string, ToolParameter>
  handler?: RequestHandler              // Optional handler function
  returns?: {                           // Optional return type info
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'void'
    description?: string
  }
  examples?: Array<{                    // Optional usage examples
    description: string
    args: Record<string, unknown>
    result?: unknown
  }>
  requiresPermission?: boolean          // Default: true
}

interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  required?: boolean                    // Default: false
  default?: unknown                     // Default value
  description?: string                  // Help text for AI
  enum?: (string | number)[]            // Allowed values
  items?: {                             // For array type
    type: 'string' | 'number' | 'boolean' | 'object'
  }
}

type RequestHandler = (
  args: Record<string, unknown>,
  requestId: string
) => unknown | Promise<unknown>
```

**Example:**
```javascript
athreei.registerTool({
  name: 'get_user_profile',
  description: 'Get the current user profile information',
  parameters: {
    includeOrders: {
      type: 'boolean',
      default: false,
      description: 'Include order history'
    }
  },
  handler: async ({ includeOrders }) => {
    const profile = await fetchUserProfile()
    if (includeOrders) {
      profile.orders = await fetchUserOrders()
    }
    return profile
  },
  returns: {
    type: 'object',
    description: 'User profile object with optional orders'
  }
})
```

#### `athreei.onRequest(toolName, handler)`

Register a handler for a specific tool (tool must be registered separately).

**Parameters:**
- `toolName: string` - Name of the tool
- `handler: RequestHandler` - Function to handle requests

**Returns:**
- `Unsubscribe` - Function to remove the handler

**Example:**
```javascript
const unsubscribe = athreei.onRequest('checkout', async ({ paymentMethod }) => {
  const result = await processCheckout(paymentMethod)
  return {
    orderId: result.id,
    total: result.total,
    confirmationUrl: result.url
  }
})

// Later, remove the handler
unsubscribe()
```

#### `athreei.requestPermission(options)`

Request specific permissions from the user.

**Parameters:**
- `options: PermissionOptions`

**PermissionOptions Type:**
```typescript
interface PermissionOptions {
  scopes?: PermissionScope[]          // Permission scopes
  scope?: PermissionScope             // Single scope (alternative)
  tools?: string[]                    // Specific tools to grant access
  reason?: string                     // Why you need permission
  duration?: 'session' | 'persistent' | 'once'  // Default: 'session'
}

type PermissionScope =
  | 'read'        // Read page content
  | 'interact'    // Click, type, etc.
  | 'navigate'    // Change URL
  | 'screenshot'  // Take screenshots
  | 'execute'     // Run JavaScript
  | 'custom'      // Custom tools
```

**Returns:**
- `Promise<boolean>` - True if granted

**Example:**
```javascript
const granted = await athreei.requestPermission({
  scopes: ['interact', 'read'],
  reason: 'To help you complete the checkout process',
  duration: 'session'
})

if (granted) {
  console.log('Permission granted!')
}
```

#### `athreei.onBeforeAction(callback)`

Listen for actions before they execute (can cancel them).

**Parameters:**
- `callback: ActionCallback` - Called before each action

**Returns:**
- `Unsubscribe` - Function to remove the listener

**Example:**
```javascript
athreei.onBeforeAction((action) => {
  console.log('About to:', action.tool)

  // Cancel dangerous actions
  if (action.tool === 'browser_execute_script') {
    console.warn('Blocking script execution')
    return false  // Cancel the action
  }
})
```

#### `athreei.onAfterAction(callback)`

Listen for actions after they complete.

**Parameters:**
- `callback: ActionResultCallback` - Called after each action

**Returns:**
- `Unsubscribe` - Function to remove the listener

**Example:**
```javascript
athreei.onAfterAction((result) => {
  if (!result.success) {
    console.error('Action failed:', result.tool, result.error)
  } else {
    console.log('Action completed:', result.tool, 'in', result.duration, 'ms')
  }
})
```

### AthreeiClient Class

The advanced API with more control.

#### `new AthreeiClient(options)`

Create a new client instance.

**Parameters:**
- `options: AthreeiClientOptions`

**AthreeiClientOptions Type:**
```typescript
interface AthreeiClientOptions {
  debug?: boolean      // Log to console (default: false)
  timeout?: number     // Request timeout in ms (default: 30000)
  mockMode?: boolean   // Use mock mode for testing (default: false)
}
```

**Example:**
```javascript
const client = new AthreeiClient({
  debug: process.env.NODE_ENV === 'development',
  timeout: 60000  // 1 minute timeout
})
```

#### `client.waitForReady()`

Wait for the extension to be ready.

**Returns:**
- `Promise<AthreeiInfo>` - Extension information

**Example:**
```javascript
try {
  const info = await client.waitForReady()
  console.log('Ready! Version:', info.version)
} catch (error) {
  console.error('Extension not detected:', error)
}
```

#### `client.registerTool(definition)`

Same as `athreei.registerTool()`.

#### `client.onRequest(toolName, handler)`

Same as `athreei.onRequest()`.

#### `client.requestPermission(options)`

Same as `athreei.requestPermission()`.

#### `client.onBeforeAction(callback)`

Same as `athreei.onBeforeAction()`.

#### `client.onAfterAction(callback)`

Same as `athreei.onAfterAction()`.

#### `client.destroy()`

Clean up all listeners and handlers.

**Example:**
```javascript
// When your app unmounts or user logs out
client.destroy()
```

## TypeScript Support

The SDK is written in TypeScript and includes full type definitions.

### Import Types

```typescript
import type {
  ToolDefinition,
  ToolParameter,
  RequestHandler,
  AthreeiInfo,
  PermissionOptions,
  PermissionScope,
  ActionCallback,
  ActionResultCallback,
  Unsubscribe,
  // Event types
  AiiiReadyEvent,
  AiiiRequestEvent,
  AiiiResponseEvent,
  AiiiRegisterEvent,
  AiiiPermissionEvent,
  AiiiActionBeforeEvent,
  AiiiActionAfterEvent
} from '@athreei/sdk'
```

### Type-safe Tool Registration

```typescript
import { athreei } from '@athreei/sdk'
import type { ToolDefinition } from '@athreei/sdk'

interface SearchResult {
  id: string
  title: string
  price: number
}

const searchTool: ToolDefinition = {
  name: 'search_products',
  description: 'Search for products',
  parameters: {
    query: { type: 'string', required: true }
  },
  handler: async ({ query }): Promise<{ results: SearchResult[] }> => {
    const results = await api.search(query as string)
    return { results }
  }
}

athreei.registerTool(searchTool)
```

### Custom Handler Types

```typescript
import type { RequestHandler } from '@athreei/sdk'

const myHandler: RequestHandler = async (args, requestId) => {
  console.log('Request ID:', requestId)
  return { success: true, data: args }
}

athreei.onRequest('my_tool', myHandler)
```

## Mock Mode

Test your integration without the athreei extension installed.

### Enable Mock Mode

```javascript
import { enableMockMode, athreei } from '@athreei/sdk'

// Enable before using athreei
enableMockMode({
  simulateDelay: 100,      // Delay in ms (default: 100)
  version: '0.1.0-test',   // Simulated version
  capabilities: ['click', 'type', 'navigate'],
  mockResponses: {
    'search_products': {
      results: [
        { id: '1', name: 'Test Product', price: 99.99 }
      ]
    }
  },
  autoTriggerTools: [
    {
      tool: 'get_page_info',
      args: {},
      delay: 1000
    }
  ]
})

// Now athreei.onReady() will fire immediately
athreei.onReady((info) => {
  console.log('Mock mode ready:', info.version)
})
```

### Mock Mode Functions

```javascript
import {
  enableMockMode,
  disableMockMode,
  isMockModeEnabled,
  triggerMockRequest,
  setMockResponse,
  getMockResponse,
  clearMockResponses
} from '@athreei/sdk'

// Check if mock mode is active
if (isMockModeEnabled()) {
  console.log('Running in mock mode')
}

// Manually trigger a tool request
triggerMockRequest('search_products', { query: 'test' })

// Set mock response for a tool
setMockResponse('add_to_cart', { success: true, cartCount: 3 })

// Get mock response
const response = getMockResponse('add_to_cart')

// Clear all mock responses
clearMockResponses()

// Disable mock mode
disableMockMode()
```

### Testing Example

```javascript
import { enableMockMode, athreei } from '@athreei/sdk'

// Enable mock mode in test environment
if (process.env.NODE_ENV === 'test') {
  enableMockMode({
    mockResponses: {
      'get_cart': { items: [], total: 0 },
      'add_to_cart': { success: true, cartCount: 1 }
    }
  })
}

// Your integration code
athreei.onReady(() => {
  athreei.registerTool({
    name: 'get_cart',
    description: 'Get shopping cart',
    parameters: {},
    handler: async () => {
      return { items: [], total: 0 }
    }
  })
})

// In tests, this will work without the extension
```

## Best Practices

### 1. Always Handle Errors

```javascript
athreei.onRequest('my_tool', async (args) => {
  try {
    const result = await performAction(args)
    return { success: true, data: result }
  } catch (error) {
    // Return error information
    return {
      success: false,
      error: error.message
    }
  }
})
```

### 2. Validate Input

```javascript
athreei.registerTool({
  name: 'update_quantity',
  description: 'Update product quantity',
  parameters: {
    productId: { type: 'string', required: true },
    quantity: { type: 'number', required: true }
  },
  handler: async ({ productId, quantity }) => {
    // Validate types
    if (typeof productId !== 'string') {
      throw new Error('productId must be a string')
    }
    if (typeof quantity !== 'number' || quantity < 1) {
      throw new Error('quantity must be a positive number')
    }

    // Proceed with validated data
    return await updateQuantity(productId, quantity)
  }
})
```

### 3. Provide Clear Descriptions

```javascript
// Good
athreei.registerTool({
  name: 'search_products',
  description: 'Search the product catalog by keyword, category, or filters. Returns up to 50 matching products with pricing and availability.',
  parameters: {
    query: {
      type: 'string',
      required: true,
      description: 'Search keywords (e.g., "red shoes", "laptop")'
    },
    category: {
      type: 'string',
      description: 'Filter by category slug',
      enum: ['electronics', 'clothing', 'home', 'sports']
    }
  }
})

// Bad
athreei.registerTool({
  name: 'search',
  description: 'Searches',
  parameters: {
    q: { type: 'string' }
  }
})
```

### 4. Return Structured Data

```javascript
// Good - structured, predictable
athreei.onRequest('get_order_status', async ({ orderId }) => {
  const order = await fetchOrder(orderId)
  return {
    orderId: order.id,
    status: order.status,
    items: order.items.length,
    total: order.total,
    estimatedDelivery: order.deliveryDate
  }
})

// Bad - unstructured string
athreei.onRequest('get_order_status', async ({ orderId }) => {
  const order = await fetchOrder(orderId)
  return `Order ${order.id} is ${order.status}`
})
```

### 5. Use Feature Detection

```javascript
// Check if athreei is available
let aiSupported = false

athreei.onReady(() => {
  aiSupported = true
  initializeAIFeatures()
})

// Timeout fallback
setTimeout(() => {
  if (!aiSupported) {
    console.log('athreei not detected, using standard mode')
    initializeStandardFeatures()
  }
}, 5000)
```

### 6. Clean Up Resources

```javascript
// Store unsubscribe functions
const unsubscribers = []

unsubscribers.push(
  athreei.onRequest('tool1', handler1),
  athreei.onRequest('tool2', handler2),
  athreei.onBeforeAction(beforeHandler)
)

// Clean up when component unmounts
function cleanup() {
  unsubscribers.forEach(unsub => unsub())
}

// React example
useEffect(() => {
  const unsub = athreei.onRequest('my_tool', handler)
  return () => unsub()
}, [])
```

## Troubleshooting

### Extension Not Detected

```javascript
athreei.onReady((info) => {
  console.log('Extension ready')
})

// Add timeout to detect if extension is not present
setTimeout(() => {
  console.warn('athreei extension not detected after 5 seconds')
  console.log('Please install: https://github.com/yourorg/athreei')
}, 5000)
```

### Tools Not Being Called

1. **Check tool is registered**: Tools must be registered after the extension is ready

```javascript
athreei.onReady(() => {
  // Register tools HERE, after ready
  athreei.registerTool({ ... })
})
```

2. **Check handler is attached**: If you register a tool without a handler, attach it separately

```javascript
athreei.registerTool({
  name: 'my_tool',
  description: 'Does something',
  parameters: { ... }
  // No handler here
})

// Attach handler separately
athreei.onRequest('my_tool', async (args) => {
  return { result: 'done' }
})
```

3. **Check console for errors**: Enable debug mode

```javascript
const client = new AthreeiClient({ debug: true })
```

### Requests Timing Out

Increase timeout for long-running operations:

```javascript
const client = new AthreeiClient({
  timeout: 60000  // 60 seconds
})
```

Or for long operations, return immediately and use polling:

```javascript
athreei.registerTool({
  name: 'start_export',
  description: 'Start data export (long-running)',
  parameters: { format: { type: 'string' } },
  handler: async ({ format }) => {
    const exportId = await startExport(format)
    return {
      status: 'started',
      exportId,
      message: 'Use check_export_status to monitor progress'
    }
  }
})

athreei.registerTool({
  name: 'check_export_status',
  description: 'Check export status',
  parameters: { exportId: { type: 'string', required: true } },
  handler: async ({ exportId }) => {
    const status = await getExportStatus(exportId)
    return status
  }
})
```

### TypeScript Errors

If you see type errors, make sure you have the types installed:

```bash
npm install --save-dev @types/node
```

And your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2020",
    "lib": ["ES2020", "DOM"]
  }
}
```

## Examples

See the [examples directory](../../examples/README.md) for complete working examples:

- **Basic** - Simple tool registration
- **E-commerce** - Shopping cart integration
- **Form Wizard** - Multi-step form automation
- **Dashboard** - Admin panel with data queries

## License

GPL-3.0 - See [LICENSE](../../LICENSE) for details.

## Links

- [Documentation](https://github.com/yourorg/athreei/tree/main/docs)
- [Website Integration Guide](../../docs/website-integration.md)
- [GitHub Repository](https://github.com/yourorg/athreei)
- [Report Issues](https://github.com/yourorg/athreei/issues)
