/**
 * Get elements action executor
 * Returns a list of interactive elements with metadata
 */

import type { AiiiGetElementsArgs } from "@athreei/shared"
import { isVisible } from "../a11y"

export interface ElementInfo {
  selector: string
  tagName: string
  type?: string
  role?: string
  text?: string
  ariaLabel?: string
  href?: string
  id?: string
  classes?: string[]
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  visible: boolean
  disabled?: boolean
}

export interface GetElementsResult {
  elements: ElementInfo[]
  count: number
  filter?: string
}

/**
 * Executes a get elements action
 * Returns all interactive elements or filtered by type
 */
export async function executeGetElements(
  args: AiiiGetElementsArgs
): Promise<GetElementsResult> {
  const filter = args.filter?.toLowerCase()

  // Query selectors based on filter
  const selectors = getSelectorsForFilter(filter)
  const allElements = document.querySelectorAll(selectors.join(","))

  const elements: ElementInfo[] = []

  for (const element of allElements) {
    const elementInfo = extractElementInfo(element)

    // Apply filter if specified
    if (filter && !matchesFilter(elementInfo, filter)) {
      continue
    }

    elements.push(elementInfo)
  }

  return {
    elements,
    count: elements.length,
    filter,
  }
}

/**
 * Get CSS selectors based on filter
 */
function getSelectorsForFilter(filter?: string): string[] {
  if (!filter) {
    // Return all interactive elements
    return [
      "a[href]",
      "button",
      "input",
      "select",
      "textarea",
      '[role="button"]',
      '[role="link"]',
      '[role="textbox"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="combobox"]',
      '[role="listbox"]',
      '[role="menuitem"]',
      '[role="tab"]',
      '[role="switch"]',
      '[role="slider"]',
      "[onclick]",
      "[tabindex]",
    ]
  }

  // Filter-specific selectors
  switch (filter) {
    case "button":
      return [
        "button",
        'input[type="button"]',
        'input[type="submit"]',
        'input[type="reset"]',
        '[role="button"]',
      ]

    case "link":
      return ["a[href]", '[role="link"]']

    case "input":
      return ["input", "textarea", '[role="textbox"]', '[role="searchbox"]']

    case "select":
      return ["select", '[role="combobox"]', '[role="listbox"]']

    case "checkbox":
      return ['input[type="checkbox"]', '[role="checkbox"]']

    case "radio":
      return ['input[type="radio"]', '[role="radio"]']

    case "form":
      return ["form", "input", "textarea", "select", "button"]

    default:
      // Try as a tag name
      return [filter]
  }
}

/**
 * Extract element information
 */
function extractElementInfo(element: Element): ElementInfo {
  const tagName = element.tagName.toLowerCase()
  const bounds = element.getBoundingClientRect()
  const visible = isVisible(element)

  // Get implicit or explicit role
  const role = element.getAttribute("role") || getImplicitRole(element)

  // Get text content (limit to 200 chars)
  const text = element.textContent?.trim().substring(0, 200)

  // Get aria-label
  const ariaLabel = element.getAttribute("aria-label") || undefined

  // Get href for links
  const href = element.getAttribute("href") || undefined

  // Get type for inputs
  const type = element instanceof HTMLInputElement ? element.type : undefined

  // Get id
  const id = element.id || undefined

  // Get classes
  const classes =
    element.classList.length > 0 ? Array.from(element.classList) : undefined

  // Check if disabled
  let disabled: boolean | undefined = undefined
  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    disabled = element.disabled
  } else if (element.getAttribute("aria-disabled") === "true") {
    disabled = true
  }

  return {
    selector: generateSelector(element),
    tagName,
    type,
    role,
    text,
    ariaLabel,
    href,
    id,
    classes,
    bounds: {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    },
    visible,
    disabled,
  }
}

/**
 * Get implicit ARIA role for an element
 */
