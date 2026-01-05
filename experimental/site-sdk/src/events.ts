/**
 * Event utilities for aiii:* custom events
 */

import type {
  AiiiReadyEvent,
  AiiiRequestEvent,
  AiiiResponseEvent,
  AiiiRegisterEvent,
  AiiiPermissionEvent,
  AiiiActionBeforeEvent,
  AiiiActionAfterEvent,
} from "./types"

/**
 * Event type names
 */
export const AIII_EVENT_NAMES = {
  READY: "aiii:ready",
  REQUEST: "aiii:request",
  RESPONSE: "aiii:response",
  REGISTER: "aiii:register",
  PERMISSION: "aiii:permission",
  ACTION_BEFORE: "aiii:action:before",
  ACTION_AFTER: "aiii:action:after",
  CANCEL: "aiii:cancel",
} as const

/**
 * Event map for type safety
 */
export interface AiiiEventMap {
  "aiii:ready": AiiiReadyEvent
  "aiii:request": AiiiRequestEvent
  "aiii:response": AiiiResponseEvent
  "aiii:register": AiiiRegisterEvent
  "aiii:permission": AiiiPermissionEvent
  "aiii:action:before": AiiiActionBeforeEvent
  "aiii:action:after": AiiiActionAfterEvent
}

export type AiiiEventType = keyof AiiiEventMap

/**
 * Dispatch an aiii custom event
 */
export function dispatchAiiiEvent<T extends AiiiEventType>(
  type: T,
  detail: AiiiEventMap[T],
  options?: { cancelable?: boolean }
): boolean {
  const event = new CustomEvent(type, {
    detail,
    bubbles: true,
    cancelable: options?.cancelable ?? false,
  })
  return document.dispatchEvent(event)
}

/**
 * Listen for an aiii custom event
 */
export function listenForAiiiEvent<T extends AiiiEventType>(
  type: T,
  callback: (
    detail: AiiiEventMap[T],
    event: CustomEvent<AiiiEventMap[T]>
  ) => void
): () => void {
  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<AiiiEventMap[T]>
    callback(customEvent.detail, customEvent)
  }

  document.addEventListener(type, listener)

  // Return unsubscribe function
  return () => {
    document.removeEventListener(type, listener)
  }
}

/**
 * Wait for a specific event with timeout
 */
export function waitForEvent<T extends AiiiEventType>(
  type: T,
  timeout = 5000
): Promise<AiiiEventMap[T]> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      unsubscribe()
      reject(new Error(`Timeout waiting for ${type} event`))
    }, timeout)

    const unsubscribe = listenForAiiiEvent(type, (detail) => {
      clearTimeout(timeoutId)
      unsubscribe()
      resolve(detail)
    })
  })
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  // Use crypto.randomUUID if available, fallback to timestamp + random
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  // Fallback for older browsers
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Check if we're in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined"
}
