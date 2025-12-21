# API Reference

Complete reference for athreei's MCP tools and `aiii:*` event system.

## Table of Contents

- [API Reference](#api-reference)
  - [Table of Contents](#table-of-contents)
  - [MCP Tools](#mcp-tools)
    - [browser_list_tabs](#browser_list_tabs)
    - [browser_get_active_tab](#browser_get_active_tab)
    - [browser_navigate](#browser_navigate)
    - [browser_get_content](#browser_get_content)
    - [browser_get_elements](#browser_get_elements)
    - [browser_click](#browser_click)
    - [browser_type](#browser_type)
    - [browser_scroll](#browser_scroll)
    - [browser_screenshot](#browser_screenshot)
    - [browser_execute_script](#browser_execute_script)
    - [browser_wait](#browser_wait)
  - [Website Events](#website-events)
    - [aiii:ready](#aiiiready)
    - [aiii:request](#aiiirequest)
    - [aiii:response](#aiiiresponse)
    - [aiii:register](#aiiiregister)
    - [aiii:permission](#aiiipermission)
    - [aiii:action:before](#aiiiactionbefore)
    - [aiii:action:after](#aiiiactionafter)
  - [TypeScript Types](#typescript-types)
    - [MCP Tool Types](#mcp-tool-types)
    - [Event Types](#event-types)
    - [Permission Types](#permission-types)
    - [Audit Log Types](#audit-log-types)
  - [Error Codes](#error-codes)

---

## MCP Tools

These tools are exposed to AI applications via the Model Context Protocol.

### browser_list_tabs

List all open browser tabs.

**Parameters:** None

**Returns:**

```typescript
{
  tabs: Array<{
    id: number // Tab ID
    url: string // Full URL
    title: string // Page title
    active: boolean // Is this the active tab?
    windowId: number // Window ID
  }>
}
```

**Example:**

```json
{
  "tabs": [
    {
      "id": 123,
      "url": "https://example.com",
      "title": "Example Domain",
      "active": true,
      "windowId": 1
    }
  ]
}
```

---

### browser_get_active_tab

Get information about the currently active tab.

**Parameters:** None

**Returns:**

```typescript
{
  id: number
  url: string
  title: string
  windowId: number
}
```

---

### browser_navigate

Navigate a tab to a URL.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `url` | string | Yes | URL to navigate to |
| `tabId` | number | No | Tab ID (defaults to active tab) |
| `waitUntil` | string | No | When to consider navigation complete |

**waitUntil options:**

- `"load"` - Wait for load event (default)
- `"domcontentloaded"` - Wait for DOMContentLoaded
- `"networkidle"` - Wait for network to be idle

**Returns:**

```typescript
{
  success: boolean
  url: string // Final URL (may differ due to redirects)
  title: string // Page title after navigation
}
```

---

### browser_get_content

Get page content in various formats.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `format` | string | No | Content format (default: "a11y") |
| `selector` | string | No | CSS selector to scope content |
| `tabId` | number | No | Tab ID |

**format options:**

- `"a11y"` - Accessibility tree (recommended for AI)
- `"html"` - Raw HTML
- `"text"` - Plain text content
- `"markdown"` - Converted to Markdown

**Returns (a11y format):**

```typescript
{
  format: "a11y"
  content: A11yNode // Root accessibility node
  url: string
  title: string
}

interface A11yNode {
  role: string // ARIA role
  name: string // Accessible name
  description?: string
  value?: string
  disabled?: boolean
  hidden?: boolean
  bounds?: {
    x: number
    y: number
    width: number
    height: number
  }
  selector?: string // CSS selector
  children?: A11yNode[]
}
```

**Returns (other formats):**

```typescript
{
  format: "html" | "text" | "markdown"
  content: string
  url: string
  title: string
}
```

---

### browser_get_elements

List interactive elements on the page.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `selector` | string | No | Filter by CSS selector |
| `roles` | string[] | No | Filter by ARIA roles |
| `visible` | boolean | No | Only visible elements (default: true) |
| `tabId` | number | No | Tab ID |

**Returns:**

```typescript
{
  elements: Array<{
    index: number // Index for targeting
    role: string // ARIA role
    name: string // Accessible name
    tag: string // HTML tag name
    selector: string // CSS selector
    bounds: {
      x: number
      y: number
      width: number
      height: number
    }
    disabled?: boolean
    checked?: boolean // For checkboxes/radios
    selected?: boolean // For options
    value?: string // For inputs
  }>
}
```

---

### browser_click

Click an element on the page.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `selector` | string | Yes* | CSS selector |
| `index` | number | Yes* | Element index from get_elements |
| `button` | string | No | Mouse button ("left", "right", "middle") |
| `clickCount` | number | No | Number of clicks (default: 1) |
| `tabId` | number | No | Tab ID |

\*One of `selector` or `index` is required.

**Returns:**

```typescript
{
  success: boolean
  clicked: {
    selector: string
    role: string
    name: string
  }
}
```

---

### browser_type

Type text into an input element.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `selector` | string | Yes* | CSS selector |
| `index` | number | Yes* | Element index from get_elements |
| `text` | string | Yes | Text to type |
| `clear` | boolean | No | Clear existing content first (default: false) |
| `delay` | number | No | Delay between keystrokes in ms |
| `tabId` | number | No | Tab ID |

\*One of `selector` or `index` is required.

**Returns:**

```typescript
{
  success: boolean
  typed: {
    selector: string
    text: string
    previousValue: string
    newValue: string
  }
}
```

---

### browser_scroll

Scroll the page or an element.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `selector` | string | No | Element to scroll (default: document) |
| `direction` | string | No | "up", "down", "left", "right" |
| `amount` | number | No | Pixels to scroll |
| `behavior` | string | No | "smooth" or "instant" |
| `tabId` | number | No | Tab ID |

**Alternative parameters:**
| Name | Type | Description |
|------|------|-------------|
| `x` | number | Horizontal scroll position |
| `y` | number | Vertical scroll position |

**Returns:**

```typescript
{
  success: boolean
  scrollPosition: {
    x: number
    y: number
  }
}
```

---

### browser_screenshot

Take a screenshot of the page.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `selector` | string | No | Element to capture (default: viewport) |
| `fullPage` | boolean | No | Capture full scrollable page |
| `format` | string | No | "png", "jpeg", "webp" (default: "png") |
| `quality` | number | No | JPEG/WebP quality (0-100) |
| `tabId` | number | No | Tab ID |

**Returns:**

```typescript
{
  success: boolean
  data: string // Base64 encoded image
  format: string
  dimensions: {
    width: number
    height: number
  }
}
```

---

### browser_execute_script

Execute JavaScript in the page context.

**⚠️ Requires explicit user permission.**

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `script` | string | Yes | JavaScript code to execute |
| `args` | any[] | No | Arguments to pass to script |
| `tabId` | number | No | Tab ID |

**Returns:**

```typescript
{
  success: boolean;
  result: unknown;       // Script return value (JSON-serializable)
  error?: string;        // Error message if failed
}
```

**Example:**

```javascript
// Script parameter
"return document.querySelectorAll('a').length"

// With args
{
  script: "return arguments[0] + arguments[1]",
  args: [1, 2]
}
// Returns: { success: true, result: 3 }
```

---

### browser_wait

Wait for a condition to be met.

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `selector` | string | Yes* | CSS selector to wait for |
| `condition` | string | Yes* | JavaScript condition |
| `state` | string | No | Element state to wait for |
| `timeout` | number | No | Max wait time in ms (default: 30000) |
| `tabId` | number | No | Tab ID |

\*One of `selector` or `condition` is required.

**state options:**

- `"attached"` - Element exists in DOM
- `"detached"` - Element removed from DOM
- `"visible"` - Element is visible
- `"hidden"` - Element is hidden

**Returns:**

```typescript
{
  success: boolean
  waited: number // Time waited in ms
  timedOut: boolean
}
```

---

## Website Events

Events for website integration with the athreei extension.

### aiii:ready

Dispatched by the extension when it's ready on the page.

**Direction:** Extension → Page

**Event detail:**

```typescript
{
  version: string;       // Extension version
  capabilities: string[]; // Available features
}
```

**Usage:**

```javascript
window.addEventListener("aiii:ready", (event) => {
  console.log("athreei version:", event.detail.version)
  // Register your tools here
})
```

---

### aiii:request

Dispatched when AI requests a custom tool.

**Direction:** Extension → Page

**Event detail:**

```typescript
{
  requestId: string // Unique ID for correlation
  tool: string // Tool name
  args: object // Tool arguments
  timeout: number // Timeout in milliseconds
}
```

**Usage:**

```javascript
window.addEventListener("aiii:request", (event) => {
  const { requestId, tool, args } = event.detail

  // Handle the request and respond
  window.dispatchEvent(
    new CustomEvent("aiii:response", {
      detail: {
        requestId,
        success: true,
        result: {
          /* your data */
        },
      },
    })
  )
})
```

---

### aiii:response

Dispatched by the page to respond to a tool request.

**Direction:** Page → Extension

**Event detail:**

```typescript
{
  requestId: string;     // Must match the request
  success: boolean;      // Did the action succeed?
  result?: unknown;      // Result data (if success)
  error?: string;        // Error message (if failed)
}
```

**Usage:**

```javascript
// Success response
window.dispatchEvent(
  new CustomEvent("aiii:response", {
    detail: {
      requestId: "abc123",
      success: true,
      result: { count: 5, items: ["a", "b", "c"] },
    },
  })
)

// Error response
window.dispatchEvent(
  new CustomEvent("aiii:response", {
    detail: {
      requestId: "abc123",
      success: false,
      error: "Item not found",
    },
  })
)
```

---

### aiii:register

Register a custom tool for AI to use.

**Direction:** Page → Extension

**Event detail:**

```typescript
{
  tool: string;          // Tool name (snake_case recommended)
  description: string;   // Description for AI
  parameters: {
    [paramName: string]: {
      type: 'string' | 'number' | 'boolean' | 'array' | 'object';
      required?: boolean;
      default?: unknown;
      description?: string;
      enum?: unknown[];
      // String constraints
      minLength?: number;
      maxLength?: number;
      pattern?: string;
      // Number constraints
      minimum?: number;
      maximum?: number;
    };
  };
}
```

**Usage:**

```javascript
window.dispatchEvent(
  new CustomEvent("aiii:register", {
    detail: {
      tool: "search_products",
      description: "Search the product catalog",
      parameters: {
        query: {
          type: "string",
          required: true,
          minLength: 1,
          description: "Search keywords",
        },
        limit: {
          type: "number",
          default: 10,
          minimum: 1,
          maximum: 100,
          description: "Maximum results to return",
        },
      },
    },
  })
)
```

---

### aiii:permission

Request permission scope from the user.

**Direction:** Page → Extension

**Event detail:**

```typescript
{
  tools: string[];       // Tool names to request permission for
  level: 'allowed' | 'ask';  // Requested permission level
  reason: string;        // Explanation shown to user
}
```

**Usage:**

```javascript
window.dispatchEvent(
  new CustomEvent("aiii:permission", {
    detail: {
      tools: ["add_to_cart", "checkout"],
      level: "allowed",
      reason: "Enable AI shopping assistance on this site",
    },
  })
)
```

---

### aiii:action:before

Dispatched before a built-in action executes.

**Direction:** Extension → Page

**Event detail:**

```typescript
{
  action: string;        // Action type
  target?: Element;      // Target element (if applicable)
  args: object;          // Action arguments
  cancel: (reason: string) => void;  // Call to cancel the action
}
```

**action types:**

- `"click"`
- `"type"`
- `"scroll"`
- `"navigate"`
- `"screenshot"`
- `"execute_script"`
- `"wait"`

**Usage:**

```javascript
window.addEventListener("aiii:action:before", (event) => {
  const { action, target, args, cancel } = event.detail

  // Optionally cancel the action
  if (action === "click" && target.matches(".no-ai-click")) {
    cancel("This button cannot be clicked by AI")
  }
})
```

---

### aiii:action:after

Dispatched after a built-in action completes.

**Direction:** Extension → Page

**Event detail:**

```typescript
{
  action: string;        // Action type
  target?: Element;      // Target element
  args: object;          // Action arguments
  success: boolean;      // Did action succeed?
  result: unknown;       // Action result
  error?: string;        // Error message (if failed)
}
```

**Usage:**

```javascript
window.addEventListener("aiii:action:after", (event) => {
  const { action, target, success, result } = event.detail

  console.log(`AI ${action} completed:`, { success, result })

  // Trigger side effects
  if (action === "click" && success) {
    trackAIInteraction(action, target)
  }
})
```

---

## TypeScript Types

Full TypeScript definitions for the API.

### MCP Tool Types

```typescript
// Tab information
interface TabInfo {
  id: number
  url: string
  title: string
  active: boolean
  windowId: number
}

// Accessibility node
interface A11yNode {
  role: string
  name: string
  description?: string
  value?: string
  disabled?: boolean
  hidden?: boolean
  bounds?: BoundingBox
  selector?: string
  children?: A11yNode[]
}

interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

// Interactive element
interface InteractiveElement {
  index: number
  role: string
  name: string
  tag: string
  selector: string
  bounds: BoundingBox
  disabled?: boolean
  checked?: boolean
  selected?: boolean
  value?: string
}
```

### Event Types

```typescript
// aiii:ready event detail
interface AiiiReadyDetail {
  version: string
  capabilities: string[]
}

// aiii:request event detail
interface AiiiRequestDetail {
  requestId: string
  tool: string
  args: Record<string, unknown>
  timeout: number
}

// aiii:response event detail
interface AiiiResponseDetail {
  requestId: string
  success: boolean
  result?: unknown
  error?: string
}

// aiii:register event detail
interface AiiiRegisterDetail {
  tool: string
  description: string
  parameters: Record<string, ParameterSchema>
}

interface ParameterSchema {
  type: "string" | "number" | "boolean" | "array" | "object"
  required?: boolean
  default?: unknown
  description?: string
  enum?: unknown[]
  minLength?: number
  maxLength?: number
  pattern?: string
  minimum?: number
  maximum?: number
}

// aiii:permission event detail
interface AiiiPermissionDetail {
  tools: string[]
  level: "allowed" | "ask"
  reason: string
}

// aiii:action:before event detail
interface AiiiActionBeforeDetail {
  action: string
  target?: Element
  args: Record<string, unknown>
  cancel: (reason: string) => void
}

// aiii:action:after event detail
interface AiiiActionAfterDetail {
  action: string
  target?: Element
  args: Record<string, unknown>
  success: boolean
  result: unknown
  error?: string
}
```

### Permission Types

```typescript
interface Permission {
  id: string
  origin: string
  tool: string
  allowed: "denied" | "allowed" | "ask"
  createdAt: number
  updatedAt: number
}
```

### Audit Log Types

```typescript
interface AuditLogEntry {
  id: string
  timestamp: number
  aiApp?: string
  tool: string
  origin?: string
  args?: Record<string, unknown>
  result?: unknown
  status: "success" | "denied" | "error"
}
```

---

## Error Codes

Standard error codes returned by MCP tools.

| Code                       | Description                               |
| -------------------------- | ----------------------------------------- |
| `PERMISSION_DENIED`        | User has denied this action               |
| `PERMISSION_REQUIRED`      | Action requires permission (prompt shown) |
| `ELEMENT_NOT_FOUND`        | CSS selector matched no elements          |
| `ELEMENT_NOT_VISIBLE`      | Element exists but is not visible         |
| `ELEMENT_NOT_INTERACTABLE` | Element cannot be interacted with         |
| `TIMEOUT`                  | Operation timed out                       |
| `NAVIGATION_FAILED`        | Failed to navigate to URL                 |
| `SCRIPT_ERROR`             | JavaScript execution error                |
| `CONNECTION_LOST`          | Lost connection to extension              |
| `TAB_NOT_FOUND`            | Specified tab ID not found                |
| `INVALID_PARAMETER`        | Invalid parameter value                   |
| `RATE_LIMITED`             | Too many requests (if configured)         |

**Error response format:**

```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```
