/**
 * Tests for event utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  createAiiiEvent,
  dispatchAiiiEvent,
  dispatchReady,
  dispatchActionBefore,
  dispatchActionAfter,
  generateRequestId,
} from "../events"
import type {
  AiiiReadyDetail,
  AiiiActionBeforeDetail,
  AiiiActionAfterDetail,
} from "@athreei/shared"

describe("events", () => {
  describe("createAiiiEvent", () => {
    it("creates a custom event with correct type and detail", () => {
      const detail: AiiiReadyDetail = {
        version: "1.0.0",
        tools: ["click", "type"],
      }
      const event = createAiiiEvent("aiii:ready", detail)

      expect(event.type).toBe("aiii:ready")
      expect(event.detail).toEqual(detail)
      expect(event.bubbles).toBe(true)
      expect(event.cancelable).toBe(false)
    })

    it("creates cancelable event when specified", () => {
      const detail: AiiiActionBeforeDetail = {
        requestId: "test-123",
        tool: "click",
        args: { selector: "#btn" },
        timestamp: Date.now(),
        origin: "https://example.com",
      }
      const event = createAiiiEvent("aiii:action:before", detail, {
        cancelable: true,
      })

      expect(event.cancelable).toBe(true)
    })
  })

  describe("dispatchAiiiEvent", () => {
    it("returns true when event is not prevented", () => {
      const detail: AiiiReadyDetail = {
        version: "1.0.0",
        tools: ["click"],
      }
      const result = dispatchAiiiEvent("aiii:ready", detail)
      expect(result).toBe(true)
    })

    it("returns false when cancelable event is prevented", () => {
      const handler = (e: Event) => e.preventDefault()
      document.addEventListener("aiii:action:before", handler)

      const detail: AiiiActionBeforeDetail = {
        requestId: "test-123",
        tool: "click",
        args: { selector: "#btn" },
        timestamp: Date.now(),
        origin: "https://example.com",
      }
      const result = dispatchAiiiEvent("aiii:action:before", detail, {
        cancelable: true,
      })

      expect(result).toBe(false)
      document.removeEventListener("aiii:action:before", handler)
    })
  })

  describe("dispatchReady", () => {
    it("dispatches ready event with version and tools", () => {
      const handler = vi.fn()
      document.addEventListener("aiii:ready", handler)

      dispatchReady("1.0.0")

      expect(handler).toHaveBeenCalledTimes(1)
      const event = handler.mock.calls[0][0] as CustomEvent<AiiiReadyDetail>
      expect(event.detail.version).toBe("1.0.0")
      expect(event.detail.tools).toContain("click")
      expect(event.detail.tools).toContain("type")

      document.removeEventListener("aiii:ready", handler)
    })
  })

  describe("dispatchActionBefore", () => {
    it("returns allowed true when not prevented", () => {
      const detail: AiiiActionBeforeDetail = {
        requestId: "test-123",
        tool: "click",
        args: { selector: "#btn" },
        timestamp: Date.now(),
        origin: "https://example.com",
      }

      const result = dispatchActionBefore(detail)
      expect(result.allowed).toBe(true)
      expect(result.detail).toEqual(detail)
    })

    it("returns allowed false when prevented", () => {
      const handler = (e: Event) => e.preventDefault()
      document.addEventListener("aiii:action:before", handler)

      const detail: AiiiActionBeforeDetail = {
        requestId: "test-123",
        tool: "click",
        args: { selector: "#btn" },
        timestamp: Date.now(),
        origin: "https://example.com",
      }

      const result = dispatchActionBefore(detail)
      expect(result.allowed).toBe(false)

      document.removeEventListener("aiii:action:before", handler)
    })

    it("allows detail modification by listeners", () => {
      const handler = (e: CustomEvent<AiiiActionBeforeDetail>) => {
        e.detail.args = { selector: "#modified" }
      }
      document.addEventListener("aiii:action:before", handler as EventListener)

      const detail: AiiiActionBeforeDetail = {
        requestId: "test-123",
        tool: "click",
        args: { selector: "#btn" },
        timestamp: Date.now(),
        origin: "https://example.com",
      }

      const result = dispatchActionBefore(detail)
      expect((result.detail.args as { selector: string }).selector).toBe(
        "#modified"
      )

      document.removeEventListener(
        "aiii:action:before",
        handler as EventListener
      )
    })
  })

  describe("dispatchActionAfter", () => {
    it("dispatches after event with results", () => {
      const handler = vi.fn()
      document.addEventListener("aiii:action:after", handler)

      const detail: AiiiActionAfterDetail = {
        requestId: "test-123",
        tool: "click",
        success: true,
        result: { clicked: true },
        timestamp: Date.now(),
        duration: 50,
      }

      dispatchActionAfter(detail)

      expect(handler).toHaveBeenCalledTimes(1)
      const event = handler.mock
        .calls[0][0] as CustomEvent<AiiiActionAfterDetail>
      expect(event.detail.success).toBe(true)
      expect(event.detail.result).toEqual({ clicked: true })

      document.removeEventListener("aiii:action:after", handler)
    })
  })

  describe("generateRequestId", () => {
    it("generates unique IDs", () => {
      const id1 = generateRequestId()
      const id2 = generateRequestId()

      expect(id1).toBeTruthy()
      expect(id2).toBeTruthy()
      expect(id1).not.toBe(id2)
    })

    it("generates valid UUID format", () => {
      const id = generateRequestId()
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      expect(id).toMatch(uuidRegex)
    })
  })
})
