/**
 * Tests for provider bridge
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { ProviderBridge, initBridge, getBridge } from "../provider-bridge"
import type { AiiiActionBeforeDetail, AiiiClickArgs } from "@athreei/shared"

describe("ProviderBridge", () => {
  let bridge: ProviderBridge

  beforeEach(() => {
    bridge = new ProviderBridge("1.0.0")
  })

  describe("init", () => {
    it("dispatches ready event on init", () => {
      const handler = vi.fn()
      document.addEventListener("aiii:ready", handler)

      bridge.init()

      expect(handler).toHaveBeenCalledTimes(1)
      const event = handler.mock.calls[0][0] as CustomEvent
      expect(event.detail.version).toBe("1.0.0")

      document.removeEventListener("aiii:ready", handler)
    })
  })

  describe("executeAction", () => {
    it("executes action and returns success result", async () => {
      const executor = vi.fn().mockResolvedValue({ clicked: true })

      const result = await bridge.executeAction<AiiiClickArgs>(
        "click",
        { selector: "#btn" },
        executor
      )

      expect(result.success).toBe(true)
      expect(result.result).toEqual({ clicked: true })
      expect(executor).toHaveBeenCalledWith({ selector: "#btn" })
    })

    it("dispatches before and after events", async () => {
      const beforeHandler = vi.fn()
      const afterHandler = vi.fn()
      document.addEventListener("aiii:action:before", beforeHandler)
      document.addEventListener("aiii:action:after", afterHandler)

      const executor = vi.fn().mockResolvedValue({ clicked: true })

      await bridge.executeAction<AiiiClickArgs>(
        "click",
        { selector: "#btn" },
        executor
      )

      expect(beforeHandler).toHaveBeenCalledTimes(1)
      expect(afterHandler).toHaveBeenCalledTimes(1)

      document.removeEventListener("aiii:action:before", beforeHandler)
      document.removeEventListener("aiii:action:after", afterHandler)
    })

    it("returns error when action is prevented", async () => {
      const handler = (e: Event) => e.preventDefault()
      document.addEventListener("aiii:action:before", handler)

      const executor = vi.fn().mockResolvedValue({ clicked: true })

      const result = await bridge.executeAction<AiiiClickArgs>(
        "click",
        { selector: "#btn" },
        executor
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe("Action prevented by website provider")
      expect(executor).not.toHaveBeenCalled()

      document.removeEventListener("aiii:action:before", handler)
    })

    it("uses modified args from before event", async () => {
      const handler = (e: CustomEvent<AiiiActionBeforeDetail>) => {
        e.detail.args = { selector: "#modified" }
      }
      document.addEventListener("aiii:action:before", handler as EventListener)

      const executor = vi.fn().mockResolvedValue({ clicked: true })

      await bridge.executeAction<AiiiClickArgs>(
        "click",
        { selector: "#original" },
        executor
      )

      expect(executor).toHaveBeenCalledWith({ selector: "#modified" })

      document.removeEventListener(
        "aiii:action:before",
        handler as EventListener
      )
    })

    it("returns error result when executor throws", async () => {
      const executor = vi.fn().mockRejectedValue(new Error("Element not found"))

      const result = await bridge.executeAction<AiiiClickArgs>(
        "click",
        { selector: "#missing" },
        executor
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe("Element not found")
    })

    it("includes duration in after event", async () => {
      const afterHandler = vi.fn()
      document.addEventListener("aiii:action:after", afterHandler)

      const executor = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return { clicked: true }
      })

      await bridge.executeAction<AiiiClickArgs>(
        "click",
        { selector: "#btn" },
        executor
      )

      const event = afterHandler.mock.calls[0][0] as CustomEvent
      expect(event.detail.duration).toBeGreaterThanOrEqual(10)

      document.removeEventListener("aiii:action:after", afterHandler)
    })
  })
})

describe("initBridge / getBridge", () => {
  it("initializes and returns bridge singleton", () => {
    const bridge = initBridge("1.0.0")
    expect(bridge).toBeInstanceOf(ProviderBridge)

    const retrieved = getBridge()
    expect(retrieved).toBe(bridge)
  })
})
