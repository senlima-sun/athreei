/**
 * Wait action executor
 */

import type { AiiiWaitArgs } from "@athreei/shared"

export interface WaitResult {
  success: boolean
  waited: number
  timedOut: boolean
  condition?: string
}

/**
 * Executes a wait action
 * Waits for selector state, text content, or custom condition
 */
export async function executeWait(args: AiiiWaitArgs): Promise<WaitResult> {
  const timeout = args.timeout ?? 30000
  const startTime = Date.now()

  try {
    if (args.selector) {
      // Wait for selector
      await waitForSelector(args.selector, args.state ?? "visible", timeout)
    } else if (args.text) {
      // Wait for text content
      await waitForText(args.text, timeout)
    } else if (args.condition) {
      // Wait for custom condition (JavaScript expression)
      await waitForCondition(args.condition, timeout)
    } else {
      throw new Error("Wait requires either selector, text, or condition")
    }

    return {
      success: true,
      waited: Date.now() - startTime,
      timedOut: false,
      condition: args.condition,
    }
  } catch (error) {
    const waited = Date.now() - startTime
    if (waited >= timeout) {
      return {
        success: false,
        waited,
        timedOut: true,
        condition: args.condition,
      }
    }
    throw error
  }
}

/**
 * Wait for selector to reach desired state
 */
async function waitForSelector(
  selector: string,
  state: "attached" | "detached" | "visible" | "hidden",
  timeout: number
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const element = document.querySelector(selector)

    switch (state) {
      case "attached":
        if (element) return
        break

      case "detached":
        if (!element) return
        break

      case "visible":
        if (element && isElementVisible(element as HTMLElement)) return
        break

      case "hidden":
        if (!element || !isElementVisible(element as HTMLElement)) return
        break
    }

    await sleep(100)
  }

  throw new Error(
    `Timeout waiting for selector "${selector}" to be ${state} after ${timeout}ms`
  )
}

/**
 * Wait for text content to appear
 */
async function waitForText(text: string, timeout: number): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const bodyText = document.body.textContent || ""
    if (bodyText.includes(text)) {
      return
    }

    await sleep(100)
  }

  throw new Error(
    `Timeout waiting for text "${text}" to appear after ${timeout}ms`
  )
}

/**
 * Wait for custom JavaScript condition to be true
 */
async function waitForCondition(
  condition: string,
  timeout: number
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    try {
      const result = eval(condition)
      if (result) {
        return
      }
    } catch (_error) {
      // Condition evaluation failed, continue waiting
    }

    await sleep(100)
  }

  throw new Error(
    `Timeout waiting for condition "${condition}" after ${timeout}ms`
  )
}

/**
 * Check if element is visible
 */
function isElementVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.visibility !== "hidden" &&
    style.display !== "none" &&
    style.opacity !== "0"
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
