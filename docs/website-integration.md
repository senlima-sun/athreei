# Website Integration Guide

This guide explains how website owners can integrate athreei to provide custom AI capabilities for their users.

## Table of Contents

- [Overview](#overview)
- [Using the SDK (Recommended)](#using-the-sdk-recommended)
- [Quick Start](#quick-start)
- [Events Reference](#events-reference)
- [Registering Custom Tools](#registering-custom-tools)
- [Handling Tool Requests](#handling-tool-requests)
- [Action Hooks](#action-hooks)
- [Permission Requests](#permission-requests)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Overview

athreei allows websites to enhance AI interactions through a custom event system. When a user has the athreei extension installed, your website can:

1. **Register custom tools** - Define actions specific to your website that AI can invoke
2. **Handle AI requests** - Implement custom logic when AI calls your tools
3. **Hook into actions** - Intercept and modify built-in actions before they execute
4. **Request permissions** - Ask for specific permission scopes

This integration is entirely optional. If your website doesn't implement any `aiii:*` events, athreei's built-in tools will still work.

## Using the SDK (Recommended)

The easiest way to integrate athreei is using the official `@athreei/sdk` package. The SDK provides:

- TypeScript type definitions
- Simplified API with automatic event handling
- Mock mode for testing without the extension
- Built-in error handling and validation
- Better developer experience

### Installation

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

### SDK Quick Start

```javascript
import { athreei } from '@athreei/sdk'

// Wait for athreei extension to be ready
athreei.onReady((info) => {
  console.log('athreei ready:', info.version)
})

// Register a custom tool with built-in handler
athreei.registerTool({
  name: 'add_to_cart',
  description: 'Add a product to the shopping cart',
  parameters: {
    productId: {
      type: 'string',
      required: true,
      description: 'The product ID or SKU'
    },
    quantity: {
      type: 'number',
      default: 1,
      description: 'Quantity to add'
    }
  },
  handler: async ({ productId, quantity }) => {
    // Your implementation
    await addToCart(productId, quantity)
    return {
      success: true,
      cartCount: getCartCount(),
      message: `Added ${quantity}x ${productId} to cart`
    }
  }
})
```

### SDK Benefits

**With SDK:**
```javascript
import { athreei } from '@athreei/sdk'

athreei.registerTool({
  name: 'my_tool',
  description: 'Does something',
  parameters: {
    input: { type: 'string', required: true }
  },
  handler: async ({ input }) => {
    return { result: input.toUpperCase() }
  }
})
```

**Without SDK (raw events):**
```javascript
window.addEventListener('aiii:ready', () => {
  window.dispatchEvent(new CustomEvent('aiii:register', {
    detail: {
      tool: 'my_tool',
      description: 'Does something',
      parameters: {
        input: { type: 'string', required: true }
      }
    }
  }))
})

window.addEventListener('aiii:request', (event) => {
  const { requestId, tool, args } = event.detail
  if (tool === 'my_tool') {
    try {
      const result = { result: args.input.toUpperCase() }
      window.dispatchEvent(new CustomEvent('aiii:response', {
        detail: { requestId, success: true, result }
      }))
    } catch (error) {
      window.dispatchEvent(new CustomEvent('aiii:response', {
        detail: { requestId, success: false, error: error.message }
      }))
    }
  }
})
```

The SDK version is shorter, clearer, and handles errors automatically.

### SDK Documentation

For complete SDK documentation, see:
- [SDK README](../packages/sdk/README.md) - Full API reference and examples
- [Examples Directory](../examples/README.md) - Working example projects

## Quick Start

This section shows the raw event-based API. For most use cases, we recommend using the SDK instead (see above).

Add this snippet to detect athreei and register a custom tool:

```html
<script>
  // Wait for athreei extension to be ready
  window.addEventListener("aiii:ready", () => {
    console.log("athreei extension detected!")

    // Register a custom tool
    window.dispatchEvent(
      new CustomEvent("aiii:register", {
        detail: {
          tool: "my_custom_action",
          description: "Performs a custom action on this website",
          parameters: {
            itemId: {
              type: "string",
              required: true,
              description: "The item ID",
            },
          },
        },
      })
    )
  })

  // Handle requests to your custom tool
  window.addEventListener("aiii:request", (event) => {
    const { requestId, tool, args } = event.detail

    if (tool === "my_custom_action") {
      // Perform your action
      const result = performCustomAction(args.itemId)

      // Send response back
      window.dispatchEvent(
        new CustomEvent("aiii:response", {
          detail: {
            requestId,
            success: true,
            result,
          },
        })
      )
    }
  })
</script>
```

## Events Reference

### Events from Extension to Page

| Event                | Description                                      |
| -------------------- | ------------------------------------------------ |
| `aiii:ready`         | Extension is loaded and ready                    |
| `aiii:request`       | AI is requesting a custom tool call              |
| `aiii:action:before` | Built-in action is about to execute (cancelable) |
| `aiii:action:after`  | Built-in action has completed                    |

### Events from Page to Extension

| Event             | Description               |
| ----------------- | ------------------------- |
| `aiii:register`   | Register a custom tool    |
| `aiii:response`   | Respond to a tool request |
| `aiii:permission` | Request permission scope  |

## Registering Custom Tools

### Basic Registration

```javascript
window.addEventListener("aiii:ready", () => {
  window.dispatchEvent(
    new CustomEvent("aiii:register", {
      detail: {
        tool: "tool_name",
        description: "What this tool does",
        parameters: {
          param1: {
            type: "string",
            required: true,
            description: "Description of param1",
          },
          param2: {
            type: "number",
            required: false,
            default: 10,
            description: "Optional numeric param",
          },
        },
      },
    })
  )
})
```

### Parameter Types

| Type      | Description    | Example            |
| --------- | -------------- | ------------------ |
| `string`  | Text value     | `"hello"`          |
| `number`  | Numeric value  | `42`, `3.14`       |
| `boolean` | True/false     | `true`, `false`    |
| `array`   | List of values | `["a", "b"]`       |
| `object`  | Nested object  | `{ key: "value" }` |

### Parameter Options

```javascript
parameters: {
  myParam: {
    type: 'string',      // Required: data type
    required: true,      // Is this parameter required?
    default: 'value',    // Default value if not provided
    description: 'Help', // Description for AI
    enum: ['a', 'b'],    // Allowed values (optional)
    minLength: 1,        // String min length (optional)
    maxLength: 100,      // String max length (optional)
    minimum: 0,          // Number minimum (optional)
    maximum: 100,        // Number maximum (optional)
  }
}
```

### Multiple Tools

Register multiple tools by dispatching multiple events:

```javascript
window.addEventListener("aiii:ready", () => {
  const tools = [
    {
      tool: "search_products",
      description: "Search for products",
      parameters: { query: { type: "string", required: true } },
    },
    {
      tool: "add_to_cart",
      description: "Add item to cart",
      parameters: {
        productId: { type: "string", required: true },
        quantity: { type: "number", default: 1 },
      },
    },
    {
      tool: "checkout",
      description: "Proceed to checkout",
      parameters: {},
    },
  ]

  tools.forEach((tool) => {
    window.dispatchEvent(new CustomEvent("aiii:register", { detail: tool }))
  })
})
```

## Handling Tool Requests

When AI calls your custom tool, you receive an `aiii:request` event:

```javascript
window.addEventListener("aiii:request", async (event) => {
  const { requestId, tool, args, timeout } = event.detail

  // Only handle your tools
  if (tool !== "my_tool") return

  try {
    // Perform the action (can be async)
    const result = await performAction(args)

    // Send success response
    window.dispatchEvent(
      new CustomEvent("aiii:response", {
        detail: {
          requestId, // Must match the request
          success: true,
          result, // Return data to AI
        },
      })
    )
  } catch (error) {
    // Send error response
    window.dispatchEvent(
      new CustomEvent("aiii:response", {
        detail: {
          requestId,
          success: false,
          error: error.message,
        },
      })
    )
  }
})
```

### Request Event Detail

```typescript
interface AiiiRequestDetail {
  requestId: string // Unique ID for correlation
  tool: string // Tool name being called
  args: object // Parameters passed by AI
  timeout: number // Timeout in milliseconds (default: 30000)
}
```

### Response Event Detail

```typescript
interface AiiiResponseDetail {
  requestId: string // Must match request
  success: boolean // Did the action succeed?
  result?: unknown // Return value (if success)
  error?: string // Error message (if failed)
}
```

### Timeout Handling

Responses must be sent within the timeout period (default 30 seconds). If you need longer:

```javascript
window.addEventListener("aiii:request", async (event) => {
  const { requestId, tool, args } = event.detail

  if (tool === "long_running_task") {
    // For long operations, consider:
    // 1. Start the operation
    // 2. Return immediately with a status
    // 3. Let AI poll for completion

    const taskId = startLongTask(args)

    window.dispatchEvent(
      new CustomEvent("aiii:response", {
        detail: {
          requestId,
          success: true,
          result: {
            status: "started",
            taskId,
            message: "Task started. Use check_task_status to monitor progress.",
          },
        },
      })
    )
  }
})
```

## Action Hooks

Intercept and modify built-in athreei actions:

### Before Action Hook

```javascript
window.addEventListener("aiii:action:before", (event) => {
  const { action, target, args, cancel } = event.detail

  console.log(`AI is about to: ${action} on`, target)

  // Optionally cancel the action
  if (action === "click" && target.matches(".dangerous-button")) {
    cancel("This action requires manual confirmation")
    return
  }

  // Optionally modify args
  if (action === "type" && target.matches(".email-field")) {
    // Could validate or transform the input
  }
})
```

### After Action Hook

```javascript
window.addEventListener("aiii:action:after", (event) => {
  const { action, target, args, result, success } = event.detail

  console.log(`AI completed: ${action}`, { success, result })

  // Track AI interactions
  analytics.track("ai_action", { action, success })

  // Trigger side effects
  if (action === "click" && target.matches(".add-to-cart")) {
    updateCartUI()
  }
})
```

### Action Types

| Action           | Description           |
| ---------------- | --------------------- |
| `click`          | Element click         |
| `type`           | Text input            |
| `scroll`         | Page/element scroll   |
| `navigate`       | URL navigation        |
| `screenshot`     | Taking screenshot     |
| `execute_script` | Running JavaScript    |
| `wait`           | Waiting for condition |

## Permission Requests

Request specific permission scopes from the user:

```javascript
window.addEventListener("aiii:ready", () => {
  // Request permissions for your tools
  window.dispatchEvent(
    new CustomEvent("aiii:permission", {
      detail: {
        tools: ["search_products", "add_to_cart"],
        level: "allowed", // 'allowed' | 'ask'
        reason: "Enable AI-powered shopping assistance",
      },
    })
  )
})
```

Note: Permission requests show a prompt to the user. The user may deny the request.

## Best Practices

### 1. Always Handle Errors

```javascript
window.addEventListener("aiii:request", async (event) => {
  const { requestId, tool, args } = event.detail

  try {
    const result = await handleTool(tool, args)
    window.dispatchEvent(
      new CustomEvent("aiii:response", {
        detail: { requestId, success: true, result },
      })
    )
  } catch (error) {
    // Always respond, even on error
    window.dispatchEvent(
      new CustomEvent("aiii:response", {
        detail: {
          requestId,
          success: false,
          error: error.message || "Unknown error",
        },
      })
    )
  }
})
```

### 2. Provide Helpful Descriptions

```javascript
// Good: Clear, actionable description
{
  tool: 'add_to_cart',
  description: 'Add a product to the shopping cart. Returns the updated cart count.',
  parameters: {
    productId: {
      type: 'string',
      required: true,
      description: 'The product SKU or ID from the product listing'
    }
  }
}

// Bad: Vague description
{
  tool: 'do_thing',
  description: 'Does something',
  parameters: {
    id: { type: 'string' }
  }
}
```

### 3. Return Structured Data

```javascript
// Good: Structured, parseable response
window.dispatchEvent(
  new CustomEvent("aiii:response", {
    detail: {
      requestId,
      success: true,
      result: {
        cartItems: 3,
        subtotal: 99.99,
        currency: "USD",
        message: "Item added to cart",
      },
    },
  })
)

// Bad: Unstructured string
window.dispatchEvent(
  new CustomEvent("aiii:response", {
    detail: {
      requestId,
      success: true,
      result: "Added to cart, you have 3 items totaling $99.99",
    },
  })
)
```

### 4. Validate Input

```javascript
window.addEventListener("aiii:request", (event) => {
  const { requestId, tool, args } = event.detail

  if (tool === "update_quantity") {
    // Validate args
    if (!args.productId || typeof args.productId !== "string") {
      return respond(requestId, false, null, "productId is required")
    }
    if (args.quantity < 1 || args.quantity > 99) {
      return respond(
        requestId,
        false,
        null,
        "quantity must be between 1 and 99"
      )
    }
    // Proceed...
  }
})
```

### 5. Use Feature Detection

```javascript
// Check if athreei is present
function initAthreei() {
  let aiiiReady = false

  window.addEventListener("aiii:ready", () => {
    aiiiReady = true
    registerTools()
  })

  // Also check if already ready (race condition handling)
  if (window.aiiiExtensionReady) {
    aiiiReady = true
    registerTools()
  }
}

// Only load AI features if extension is present
if (document.querySelector("[data-aiii-enabled]")) {
  initAthreei()
}
```

### 6. Consider Accessibility

```javascript
// After AI actions, announce changes to screen readers
window.addEventListener("aiii:action:after", (event) => {
  const { action, success, result } = event.detail

  if (success && action === "click") {
    // Announce the result
    const announcement = document.createElement("div")
    announcement.setAttribute("role", "status")
    announcement.setAttribute("aria-live", "polite")
    announcement.textContent = result.message || "Action completed"
    document.body.appendChild(announcement)
    setTimeout(() => announcement.remove(), 3000)
  }
})
```

## Examples

### E-Commerce Integration

```javascript
// Full e-commerce integration example
window.addEventListener("aiii:ready", () => {
  // Register shopping tools
  const shoppingTools = [
    {
      tool: "search_products",
      description:
        "Search the product catalog. Returns up to 10 matching products.",
      parameters: {
        query: {
          type: "string",
          required: true,
          description: "Search keywords",
        },
        category: { type: "string", description: "Filter by category" },
        maxPrice: { type: "number", description: "Maximum price filter" },
      },
    },
    {
      tool: "get_product_details",
      description: "Get detailed information about a specific product",
      parameters: {
        productId: {
          type: "string",
          required: true,
          description: "Product SKU",
        },
      },
    },
    {
      tool: "add_to_cart",
      description: "Add a product to the shopping cart",
      parameters: {
        productId: { type: "string", required: true },
        quantity: { type: "number", default: 1, minimum: 1, maximum: 10 },
        variant: { type: "string", description: "Size/color variant ID" },
      },
    },
    {
      tool: "get_cart",
      description: "Get current cart contents and totals",
      parameters: {},
    },
    {
      tool: "apply_coupon",
      description: "Apply a coupon code to the cart",
      parameters: {
        code: { type: "string", required: true },
      },
    },
  ]

  shoppingTools.forEach((tool) => {
    window.dispatchEvent(new CustomEvent("aiii:register", { detail: tool }))
  })
})

// Handle tool requests
window.addEventListener("aiii:request", async (event) => {
  const { requestId, tool, args } = event.detail

  const handlers = {
    search_products: async ({ query, category, maxPrice }) => {
      const products = await api.searchProducts({ query, category, maxPrice })
      return {
        count: products.length,
        products: products.map((p) => ({
          id: p.sku,
          name: p.name,
          price: p.price,
          inStock: p.inventory > 0,
        })),
      }
    },

    get_product_details: async ({ productId }) => {
      const product = await api.getProduct(productId)
      if (!product) throw new Error("Product not found")
      return {
        id: product.sku,
        name: product.name,
        description: product.description,
        price: product.price,
        variants: product.variants,
        inStock: product.inventory > 0,
        rating: product.avgRating,
        reviewCount: product.reviewCount,
      }
    },

    add_to_cart: async ({ productId, quantity, variant }) => {
      const result = await api.addToCart(productId, quantity, variant)
      return {
        success: true,
        cartCount: result.totalItems,
        subtotal: result.subtotal,
        message: `Added ${quantity}x to cart`,
      }
    },

    get_cart: async () => {
      const cart = await api.getCart()
      return {
        items: cart.items.map((i) => ({
          productId: i.sku,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
        subtotal: cart.subtotal,
        tax: cart.tax,
        total: cart.total,
      }
    },

    apply_coupon: async ({ code }) => {
      try {
        const result = await api.applyCoupon(code)
        return {
          success: true,
          discount: result.discount,
          newTotal: result.total,
          message: `Coupon applied: ${result.discountPercent}% off`,
        }
      } catch (e) {
        return { success: false, message: "Invalid or expired coupon" }
      }
    },
  }

  if (handlers[tool]) {
    try {
      const result = await handlers[tool](args)
      window.dispatchEvent(
        new CustomEvent("aiii:response", {
          detail: { requestId, success: true, result },
        })
      )
    } catch (error) {
      window.dispatchEvent(
        new CustomEvent("aiii:response", {
          detail: { requestId, success: false, error: error.message },
        })
      )
    }
  }
})
```

### Form Wizard Integration

```javascript
// Multi-step form with AI assistance
window.addEventListener("aiii:ready", () => {
  window.dispatchEvent(
    new CustomEvent("aiii:register", {
      detail: {
        tool: "get_form_state",
        description: "Get current form wizard state and validation errors",
        parameters: {},
      },
    })
  )

  window.dispatchEvent(
    new CustomEvent("aiii:register", {
      detail: {
        tool: "fill_form_step",
        description: "Fill in fields for the current form step",
        parameters: {
          fields: {
            type: "object",
            required: true,
            description: "Object mapping field names to values",
          },
        },
      },
    })
  )

  window.dispatchEvent(
    new CustomEvent("aiii:register", {
      detail: {
        tool: "submit_form_step",
        description: "Validate and submit the current form step",
        parameters: {},
      },
    })
  )
})

window.addEventListener("aiii:request", (event) => {
  const { requestId, tool, args } = event.detail

  switch (tool) {
    case "get_form_state":
      const state = formWizard.getState()
      respond(requestId, true, {
        currentStep: state.step,
        totalSteps: state.total,
        fields: state.fields.map((f) => ({
          name: f.name,
          label: f.label,
          type: f.type,
          required: f.required,
          value: f.value,
          error: f.error,
        })),
        canProceed: state.isValid,
      })
      break

    case "fill_form_step":
      try {
        formWizard.fillFields(args.fields)
        respond(requestId, true, {
          filled: Object.keys(args.fields).length,
          errors: formWizard.getErrors(),
        })
      } catch (e) {
        respond(requestId, false, null, e.message)
      }
      break

    case "submit_form_step":
      const result = formWizard.submitStep()
      respond(requestId, true, {
        success: result.success,
        nextStep: result.nextStep,
        errors: result.errors,
        complete: result.complete,
      })
      break
  }
})

function respond(requestId, success, result, error) {
  window.dispatchEvent(
    new CustomEvent("aiii:response", {
      detail: { requestId, success, result, error },
    })
  )
}
```

### Dashboard/Admin Panel

```javascript
// Admin dashboard with data queries
window.addEventListener("aiii:ready", () => {
  const adminTools = [
    {
      tool: "query_analytics",
      description: "Query analytics data for a date range",
      parameters: {
        metric: {
          type: "string",
          required: true,
          enum: ["pageviews", "users", "conversions", "revenue"],
          description: "Metric to query",
        },
        startDate: { type: "string", required: true, description: "ISO date" },
        endDate: { type: "string", required: true, description: "ISO date" },
        groupBy: {
          type: "string",
          enum: ["day", "week", "month"],
          default: "day",
        },
      },
    },
    {
      tool: "export_report",
      description: "Generate and download a report",
      parameters: {
        reportType: {
          type: "string",
          required: true,
          enum: ["sales", "inventory", "customers"],
        },
        format: { type: "string", enum: ["csv", "xlsx"], default: "csv" },
      },
    },
  ]

  adminTools.forEach((t) => {
    window.dispatchEvent(new CustomEvent("aiii:register", { detail: t }))
  })
})
```

## Using the SDK vs Raw Events

The examples in this guide show the raw event-based API for advanced users who need fine-grained control. However, **we strongly recommend using the `@athreei/sdk` package** for most use cases.

### When to Use the SDK

Use the SDK if you want:
- TypeScript support and type safety
- Simplified API with less boilerplate
- Built-in error handling
- Mock mode for testing
- Better developer experience

See [SDK Documentation](../packages/sdk/README.md) for details.

### When to Use Raw Events

Use raw events if you:
- Need to minimize bundle size (SDK is ~5KB gzipped)
- Want to avoid npm dependencies
- Need custom event handling logic
- Are building a framework-specific wrapper

## Debugging

### Check if Extension is Present

```javascript
console.log("Checking for athreei...")

window.addEventListener("aiii:ready", () => {
  console.log("athreei extension is ready!")
})

// Timeout check
setTimeout(() => {
  if (!window.aiiiExtensionReady) {
    console.log("athreei extension not detected after 5s")
  }
}, 5000)
```

### Log All Events

```javascript
;[
  "aiii:ready",
  "aiii:request",
  "aiii:action:before",
  "aiii:action:after",
].forEach((event) => {
  window.addEventListener(event, (e) => {
    console.log(`[athreei] ${event}:`, e.detail)
  })
})
```

### Test Tools Manually

```javascript
// Simulate a tool request for testing
function testTool(tool, args) {
  const requestId = `test-${Date.now()}`

  window.addEventListener("aiii:response", function handler(e) {
    if (e.detail.requestId === requestId) {
      console.log("Response:", e.detail)
      window.removeEventListener("aiii:response", handler)
    }
  })

  window.dispatchEvent(
    new CustomEvent("aiii:request", {
      detail: { requestId, tool, args, timeout: 30000 },
    })
  )
}

// Usage
testTool("add_to_cart", { productId: "SKU123", quantity: 2 })
```
