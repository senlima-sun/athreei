/**
 * Tests for WebsiteBridge permission handling
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { WebsiteBridge } from "../website-bridge"
import type { AiiiPermissionEvent } from "@athreei/shared"

// Mock chrome.runtime
const mockSendMessage = vi.fn()
globalThis.chrome = {
  runtime: {
    sendMessage: mockSendMessage,
  },
} as unknown as typeof chrome

describe("WebsiteBridge Permission Handling", () => {
  let bridge: WebsiteBridge
  const testOrigin = "https://example.com"

  beforeEach(() => {
    // Clear all mocks
    vi.clearAllMocks()

    // Create and initialize bridge
    bridge = new WebsiteBridge(testOrigin)
    bridge.init()
  })

  afterEach(() => {
    // Clean up bridge
    if (bridge) {
      bridge.destroy()
    }
  })

  describe("handlePermission validation", () => {
    it("should warn and not process when scope is missing", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      const invalidEvent = new CustomEvent<AiiiPermissionEvent>(
        "aiii:permission",
        {
          detail: {} as AiiiPermissionEvent,
        }
      )

      window.dispatchEvent(invalidEvent)

      expect(consoleSpy).toHaveBeenCalledWith(
        "[athreei] Invalid permission request:",
        expect.any(Object)
      )
      expect(mockSendMessage).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it("should warn and not process when detail is null", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      const invalidEvent = new CustomEvent("aiii:permission", {
        detail: null as unknown as AiiiPermissionEvent,
      })

      window.dispatchEvent(invalidEvent)

      expect(consoleSpy).toHaveBeenCalledWith(
        "[athreei] Invalid permission request:",
        null
      )
      expect(mockSendMessage).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe("handlePermission with missing chrome.runtime", () => {
    it("should handle gracefully when chrome.runtime is not available", async () => {
      // Save original chrome
      const originalChrome = globalThis.chrome

      // Remove chrome.runtime
      globalThis.chrome = undefined as unknown as typeof chrome

      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})

      // Listen for permission response
      const responsePromise = new Promise<CustomEvent>((resolve) => {
        window.addEventListener(
          "aiii:permission-response",
          (e) => resolve(e as CustomEvent),
          { once: true }
        )
      })

      // Dispatch permission request
      const event = new CustomEvent<AiiiPermissionEvent>("aiii:permission", {
        detail: {
          scope: "read",
          reason: "Test request",
        },
      })
      window.dispatchEvent(event)

      // Wait for response
      const response = await responsePromise

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[athreei] chrome.runtime not available"
      )
      expect(response.detail.decision).toBe("deny")
      expect(response.detail.remember).toBe(false)

      // Restore chrome
      globalThis.chrome = originalChrome
      consoleErrorSpy.mockRestore()
    })
  })

  describe("dispatchPermissionResponse", () => {
    it("should dispatch permission response with correct structure", async () => {
      const responsePromise = new Promise<CustomEvent>((resolve) => {
        window.addEventListener(
          "aiii:permission-response",
          (e) => resolve(e as CustomEvent),
          { once: true }
        )
      })

      // Trigger a permission response through the bridge
      // We need to access the private method, so we'll trigger it through handlePermission
      mockSendMessage.mockResolvedValue({
        decision: "allow",
        remember: true,
      })

      const event = new CustomEvent<AiiiPermissionEvent>("aiii:permission", {
        detail: {
          scope: "read",
          reason: "Test request",
        },
      })
      window.dispatchEvent(event)

      const response = await responsePromise

      expect(response.detail).toMatchObject({
        requestId: expect.any(String),
        decision: "allow",
        remember: true,
      })
    })

    it("should include requestId in permission response", async () => {
      const responsePromise = new Promise<CustomEvent>((resolve) => {
        window.addEventListener(
          "aiii:permission-response",
          (e) => resolve(e as CustomEvent),
          { once: true }
        )
      })

      mockSendMessage.mockResolvedValue({
        decision: "allow_once",
        remember: false,
      })

      const event = new CustomEvent<AiiiPermissionEvent>("aiii:permission", {
        detail: {
          scope: "interact",
        },
      })
      window.dispatchEvent(event)

      const response = await responsePromise

      expect(response.detail.requestId).toBeDefined()
      expect(typeof response.detail.requestId).toBe("string")
      expect(response.detail.decision).toBe("allow_once")
      expect(response.detail.remember).toBe(false)
    })
  })

  describe("permission request flow through sendMessage", () => {
    it("should send correct message to background script", async () => {
      mockSendMessage.mockResolvedValue({
        decision: "allow",
        remember: true,
      })

      const event = new CustomEvent<AiiiPermissionEvent>("aiii:permission", {
        detail: {
          scope: "navigate",
          reason: "Navigate to new page",
          duration: "session",
        },
      })
      window.dispatchEvent(event)

      // Wait a bit for async handling
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "permission_request",
          requestId: expect.any(String),
          origin: testOrigin,
          scope: "navigate",
          description: "Navigate to new page",
          aiApp: undefined,
        })
      )
    })

    it("should handle all valid permission scopes", async () => {
      const scopes: AiiiPermissionEvent["scope"][] = [
        "read",
        "interact",
        "navigate",
        "screenshot",
        "execute",
        "custom",
      ]

      for (const scope of scopes) {
        mockSendMessage.mockResolvedValue({
          decision: "allow",
          remember: false,
        })

        const event = new CustomEvent<AiiiPermissionEvent>("aiii:permission", {
          detail: { scope },
        })
        window.dispatchEvent(event)

        // Wait a bit for async handling
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(mockSendMessage).toHaveBeenCalledWith(
          expect.objectContaining({
            scope,
          })
        )

        mockSendMessage.mockClear()
      }
    })

    it("should dispatch response event with allow decision", async () => {
      const responsePromise = new Promise<CustomEvent>((resolve) => {
        window.addEventListener(
          "aiii:permission-response",
          (e) => resolve(e as CustomEvent),
          { once: true }
        )
      })

      mockSendMessage.mockResolvedValue({
        decision: "allow",
        remember: true,
      })

      const event = new CustomEvent<AiiiPermissionEvent>("aiii:permission", {
        detail: {
          scope: "screenshot",
          reason: "Take screenshot for analysis",
        },
      })
      window.dispatchEvent(event)

      const response = await responsePromise

      expect(response.detail.decision).toBe("allow")
      expect(response.detail.remember).toBe(true)
    })

    it("should dispatch response event with deny decision", async () => {
      const responsePromise = new Promise<CustomEvent>((resolve) => {
        window.addEventListener(
          "aiii:permission-response",
          (e) => resolve(e as CustomEvent),
          { once: true }
        )
      })

      mockSendMessage.mockResolvedValue({
        decision: "deny",
        remember: true,
      })

      const event = new CustomEvent<AiiiPermissionEvent>("aiii:permission", {
        detail: {
          scope: "execute",
        },
      })
      window.dispatchEvent(event)

      const response = await responsePromise

      expect(response.detail.decision).toBe("deny")
      expect(response.detail.remember).toBe(true)
    })

    it("should dispatch response event with allow_once decision", async () => {
      const responsePromise = new Promise<CustomEvent>((resolve) => {
        window.addEventListener(
          "aiii:permission-response",
          (e) => resolve(e as CustomEvent),
          { once: true }
        )
      })

      mockSendMessage.mockResolvedValue({
        decision: "allow_once",
        remember: false,
      })

      const event = new CustomEvent<AiiiPermissionEvent>("aiii:permission", {
        detail: {
          scope: "read",
        },
      })
      window.dispatchEvent(event)

      const response = await responsePromise

      expect(response.detail.decision).toBe("allow_once")
      expect(response.detail.remember).toBe(false)
    })
  })

  describe("error handling when sendMessage fails", () => {
    it("should dispatch deny response when sendMessage rejects", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})

      const responsePromise = new Promise<CustomEvent>((resolve) => {
        window.addEventListener(
          "aiii:permission-response",
          (e) => resolve(e as CustomEvent),
          { once: true }
        )
      })

      mockSendMessage.mockRejectedValue(
        new Error("Background script not responding")
      )

      const event = new CustomEvent<AiiiPermissionEvent>("aiii:permission", {
        detail: {
          scope: "read",
          reason: "Test error handling",
        },
      })
      window.dispatchEvent(event)

      const response = await responsePromise

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[athreei] Permission request failed:",
        expect.any(Error)
      )
      expect(response.detail.decision).toBe("deny")
      expect(response.detail.remember).toBe(false)

      consoleErrorSpy.mockRestore()
    })

    it("should handle sendMessage timeout gracefully", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})

      const responsePromise = new Promise<CustomEvent>((resolve) => {
        window.addEventListener(
          "aiii:permission-response",
          (e) => resolve(e as CustomEvent),
          { once: true }
        )
      })

      mockSendMessage.mockRejectedValue(new Error("Timeout"))

      const event = new CustomEvent<AiiiPermissionEvent>("aiii:permission", {
        detail: {
          scope: "interact",
        },
      })
      window.dispatchEvent(event)

      const response = await responsePromise

      expect(response.detail.decision).toBe("deny")
      expect(response.detail.remember).toBe(false)

      consoleErrorSpy.mockRestore()
    })

    it("should handle network errors gracefully", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {})

      const responsePromise = new Promise<CustomEvent>((resolve) => {
        window.addEventListener(
          "aiii:permission-response",
          (e) => resolve(e as CustomEvent),
          { once: true }
        )
      })

      mockSendMessage.mockRejectedValue(new Error("Network error"))

      const event = new CustomEvent<AiiiPermissionEvent>("aiii:permission", {
        detail: {
          scope: "navigate",
          reason: "Navigate to dashboard",
        },
      })
      window.dispatchEvent(event)

      const response = await responsePromise

      expect(response.detail.decision).toBe("deny")
      expect(response.detail.remember).toBe(false)

      consoleErrorSpy.mockRestore()
    })
  })

  describe("integration tests", () => {
    it("should handle multiple permission requests sequentially", async () => {
      const responses: CustomEvent[] = []
      const listener = (e: Event) => responses.push(e as CustomEvent)

      window.addEventListener("aiii:permission-response", listener)

      // First request
      mockSendMessage.mockResolvedValueOnce({
        decision: "allow",
        remember: true,
      })
      window.dispatchEvent(
        new CustomEvent<AiiiPermissionEvent>("aiii:permission", {
          detail: { scope: "read" },
        })
      )

      await new Promise((resolve) => setTimeout(resolve, 10))

      // Second request
      mockSendMessage.mockResolvedValueOnce({
        decision: "deny",
        remember: false,
      })
      window.dispatchEvent(
        new CustomEvent<AiiiPermissionEvent>("aiii:permission", {
          detail: { scope: "execute" },
        })
      )

      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(responses).toHaveLength(2)
      expect(responses[0].detail.decision).toBe("allow")
      expect(responses[1].detail.decision).toBe("deny")

      window.removeEventListener("aiii:permission-response", listener)
    })

    it("should clean up listeners on destroy", () => {
      const event = new CustomEvent<AiiiPermissionEvent>("aiii:permission", {
        detail: { scope: "read" },
      })

      // Destroy bridge
      bridge.destroy()

      // Dispatch event - should not be handled
      window.dispatchEvent(event)

      expect(mockSendMessage).not.toHaveBeenCalled()
    })
  })
})
