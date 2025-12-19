import { describe, it, expect } from "vitest"
import type { Permission, AuditLogEntry, Session, TabInfo } from "./index.js"

describe("shared types", () => {
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

  it("should allow creating a valid TabInfo", () => {
    const tab: TabInfo = {
      id: 1,
      url: "https://example.com",
      title: "Example",
      active: true,
      windowId: 1,
    }

    expect(tab.active).toBe(true)
  })
})
