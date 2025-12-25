/**
 * Mock mode for testing athreei integration without the extension
 */

import { dispatchAiiiEvent, generateRequestId, AIII_EVENT_NAMES } from "./events"
import type { AiiiReadyEvent, AiiiRequestEvent } from "./types"

/**
 * Mock mode options
 */
export interface MockModeOptions {
  /**
   * Simulated delay before firing events (ms)
   */
  simulateDelay?: number

  /**
   * Mock responses for specific tools
   * Tool name -> mock result
   */
  mockResponses?: Record<string, unknown>

  /**
   * Extension version to simulate
   */
  version?: string

  /**
   * Capabilities to simulate
   */
  capabilities?: string[]

  /**
   * Auto-trigger tools for testing
   */
  autoTriggerTools?: Array<{
    tool: string
    args: Record<string, unknown>
    delay?: number
  }>
}

let mockModeEnabled = false
let mockOptions: Required<MockModeOptions> = {
  simulateDelay: 100,
  mockResponses: {},
  version: "0.1.0-mock",
  capabilities: ["click", "type", "navigate", "scroll", "screenshot"],
  autoTriggerTools: [],
}

/**
 * Enable mock mode for testing
 */
export function enableMockMode(options: MockModeOptions = {}): void {
  if (mockModeEnabled) {
    console.warn("[athreei mock] Mock mode already enabled")
    return
  }

  mockModeEnabled = true
  mockOptions = {
    simulateDelay: options.simulateDelay ?? 100,
    mockResponses: options.mockResponses ?? {},
    version: options.version ?? "0.1.0-mock",
    capabilities: options.capabilities ?? ["click", "type", "navigate", "scroll", "screenshot"],
    autoTriggerTools: options.autoTriggerTools ?? [],
  }

  console.log("[athreei mock] Mock mode enabled", mockOptions)

  // Fire ready event after delay
  setTimeout(() => {
    const readyEvent: AiiiReadyEvent = {
      version: mockOptions.version,
      capabilities: mockOptions.capabilities,
      extensionId: "mock-extension-id",
    }

    console.log("[athreei mock] Dispatching ready event", readyEvent)
    dispatchAiiiEvent(AIII_EVENT_NAMES.READY, readyEvent)

    // Auto-trigger tools if configured
    if (mockOptions.autoTriggerTools.length > 0) {
      mockOptions.autoTriggerTools.forEach((trigger) => {
        const delay = trigger.delay ?? mockOptions.simulateDelay
        setTimeout(() => {
          triggerMockRequest(trigger.tool, trigger.args)
        }, delay)
      })
    }
  }, mockOptions.simulateDelay)

  // Listen for tool registrations to add them to capabilities
  document.addEventListener(AIII_EVENT_NAMES.REGISTER, (event) => {
    const customEvent = event as CustomEvent
    const toolName = customEvent.detail.tool
    if (!mockOptions.capabilities.includes(toolName)) {
      mockOptions.capabilities.push(toolName)
      console.log("[athreei mock] Tool registered:", toolName)
    }
  })

  // Listen for responses to log them
  document.addEventListener(AIII_EVENT_NAMES.RESPONSE, (event) => {
    const customEvent = event as CustomEvent
    console.log("[athreei mock] Response received:", customEvent.detail)
  })
}

/**
 * Disable mock mode
 */
export function disableMockMode(): void {
  mockModeEnabled = false
  console.log("[athreei mock] Mock mode disabled")
}

/**
 * Check if mock mode is enabled
 */
export function isMockModeEnabled(): boolean {
  return mockModeEnabled
}

/**
 * Manually trigger a mock request
 */
export function triggerMockRequest(tool: string, args: Record<string, unknown> = {}): void {
  if (!mockModeEnabled) {
    console.warn("[athreei mock] Mock mode is not enabled")
    return
  }

  const requestId = generateRequestId()
  const requestEvent: AiiiRequestEvent = {
    requestId,
    tool,
    args,
    origin: window.location.origin,
    aiApp: "Mock AI App",
    timestamp: Date.now(),
  }

  console.log("[athreei mock] Triggering request:", requestEvent)

  setTimeout(() => {
    dispatchAiiiEvent(AIII_EVENT_NAMES.REQUEST, requestEvent)
  }, mockOptions.simulateDelay)
}

/**
 * Set mock response for a specific tool
 */
export function setMockResponse(tool: string, response: unknown): void {
  mockOptions.mockResponses[tool] = response
  console.log(`[athreei mock] Mock response set for ${tool}:`, response)
}

/**
 * Get mock response for a tool
 */
export function getMockResponse(tool: string): unknown | undefined {
  return mockOptions.mockResponses[tool]
}

/**
 * Clear all mock responses
 */
export function clearMockResponses(): void {
  mockOptions.mockResponses = {}
  console.log("[athreei mock] All mock responses cleared")
}

/**
 * Simulate permission grant/deny
 */
export function simulatePermission(granted: boolean): void {
  console.log(`[athreei mock] Permission ${granted ? "granted" : "denied"}`)
  // This is a placeholder - actual implementation would dispatch events
  // The permission system doesn't have a response mechanism yet
}
