/**
 * Click action executor
 */

import type { AiiiClickArgs } from "@athreei/shared"

export interface ClickResult {
  clicked: boolean
  selector: string
  tagName?: string
}

/**
 * Executes a click action on the specified element
 */
export async function executeClick(args: AiiiClickArgs): Promise<ClickResult> {
  const element = document.querySelector(args.selector)
  if (!element) {
    throw new Error(`Element not found: ${args.selector}`)
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
    ctrlKey: modifiers.includes("ctrl"),
    shiftKey: modifiers.includes("shift"),
    altKey: modifiers.includes("alt"),
    metaKey: modifiers.includes("meta"),
  }

  // Dispatch mousedown, mouseup, then click for proper event sequence
  element.dispatchEvent(new MouseEvent("mousedown", eventInit))
  element.dispatchEvent(new MouseEvent("mouseup", eventInit))
  element.dispatchEvent(new MouseEvent("click", eventInit))

  return {
    clicked: true,
    selector: args.selector,
    tagName: element.tagName.toLowerCase(),
  }
}
