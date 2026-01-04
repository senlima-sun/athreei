/**
 * Type action executor with special keys support
 */

import type { AiiiTypeArgs } from "@athreei/shared"

export interface TypeResult {
  typed: boolean
  selector: string
  length: number
  previousValue?: string
}

// Special key mappings
const SPECIAL_KEYS: Record<
  string,
  { key: string; code: string; keyCode: number }
> = {
  Enter: { key: "Enter", code: "Enter", keyCode: 13 },
  Tab: { key: "Tab", code: "Tab", keyCode: 9 },
  Escape: { key: "Escape", code: "Escape", keyCode: 27 },
  Backspace: { key: "Backspace", code: "Backspace", keyCode: 8 },
  Delete: { key: "Delete", code: "Delete", keyCode: 46 },
  ArrowUp: { key: "ArrowUp", code: "ArrowUp", keyCode: 38 },
  ArrowDown: { key: "ArrowDown", code: "ArrowDown", keyCode: 40 },
  ArrowLeft: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
  ArrowRight: { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
  Home: { key: "Home", code: "Home", keyCode: 36 },
  End: { key: "End", code: "End", keyCode: 35 },
  PageUp: { key: "PageUp", code: "PageUp", keyCode: 33 },
  PageDown: { key: "PageDown", code: "PageDown", keyCode: 34 },
}

/**
 * Executes a type action on the specified input element
 * Supports special keys: {Enter}, {Tab}, {Escape}, {ArrowUp}, etc.
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

  // Save previous value
  let previousValue: string | undefined
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    previousValue = element.value
  } else {
    previousValue = element.textContent ?? ""
  }

  // Focus the element
  ;(element as HTMLElement).focus()
  await sleep(50) // Brief pause after focus

  // Clear if requested
  if (args.clear) {
    await clearElement(element)
  }

  // Type with optional delay
  const delay = args.delay ?? 0

  // Parse text for special keys (e.g., "Hello{Enter}World")
  const tokens = parseTextWithSpecialKeys(args.text)

  for (const token of tokens) {
    if (token.type === "text") {
      if (delay > 0) {
        // Type character by character with delay
        for (const char of token.value) {
          await typeCharacter(element, char)
          await sleep(delay)
        }
      } else {
        // Type all at once
        await typeText(element, token.value)
      }
    } else if (token.type === "special") {
      await typeSpecialKey(element, token.value)
      await sleep(delay > 0 ? delay : 50)
    }
  }

  // Submit if requested
  if (args.submit) {
    await typeSpecialKey(element, "Enter")
  }

  // Trigger change event
  element.dispatchEvent(new Event("change", { bubbles: true }))

  return {
    typed: true,
    selector: args.selector,
    length: args.text.length,
    previousValue,
  }
}

/**
 * Parse text with special keys syntax: {KeyName}
 */
function parseTextWithSpecialKeys(
  text: string
): Array<{ type: "text" | "special"; value: string }> {
  const tokens: Array<{ type: "text" | "special"; value: string }> = []
  let currentText = ""
  let i = 0

  while (i < text.length) {
    if (text[i] === "{") {
      // Save any accumulated text
      if (currentText) {
        tokens.push({ type: "text", value: currentText })
        currentText = ""
      }

      // Find closing brace
      const closeIndex = text.indexOf("}", i)
      if (closeIndex !== -1) {
        const keyName = text.substring(i + 1, closeIndex)
        tokens.push({ type: "special", value: keyName })
        i = closeIndex + 1
      } else {
        // No closing brace, treat as literal
        currentText += text[i]
        i++
      }
    } else {
      currentText += text[i]
      i++
    }
  }

  // Save any remaining text
  if (currentText) {
    tokens.push({ type: "text", value: currentText })
  }

  return tokens
}

/**
 * Clear element content
 */
async function clearElement(element: Element): Promise<void> {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    // Select all and delete
    ;(element as HTMLInputElement).select()
    element.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Backspace",
        code: "Backspace",
        keyCode: 8,
        bubbles: true,
        cancelable: true,
      })
    )
    element.value = ""
  } else {
    element.textContent = ""
  }
  element.dispatchEvent(new Event("input", { bubbles: true }))
}

