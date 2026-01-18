import { describe, it, expect } from "vitest"
import type { Permission, AuditLogEntry, Session } from "./index"
import type { BrowserListTabsOutput, ElementInfo } from "./mcp-tools"
import type { AiiiRegisterEvent, AiiiRequestEvent } from "./aiii-events"
import {
  BrowserClickInputSchema,
  BrowserNavigateInputSchema,
  MCP_TOOL_NAMES,
} from "./mcp-tools"
import {
  AiiiRegisterEventSchema,
  AiiiRequestEventSchema,
  AIII_EVENT_NAMES,
} from "./aiii-events"

describe("core types", () => {
  it("should allow creating a valid Permission object", () => {
    const permission: Permission = {
      id: "test-id",
      origin: "https://example.com",
      tool: "browser_click",
      allowed: "allowed",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    expect(permission.id).toBe("test-id")
    expect(permission.allowed).toBe("allowed")
  })

  it("should allow creating a valid AuditLogEntry", () => {
    const entry: AuditLogEntry = {
      id: "log-id",
      timestamp: Date.now(),
      aiApp: "Claude Desktop",
      tool: "browser_navigate",
      origin: "https://example.com",
      args: { url: "https://example.com" },
      status: "success",
    }

    expect(entry.status).toBe("success")
    expect(entry.aiApp).toBe("Claude Desktop")
  })

  it("should allow creating a valid Session", () => {
    const session: Session = {
      id: "session-id",
      tabId: 123,
      origin: "https://example.com",
      startedAt: Date.now(),
    }

    expect(session.tabId).toBe(123)
    expect(session.endedAt).toBeUndefined()
  })
})

describe("MCP tool schemas", () => {
  it("should define all browser tools", () => {
    expect(MCP_TOOL_NAMES).toContain("browser_list_tabs")
    expect(MCP_TOOL_NAMES).toContain("browser_click")
    expect(MCP_TOOL_NAMES).toContain("browser_type")
    expect(MCP_TOOL_NAMES).toContain("browser_navigate")
    expect(MCP_TOOL_NAMES).toContain("browser_screenshot")
    expect(MCP_TOOL_NAMES).toHaveLength(11)
  })

  it("should validate browser_navigate input", () => {
    const validInput = { url: "https://example.com" }
    const result = BrowserNavigateInputSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it("should reject invalid browser_navigate input", () => {
    const invalidInput = { url: "not-a-url" }
    const result = BrowserNavigateInputSchema.safeParse(invalidInput)
    expect(result.success).toBe(false)
  })

  it("should validate browser_click input with selector", () => {
    const validInput = { selector: "#submit-button" }
    const result = BrowserClickInputSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it("should validate browser_click input with index", () => {
    const validInput = { index: 5, button: "left" }
    const result = BrowserClickInputSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it("should allow creating a valid TabInfo from output schema", () => {
    const output: BrowserListTabsOutput = {
      tabs: [
        {
          id: 1,
          url: "https://example.com",
          title: "Example",
          active: true,
          windowId: 1,
        },
      ],
    }

    expect(output.tabs[0].active).toBe(true)
  })

  it("should allow creating a valid ElementInfo", () => {
    const element: ElementInfo = {
      index: 0,
      selector: "#button",
      role: "button",
      name: "Submit",
      enabled: true,
      visible: true,
    }

    expect(element.role).toBe("button")
  })
})

describe("aiii:* event schemas", () => {
  it("should define all event types", () => {
    expect(AIII_EVENT_NAMES).toContain("aiii:ready")
    expect(AIII_EVENT_NAMES).toContain("aiii:request")
    expect(AIII_EVENT_NAMES).toContain("aiii:response")
    expect(AIII_EVENT_NAMES).toContain("aiii:register")
    expect(AIII_EVENT_NAMES).toContain("aiii:permission")
  })

  it("should validate aiii:register event", () => {
    const validEvent: AiiiRegisterEvent = {
      tool: "add_to_cart",
      description: "Add product to shopping cart",
      parameters: {
        productId: {
          type: "string",
          required: true,
          description: "Product ID to add",
        },
        quantity: {
          type: "number",
          default: 1,
        },
      },
    }

    const result = AiiiRegisterEventSchema.safeParse(validEvent)
    expect(result.success).toBe(true)
  })

  it("should validate aiii:request event", () => {
    const validEvent: AiiiRequestEvent = {
      requestId: "req-123",
      tool: "add_to_cart",
      args: { productId: "SKU-001", quantity: 2 },
      origin: "https://shop.example.com",
      timestamp: Date.now(),
    }

    const result = AiiiRequestEventSchema.safeParse(validEvent)
    expect(result.success).toBe(true)
  })
})
