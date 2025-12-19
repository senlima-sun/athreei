/**
 * Click action executor with advanced features
 */

import type { AiiiClickArgs } from "@athreei/shared"

export interface ClickResult {
  clicked: boolean
  selector?: string
  tagName?: string
  text?: string
  coordinates?: { x: number; y: number }
}

/**
 * Executes a click action on the specified element
 * Supports clicking by: selector, text content, or coordinates
 */
export async function executeClick(args: AiiiClickArgs): Promise<ClickResult> {
  let element: Element | null = null
  let clickCoords: { x: number; y: number } | undefined

  // Find element by different methods
  if (args.x !== undefined && args.y !== undefined) {
    // Click by coordinates
    clickCoords = { x: args.x, y: args.y }
    element = document.elementFromPoint(args.x, args.y)
    if (!element) {
      throw new Error(`No element found at coordinates (${args.x}, ${args.y})`)
    }
  } else if (args.text) {
    // Click by text content
    element = findElementByText(args.text, args.selector)
    if (!element) {
      throw new Error(
        `Element not found with text: "${args.text}"${
          args.selector ? ` matching selector: ${args.selector}` : ""
        }`
      )
    }
  } else if (args.selector) {
    // Click by selector
    element = findElement(args.selector)
    if (!element) {
      throw new Error(`Element not found: ${args.selector}`)
    }
  } else {
    throw new Error(
      "Click requires either selector, text, or coordinates (x, y)"
    )
  }

  // Wait for element to be clickable
  await waitForClickable(element as HTMLElement)

  // Scroll element into view
  element.scrollIntoView({ behavior: "smooth", block: "center" })
  await sleep(100) // Brief pause after scroll

  // Get click coordinates
  if (!clickCoords) {
    const rect = element.getBoundingClientRect()
    clickCoords = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }
  }

  // Determine button code
  let button = 0
  if (args.button === "right") button = 2
  else if (args.button === "middle") button = 1

  // Check modifiers
  const modifiers = args.modifiers ?? []

  // Create and dispatch mouse events for proper click simulation
  const eventInit: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    view: window,
    button,
    buttons: 1 << button,
    clientX: clickCoords.x,
    clientY: clickCoords.y,
    ctrlKey: modifiers.includes("ctrl"),
    shiftKey: modifiers.includes("shift"),
    altKey: modifiers.includes("alt"),
    metaKey: modifiers.includes("meta"),
  }

  // Simulate trusted click events sequence
  element.dispatchEvent(new MouseEvent("mousedown", eventInit))
  element.dispatchEvent(new MouseEvent("mouseup", eventInit))

  // Support click count (double-click, triple-click)
  const clickCount = args.clickCount ?? 1
  for (let i = 0; i < clickCount; i++) {
    element.dispatchEvent(
      new MouseEvent("click", { ...eventInit, detail: i + 1 })
    )
    if (i < clickCount - 1) {
      await sleep(50) // Brief pause between clicks
    }
  }

  return {
    clicked: true,
    selector: args.selector,
    tagName: element.tagName.toLowerCase(),
    text: element.textContent?.trim().substring(0, 100),
    coordinates: clickCoords,
  }
}

/**
 * Find element in main document and iframes (same-origin only)
 */
function findElement(selector: string): Element | null {
  // Try main document first
  let element = document.querySelector(selector)
  if (element) return element

  // Try same-origin iframes
  const iframes = document.querySelectorAll("iframe")
  for (const iframe of iframes) {
    try {
      const iframeDoc = iframe.contentDocument
      if (iframeDoc) {
        element = iframeDoc.querySelector(selector)
        if (element) return element
      }
    } catch {
      // Cross-origin iframe, skip
    }
  }

  return null
}

/**
 * Find element by text content
 */
function findElementByText(
  text: string,
  selector?: string
): Element | null {
  const elements = selector
    ? Array.from(document.querySelectorAll(selector))
    : Array.from(document.querySelectorAll("*"))

  // Try exact match first
  for (const el of elements) {
    if (el.textContent?.trim() === text) {
      return el
    }
  }

  // Try case-insensitive contains
  const lowerText = text.toLowerCase()
  for (const el of elements) {
    if (el.textContent?.toLowerCase().includes(lowerText)) {
      return el
    }
  }

  return null
}

/**
 * Wait for element to be clickable (visible and not disabled)
 */
async function waitForClickable(
  element: HTMLElement,
  timeout = 5000
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    // Check visibility
    const rect = element.getBoundingClientRect()
    const isVisible =
      rect.width > 0 &&
      rect.height > 0 &&
      window.getComputedStyle(element).visibility !== "hidden" &&
      window.getComputedStyle(element).display !== "none"

    // Check if disabled
    const isDisabled =
      element instanceof HTMLButtonElement ||
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement
        ? element.disabled
        : false

    if (isVisible && !isDisabled) {
      return
    }

    await sleep(100)
  }

  throw new Error(
    `Element not clickable after ${timeout}ms: ${element.tagName}`
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
