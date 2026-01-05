/**
 * Event utilities for aiii:* custom events
 */

import type {
  AiiiEventMap,
  AiiiActionBeforeEvent,
  AiiiActionAfterEvent,
  AiiiRequestEvent,
} from "@athreei/shared"

export type {
  AiiiReadyEvent,
  AiiiResponseEvent,
  AiiiRegisterEvent,
  AiiiPermissionEvent,
} from "@athreei/shared"

type AiiiEventType = keyof AiiiEventMap

/**
 * Creates a custom event for aiii communication
 */
export function createAiiiEvent<T extends AiiiEventType>(
  type: T,
  detail: AiiiEventMap[T],
  options?: { cancelable?: boolean }
): CustomEvent<AiiiEventMap[T]> {
  return new CustomEvent(type, {
    detail,
    bubbles: true,
    cancelable: options?.cancelable ?? false,
  })
}

/**
 * Dispatches an aiii event and returns whether it was allowed (not prevented)
 */
export function dispatchAiiiEvent<T extends AiiiEventType>(
  type: T,
  detail: AiiiEventMap[T],
  options?: { cancelable?: boolean }
): boolean {
  const event = createAiiiEvent(type, detail, options)
  return document.dispatchEvent(event)
}

/**
 * Dispatches the ready event to signal extension is active
 */
export function dispatchReady(
  version: string,
  customTools: string[] = []
): void {
  const builtInCapabilities = [
    "click",
    "type",
    "navigate",
    "scroll",
    "select",
    "screenshot",
  ]
  dispatchAiiiEvent("aiii:ready", {
    version,
    capabilities: [...builtInCapabilities, ...customTools],
  })
}

/**
 * Dispatches a before event and returns whether the action should proceed
 * The detail object may be modified by event listeners
 */
export function dispatchActionBefore(detail: AiiiActionBeforeEvent): {
  allowed: boolean
  detail: AiiiActionBeforeEvent
} {
  const event = createAiiiEvent("aiii:action:before", detail, {
    cancelable: true,
  })
  const allowed = document.dispatchEvent(event)
  return { allowed, detail: event.detail }
}

/**
 * Dispatches an after event with action results
 */
export function dispatchActionAfter(detail: AiiiActionAfterEvent): void {
  dispatchAiiiEvent("aiii:action:after", detail)
}

/**
 * Dispatches a request event to website for custom tool execution
 */
export function dispatchRequest(detail: AiiiRequestEvent): void {
  dispatchAiiiEvent("aiii:request", detail)
}

/**
 * Generates a unique request ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID()
}
