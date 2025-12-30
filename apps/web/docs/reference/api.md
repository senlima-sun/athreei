# API Reference

This document covers all APIs available in athreei: MCP tools exposed to AI apps, and the Platform REST API.

## MCP Browser Tools

These tools are exposed by the athreei gateway for AI applications to interact with the browser.

### browser_list_tabs

List all open browser tabs with their IDs, URLs, and titles.

**Input Schema:**

```json
{}
```

No parameters required.

**Output Schema:**

```json
{
  "tabs": [
    {
      "id": 123,
      "url": "https://example.com",
      "title": "Example Page",
      "active": true,
      "windowId": 1
    }
  ]
}
```

**Example Usage:**

```
User: What tabs do I have open?
AI: [calls browser_list_tabs]
```

---

### browser_get_active_tab

Get information about the currently active browser tab.

**Input Schema:**

```json
{}
```

**Output Schema:**

```json
{
  "id": 123,
  "url": "https://example.com",
  "title": "Example Page",
  "windowId": 1
}
```

---

### browser_navigate

Navigate to a URL in the browser.

**Input Schema:**

```json
{
  "url": "https://example.com",
  "tabId": 123,
  "waitUntil": "load"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | The URL to navigate to |
| `tabId` | number | No | Tab ID (defaults to active tab) |
| `waitUntil` | enum | No | When navigation is complete: `"load"`, `"domcontentloaded"`, `"networkidle"` |

**Output Schema:**

```json
{
  "success": true,
  "url": "https://example.com",
  "title": "Example Page"
}
```

---

### browser_get_content

Get the content of a web page in various formats.

**Input Schema:**

```json
{
  "tabId": 123,
  "format": "a11y",
  "selector": "#main-content"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tabId` | number | No | Tab ID (defaults to active tab) |
| `format` | enum | No | Content format: `"a11y"` (recommended), `"html"`, `"text"`, `"markdown"` |
| `selector` | string | No | CSS selector to scope content |

**Output Schema:**

```json
{
  "content": "...",
  "format": "a11y",
  "url": "https://example.com",
  "title": "Example Page"
}
```

**Format Details:**

- `a11y`: Accessibility tree representation (best for AI understanding)
- `html`: Raw HTML content
- `text`: Plain text with whitespace preserved
- `markdown`: Converted to Markdown format

---

### browser_get_elements

Get a list of interactive elements on the page.

**Input Schema:**

```json
{
  "tabId": 123,
  "selector": ".btn",
  "roles": ["button", "link"],
  "interactiveOnly": true
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tabId` | number | No | Tab ID (defaults to active tab) |
| `selector` | string | No | CSS selector to filter elements |
| `roles` | string[] | No | ARIA roles to filter (e.g., `button`, `link`, `textbox`) |
| `interactiveOnly` | boolean | No | Only return interactive elements (default: true) |

**Output Schema:**

```json
{
  "elements": [
    {
      "index": 0,
      "selector": "#submit-btn",
      "role": "button",
      "name": "Submit",
      "text": "Submit Form",
      "enabled": true,
      "visible": true,
      "boundingBox": { "x": 100, "y": 200, "width": 80, "height": 30 }
    }
  ],
  "count": 1
}
```

---

### browser_click

Click on an element identified by CSS selector or element index.

**Input Schema:**

```json
{
  "tabId": 123,
  "selector": "#submit-btn",
  "index": 0,
  "button": "left",
  "clickCount": 1,
  "modifiers": ["ctrl"]
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tabId` | number | No | Tab ID (defaults to active tab) |
| `selector` | string | No* | CSS selector of element to click |
| `index` | number | No* | Element index from `browser_get_elements` |
| `button` | enum | No | Mouse button: `"left"`, `"right"`, `"middle"` |
| `clickCount` | number | No | Number of clicks (2 for double-click) |
| `modifiers` | string[] | No | Modifier keys: `"ctrl"`, `"shift"`, `"alt"`, `"meta"` |

*Either `selector` or `index` must be provided.

**Output Schema:**

```json
{
  "success": true,
  "clicked": {
    "selector": "#submit-btn",
    "text": "Submit"
  }
}
```

---

### browser_type

Type text into an input element.

**Input Schema:**

```json
{
  "tabId": 123,
  "selector": "#email-input",
  "index": 0,
  "text": "user@example.com",
  "clear": true,
  "delay": 50,
  "submit": false
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tabId` | number | No | Tab ID (defaults to active tab) |
| `selector` | string | No* | CSS selector of input element |
| `index` | number | No* | Element index from `browser_get_elements` |
| `text` | string | Yes | Text to type |
| `clear` | boolean | No | Clear existing content first |
| `delay` | number | No | Delay between keystrokes in ms |
| `submit` | boolean | No | Press Enter after typing |

**Output Schema:**

```json
{
  "success": true,
  "typed": {
    "selector": "#email-input",
    "text": "user@example.com",
    "previousValue": ""
  }
}
```

---

### browser_scroll

Scroll the page or a specific element.

**Input Schema:**

```json
{
  "tabId": 123,
  "selector": ".scroll-container",
  "direction": "down",
  "amount": 500,
  "behavior": "smooth"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tabId` | number | No | Tab ID (defaults to active tab) |
| `selector` | string | No | CSS selector of scrollable element |
| `direction` | enum | No | Scroll direction: `"up"`, `"down"`, `"left"`, `"right"` |
| `amount` | number | No | Scroll amount in pixels |
| `x` | number | No | Absolute scroll X position |
| `y` | number | No | Absolute scroll Y position |
| `behavior` | enum | No | Scroll behavior: `"auto"`, `"smooth"` |

**Output Schema:**

```json
{
  "success": true,
  "scrollPosition": {
    "x": 0,
    "y": 500
  }
}
```

---

### browser_screenshot

Take a screenshot of the page or a specific element.

**Input Schema:**

```json
{
  "tabId": 123,
  "selector": "#chart",
  "fullPage": false,
  "format": "png",
  "quality": 90
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tabId` | number | No | Tab ID (defaults to active tab) |
| `selector` | string | No | CSS selector of element to screenshot |
| `fullPage` | boolean | No | Capture full scrollable page |
| `format` | enum | No | Image format: `"png"`, `"jpeg"`, `"webp"` |
| `quality` | number | No | Image quality 0-100 (for jpeg/webp) |

**Output Schema:**

```json
{
  "success": true,
  "image": "base64-encoded-data...",
  "format": "png",
  "dimensions": {
    "width": 1920,
    "height": 1080
  }
}
```

---

### browser_execute_script

Execute JavaScript code in the page context.

**Note:** This tool requires explicit user permission for each execution.

**Input Schema:**

```json
{
  "tabId": 123,
  "script": "return document.title",
  "args": []
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tabId` | number | No | Tab ID (defaults to active tab) |
| `script` | string | Yes | JavaScript code to execute |
| `args` | any[] | No | Arguments to pass to the script |

**Output Schema:**

```json
{
  "success": true,
  "result": "Example Page"
}
```

---

### browser_wait

Wait for an element to reach a specific state or for a custom condition.

**Input Schema:**

```json
{
  "tabId": 123,
  "selector": ".loading-spinner",
  "state": "hidden",
  "timeout": 30000,
  "condition": "document.readyState === 'complete'"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tabId` | number | No | Tab ID (defaults to active tab) |
| `selector` | string | No | CSS selector to wait for |
| `state` | enum | No | Element state: `"attached"`, `"detached"`, `"visible"`, `"hidden"` |
| `timeout` | number | No | Maximum wait time in ms (default: 30000) |
| `condition` | string | No | Custom JS condition that returns true when ready |

**Output Schema:**

```json
{
  "success": true,
  "waited": 1500,
  "timedOut": false
}
```

---

## Platform REST API

### Authentication

All Platform API requests require authentication via Bearer token:

```bash
curl -H "Authorization: Bearer atr_your_api_key" \
  https://athreei.com/api/...
```

### Base URL

```
https://athreei.com/api
```

### Endpoints

#### GET /gateway/config

Fetch namespace configuration for a gateway.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `endpoint` | string | Yes | Endpoint name |

**Response:**

```json
{
  "namespaceId": "ns_abc123",
  "namespaceName": "development",
  "namespaceSlug": "development",
  "endpointId": "ep_xyz789",
  "endpointName": "my-laptop",
  "organizationId": "org_def456",
  "servers": [
    {
      "name": "browser",
      "type": "builtin"
    }
  ],
  "configVersion": "ns_abc123_v15"
}
```

#### POST /gateway/traces

Submit trace data from the gateway.

**Request Body:**

```json
{
  "traces": [
    {
      "traceId": "tr_123",
      "requestId": "req_456",
      "aggregatedToolName": "browser.browser_navigate",
      "serverName": "browser",
      "toolName": "browser_navigate",
      "startedAt": "2024-01-15T10:30:00Z",
      "endedAt": "2024-01-15T10:30:01Z",
      "durationMs": 1000,
      "status": "success",
      "encryptedPayload": {
        "nonce": "base64...",
        "ciphertext": "base64...",
        "keyVersion": 1,
        "algorithm": "xchacha20poly1305"
      }
    }
  ]
}
```

**Response:**

```json
{
  "received": 1,
  "stored": 1
}
```

#### GET /namespaces

List namespaces in the organization.

**Response:**

```json
{
  "namespaces": [
    {
      "id": "ns_abc123",
      "name": "development",
      "slug": "development",
      "serverCount": 3,
      "endpointCount": 2
    }
  ]
}
```

#### POST /namespaces

Create a new namespace.

**Request Body:**

```json
{
  "name": "production",
  "servers": [
    {
      "name": "browser",
      "type": "builtin"
    }
  ]
}
```

#### GET /namespaces/:id/endpoints

List endpoints in a namespace.

#### POST /namespaces/:id/endpoints

Create a new endpoint.

#### GET /keys

List API keys.

#### POST /keys

Create a new API key.

#### DELETE /keys/:id

Revoke an API key.

### Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "The provided API key is invalid or has been revoked",
    "details": {}
  }
}
```

Common error codes:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_API_KEY` | 401 | API key is invalid or revoked |
| `FORBIDDEN` | 403 | Key doesn't have required permissions |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Rate Limits

| Endpoint | Limit |
|----------|-------|
| `/gateway/config` | 60/minute |
| `/gateway/traces` | 100/minute |
| Other endpoints | 120/minute |

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1705320600
```

## SDK Libraries

### JavaScript/TypeScript

```typescript
import { AthreeiClient } from '@athreei/sdk';

const client = new AthreeiClient({
  apiKey: 'atr_...',
  endpoint: 'my-laptop'
});

// Get namespace config
const config = await client.getConfig();

// Submit traces
await client.submitTraces(traces);
```

### Python

```python
from athreei import Client

client = Client(
    api_key="atr_...",
    endpoint="my-laptop"
)

config = client.get_config()
client.submit_traces(traces)
```

## Next Steps

- [MCP Server Configuration](./mcp-config.md)
- [Troubleshooting](./troubleshooting.md)
- [Security Best Practices](./security.md)
