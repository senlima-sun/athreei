/**
 * Event utilities for aiii:* custom events
 */

import type {
  AiiiEventType,
  AiiiReadyDetail,
  AiiiActionBeforeDetail,
  AiiiActionAfterDetail,
} from "@athreei/shared"

type AiiiEventDetailMap = {
  "aiii:ready": AiiiReadyDetail
  "aiii:action:before": AiiiActionBeforeDetail
  "aiii:action:after": AiiiActionAfterDetail
}

/**
 * Creates a custom event for aiii communication
 */
export function createAiiiEvent<T extends AiiiEventType>(
  type: T,
  detail: AiiiEventDetailMap[T],
  options?: { cancelable?: boolean }
): CustomEvent<AiiiEventDetailMap[T]> {
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
  detail: AiiiEventDetailMap[T],
  options?: { cancelable?: boolean }
): boolean {
  const event = createAiiiEvent(type, detail, options)
  return document.dispatchEvent(event)
}

/**
 * Dispatches the ready event to signal extension is active
 */
export function dispatchReady(version: string): void {
  dispatchAiiiEvent("aiii:ready", {
    version,
    tools: ["click", "type", "navigate", "scroll", "select", "screenshot"],
  })
}

/**
 * Dispatches a before event and returns whether the action should proceed
 * The detail object may be modified by event listeners
 */
export function dispatchActionBefore(detail: AiiiActionBeforeDetail): {
  allowed: boolean
  detail: AiiiActionBeforeDetail
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
export function dispatchActionAfter(detail: AiiiActionAfterDetail): void {
  dispatchAiiiEvent("aiii:action:after", detail)
}

/**
 * Generates a unique request ID
 */
export function generateRequestId(): string {
  return crypto.randomUUID()
}