/**
 * Type text (multiple characters)
 */
async function typeText(element: Element, text: string): Promise<void> {
  for (const char of text) {
    await typeCharacter(element, char)
  }
}

/**
 * Types a single character with proper keyboard events
 */
async function typeCharacter(element: Element, char: string): Promise<void> {
  const code = getKeyCode(char)

  const eventInit: KeyboardEventInit = {
    key: char,
    code,
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
    const start = element.selectionStart ?? element.value.length
    const end = element.selectionEnd ?? element.value.length
    const newValue =
      element.value.substring(0, start) + char + element.value.substring(end)
    element.value = newValue
    element.setSelectionRange(start + 1, start + 1)
  } else {
    element.textContent = (element.textContent ?? "") + char
  }

  element.dispatchEvent(new Event("input", { bubbles: true }))
  element.dispatchEvent(new KeyboardEvent("keyup", eventInit))
}

/**
 * Type a special key
 */
async function typeSpecialKey(
  element: Element,
  keyName: string
): Promise<void> {
  const keyInfo = SPECIAL_KEYS[keyName]
  if (!keyInfo) {
    throw new Error(`Unknown special key: ${keyName}`)
  }

  const eventInit: KeyboardEventInit = {
    key: keyInfo.key,
    code: keyInfo.code,
    keyCode: keyInfo.keyCode,
    bubbles: true,
    cancelable: true,
  }

  element.dispatchEvent(new KeyboardEvent("keydown", eventInit))

  // Handle special key effects
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    const start = element.selectionStart ?? 0
    const end = element.selectionEnd ?? 0

    switch (keyName) {
      case "Enter":
        if (element instanceof HTMLTextAreaElement) {
          element.value =
            element.value.substring(0, start) +
            "\n" +
            element.value.substring(end)
          element.setSelectionRange(start + 1, start + 1)
        } else {
          // Submit form if in input
          const form = element.closest("form")
          if (form) {
            form.dispatchEvent(
              new Event("submit", { bubbles: true, cancelable: true })
            )
          }
        }
        break

      case "Backspace":
        if (start === end && start > 0) {
          element.value =
            element.value.substring(0, start - 1) + element.value.substring(end)
          element.setSelectionRange(start - 1, start - 1)
        } else if (start !== end) {
          element.value =
            element.value.substring(0, start) + element.value.substring(end)
          element.setSelectionRange(start, start)
        }
        break

      case "Delete":
        if (start === end && start < element.value.length) {
          element.value =
            element.value.substring(0, start) + element.value.substring(end + 1)
          element.setSelectionRange(start, start)
        } else if (start !== end) {
          element.value =
            element.value.substring(0, start) + element.value.substring(end)
          element.setSelectionRange(start, start)
        }
        break

      case "Tab":
        // Tab usually moves focus, but we'll insert tab character in textarea
        if (element instanceof HTMLTextAreaElement) {
          element.value =
            element.value.substring(0, start) +
            "\t" +
            element.value.substring(end)
          element.setSelectionRange(start + 1, start + 1)
        }
        break
    }

    element.dispatchEvent(new Event("input", { bubbles: true }))
  }

  element.dispatchEvent(new KeyboardEvent("keyup", eventInit))
}

/**
 * Get key code for character
 */
function getKeyCode(char: string): string {
  if (char >= "a" && char <= "z") {
    return `Key${char.toUpperCase()}`
  }
  if (char >= "A" && char <= "Z") {
    return `Key${char}`
  }
  if (char >= "0" && char <= "9") {
    return `Digit${char}`
  }
  return "Unidentified"
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
