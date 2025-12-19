/**
 * Type action executor
 */

import type { AiiiTypeArgs } from "@athreei/shared"

export interface TypeResult {
  typed: boolean
  selector: string
  length: number
}

/**
 * Executes a type action on the specified input element
 */
export async function executeType(args: AiiiTypeArgs): Promise<TypeResult> {
  const element = document.querySelector(args.selector)
  if (!element) {
    throw new Error(`Element not found: ${args.selector}`)
  }

  if (
    !(element instanceof HTMLInputElement) &&
    !(element instanceof HTMLTextAreaElement) &&
    !element.hasAttribute("contenteditable")
  ) {
    throw new Error(`Element is not typeable: ${args.selector}`)
  }

  // Focus the element
  ;(element as HTMLElement).focus()

  // Clear if requested
  if (args.clear) {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      element.value = ""
    } else {
      element.textContent = ""
    }
    element.dispatchEvent(new Event("input", { bubbles: true }))
  }

  // Type with optional delay
  const delay = args.delay ?? 0

  if (delay > 0) {
    // Type character by character with delay
    for (const char of args.text) {
      await typeCharacter(element, char)
      await sleep(delay)
    }
  } else {
    // Type all at once
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      element.value += args.text
    } else {
      element.textContent = (element.textContent ?? "") + args.text
    }
    element.dispatchEvent(new Event("input", { bubbles: true }))
    element.dispatchEvent(new Event("change", { bubbles: true }))
  }

  return {
    typed: true,
    selector: args.selector,
    length: args.text.length,
  }
}

/**
 * Types a single character with proper keyboard events
 */
function typeCharacter(element: Element, char: string): void {
  const eventInit: KeyboardEventInit = {
    key: char,
    code: `Key${char.toUpperCase()}`,
    charCode: char.charCodeAt(0),
    keyCode: char.charCodeAt(0),
    bubbles: true,
    cancelable: true,
  }

  element.dispatchEvent(new KeyboardEvent("keydown", eventInit))
  element.dispatchEvent(new KeyboardEvent("keypress", eventInit))

  // Update value
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    element.value += char
  } else {
    element.textContent = (element.textContent ?? "") + char
  }

  element.dispatchEvent(new Event("input", { bubbles: true }))
  element.dispatchEvent(new KeyboardEvent("keyup", eventInit))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