function getImplicitRole(element: Element): string | undefined {
  const tagName = element.tagName.toLowerCase()

  switch (tagName) {
    case "a":
      return element.hasAttribute("href") ? "link" : undefined
    case "button":
      return "button"
    case "input": {
      const type = (element as HTMLInputElement).type?.toLowerCase() || "text"
      const roleMap: Record<string, string> = {
        button: "button",
        checkbox: "checkbox",
        radio: "radio",
        range: "slider",
        search: "searchbox",
        submit: "button",
        reset: "button",
      }
      return roleMap[type] || "textbox"
    }
    case "textarea":
      return "textbox"
    case "select":
      return (element as HTMLSelectElement).multiple ? "listbox" : "combobox"
    default:
      return undefined
  }
}

/**
 * Check if element matches filter
 */
function matchesFilter(element: ElementInfo, filter: string): boolean {
  const lowerFilter = filter.toLowerCase()

  // Check tag name
  if (element.tagName === lowerFilter) {
    return true
  }

  // Check role
  if (element.role === lowerFilter) {
    return true
  }

  // Check type
  if (element.type === lowerFilter) {
    return true
  }

  // Special filter cases
  switch (lowerFilter) {
    case "button":
      return (
        element.tagName === "button" ||
        element.role === "button" ||
        element.type === "button" ||
        element.type === "submit" ||
        element.type === "reset"
      )

    case "link":
      return element.tagName === "a" || element.role === "link"

    case "input":
      return (
        element.tagName === "input" ||
        element.tagName === "textarea" ||
        element.role === "textbox" ||
        element.role === "searchbox"
      )

    case "select":
      return (
        element.tagName === "select" ||
        element.role === "combobox" ||
        element.role === "listbox"
      )

    case "form":
      return ["form", "input", "textarea", "select", "button"].includes(
        element.tagName
      )

    default:
      return false
  }
}

/**
 * Generate a unique CSS selector for an element
 */
function generateSelector(element: Element): string {
  // 1. Try ID (most specific)
  if (element.id && /^[a-zA-Z][\w-]*$/.test(element.id)) {
    // Verify uniqueness
    if (document.querySelectorAll(`#${element.id}`).length === 1) {
      return `#${element.id}`
    }
  }

  // 2. Try data attributes
  const dataTestId = element.getAttribute("data-testid")
  if (dataTestId) {
    const selector = `[data-testid="${dataTestId}"]`
    if (document.querySelectorAll(selector).length === 1) {
      return selector
    }
  }

  const dataTest = element.getAttribute("data-test")
  if (dataTest) {
    const selector = `[data-test="${dataTest}"]`
    if (document.querySelectorAll(selector).length === 1) {
      return selector
    }
  }

  // 3. Build path with tag, classes, and nth-child
  const path: string[] = []
  let current: Element | null = element

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase()

    // Add classes if available (max 2 for brevity)
    if (current.classList.length > 0) {
      const classes = Array.from(current.classList)
        .filter((cls) => /^[a-zA-Z][\w-]*$/.test(cls))
        .slice(0, 2)
      if (classes.length > 0) {
        selector += "." + classes.join(".")
      }
    }

    // Add nth-child if needed for uniqueness
    const parent = current.parentElement
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (child) => child.tagName === current!.tagName
      )
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1
        selector += `:nth-child(${index})`
      }
    }

    path.unshift(selector)
    current = current.parentElement

    // Stop if we have enough specificity (max depth 5)
    if (path.length >= 5) {
      break
    }
  }

  // Verify the selector is unique, if not add more specificity
  let fullSelector = path.join(" > ")
  if (document.querySelectorAll(fullSelector).length !== 1) {
    // Fallback to adding nth-of-type
    const parent = element.parentElement
    if (parent) {
      const siblings = Array.from(parent.children)
      const index = siblings.indexOf(element) + 1
      fullSelector += `:nth-of-type(${index})`
    }
  }

  return fullSelector
}
