/**
 * Accessibility Tree Reader
 *
 * Extracts the accessibility tree from the DOM for AI consumption.
 * Provides a semantic representation of the page structure focused on
 * interactive elements and accessible names.
 */

export interface A11yNode {
  role: string // button, link, input, heading, etc.
  name: string // accessible name (text content, aria-label, etc.)
  description?: string // aria-description
  value?: string // current value for inputs
  checked?: boolean // for checkboxes/radios
  selected?: boolean // for options
  disabled?: boolean
  expanded?: boolean // for expandable elements
  level?: number // heading level
  bounds?: {
    // bounding box
    x: number
    y: number
    width: number
    height: number
  }
  children?: A11yNode[]
  selector?: string // CSS selector to target this element
}

export interface A11yTree {
  url: string
  title: string
  tree: A11yNode
}

export interface InteractiveElement {
  index: number // unique index for AI to reference
  role: string
  name: string
  selector: string // CSS selector
  bounds: { x: number; y: number; width: number; height: number }
  actionable: boolean // is it visible and enabled?
}

/**
 * Map HTML elements to their implicit ARIA roles
 */
function getImplicitRole(element: Element): string | null {
  const tagName = element.tagName.toLowerCase()

  const explicitRole = element.getAttribute("role")
  if (explicitRole) {
    return explicitRole
  }

  switch (tagName) {
    case "a":
      return element.hasAttribute("href") ? "link" : null
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
        email: "textbox",
        tel: "textbox",
        url: "textbox",
        text: "textbox",
        number: "spinbutton",
        submit: "button",
        reset: "button",
        image: "button",
      }
      return roleMap[type] || "textbox"
    }
    case "textarea":
      return "textbox"
    case "select":
      return (element as HTMLSelectElement).multiple ? "listbox" : "combobox"
    case "option":
      return "option"
    case "img":
      return element.hasAttribute("alt") ? "image" : "presentation"
    case "h1":
      return "heading"
    case "h2":
      return "heading"
    case "h3":
      return "heading"
    case "h4":
      return "heading"
    case "h5":
      return "heading"
    case "h6":
      return "heading"
    case "nav":
      return "navigation"
    case "main":
      return "main"
    case "article":
      return "article"
    case "section":
      return "region"
    case "aside":
      return "complementary"
    case "header":
      return "banner"
    case "footer":
      return "contentinfo"
    case "form":
      return "form"
    case "dialog":
      return "dialog"
    case "ul":
    case "ol":
      return "list"
    case "li":
      return "listitem"
    case "table":
      return "table"
    case "tr":
      return "row"
    case "td":
      return "cell"
    case "th":
      return "columnheader"
    case "tbody":
      return "rowgroup"
    case "thead":
      return "rowgroup"
    case "tfoot":
      return "rowgroup"
    case "progress":
      return "progressbar"
    case "meter":
      return "meter"
    case "output":
      return "status"
    case "hr":
      return "separator"
    default:
      return null
  }
}

/**
 * Get the heading level for heading elements
 */
function getHeadingLevel(element: Element): number | undefined {
  const tagName = element.tagName.toLowerCase()
  const role = element.getAttribute("role")

  if (role === "heading") {
    const level = element.getAttribute("aria-level")
    return level ? parseInt(level, 10) : undefined
  }

  if (tagName.match(/^h[1-6]$/)) {
    return parseInt(tagName[1]!, 10)
  }

  return undefined
}

/**
 * Compute the accessible name for an element
 * Follows the accessible name computation algorithm (simplified)
 */
function computeAccessibleName(element: Element): string {
  // 1. aria-labelledby
  const labelledBy = element.getAttribute("aria-labelledby")
  if (labelledBy) {
    const ids = labelledBy.split(/\s+/)
    const texts = ids
      .map((id) => document.getElementById(id))
      .filter(Boolean)
      .map((el) => el!.textContent?.trim() || "")
    if (texts.length > 0) {
      return texts.join(" ")
    }
  }

  // 2. aria-label
  const ariaLabel = element.getAttribute("aria-label")
  if (ariaLabel) {
    return ariaLabel.trim()
  }

  // 3. <label for="id">
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`)
    if (label?.textContent) {
      return label.textContent.trim()
    }
  }

  // 4. alt attribute (for images)
  const alt = element.getAttribute("alt")
  if (alt !== null) {
    return alt.trim()
  }

  // 5. value attribute for buttons
  if (element.tagName.toLowerCase() === "input") {
    const type = (element as HTMLInputElement).type?.toLowerCase()
    if (type === "button" || type === "submit" || type === "reset") {
      const value = (element as HTMLInputElement).value
      if (value) {
        return value.trim()
      }
    }
  }

  // 6. title attribute
  const title = element.getAttribute("title")
  if (title) {
    return title.trim()
  }

  // 7. Text content (for buttons, links, headings, etc.)
  const role = getImplicitRole(element)
  const useTextContent = [
    "button",
    "link",
    "heading",
    "tab",
    "menuitem",
    "option",
    "treeitem",
    "gridcell",
    "columnheader",
    "rowheader",
    "cell",
    "checkbox",
    "radio",
  ]

  if (role && useTextContent.includes(role)) {
    let text = ""
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || ""
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const childElement = node as Element
        const childRole = getImplicitRole(childElement)
        if (!childRole || !isInteractiveRole(childRole)) {
          text += childElement.textContent || ""
        }
      }
    }
    text = text.trim()
    if (text) {
      return text
    }
  }

  // 8. placeholder (for inputs, fallback)
  const placeholder = element.getAttribute("placeholder")
  if (placeholder) {
    return placeholder.trim()
  }

  return ""
}

/**
 * Check if a role represents an interactive element
 */
function isInteractiveRole(role: string): boolean {
  const interactiveRoles = [
    "button",
    "link",
    "textbox",
    "searchbox",
    "checkbox",
    "radio",
    "slider",
    "spinbutton",
    "combobox",
    "listbox",
    "option",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "tab",
    "switch",
    "scrollbar",
    "searchbox",
  ]
  return interactiveRoles.includes(role)
}

/**
 * Check if an element is visible to the user
 */
export function isVisible(element: Element): boolean {
  if (!element.isConnected) {
    return false
  }

  const style = window.getComputedStyle(element)

  if (style.display === "none") {
    return false
  }

  if (style.visibility === "hidden") {
    return false
  }

  if (parseFloat(style.opacity) === 0) {
    return false
  }

  const rect = element.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) {
    return false
  }

  // (Note: This is a simplified check - full implementation would check all ancestors)
  const parent = element.parentElement
  if (parent) {
    const parentStyle = window.getComputedStyle(parent)
    if (parentStyle.overflow === "hidden" || parentStyle.overflow === "clip") {
      const parentRect = parent.getBoundingClientRect()
      if (
        rect.right < parentRect.left ||
        rect.left > parentRect.right ||
        rect.bottom < parentRect.top ||
        rect.top > parentRect.bottom
      ) {
        return false
      }
    }
  }

  if (element.getAttribute("aria-hidden") === "true") {
    return false
  }

  return true
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

/**
 * Build an accessibility node from a DOM element
 */
function buildA11yNode(element: Element, depth: number = 0): A11yNode | null {
  // Skip if not visible (unless it's a meaningful semantic container)
  const role = getImplicitRole(element)
  if (!role) {
    return null
  }

  const visible = isVisible(element)
  const semanticContainers = [
    "navigation",
    "main",
    "complementary",
    "contentinfo",
    "banner",
    "form",
    "region",
    "article",
  ]

  if (!visible && !semanticContainers.includes(role)) {
    return null
  }

  const name = computeAccessibleName(element)
  const bounds = element.getBoundingClientRect()

  const node: A11yNode = {
    role,
    name,
  }

  const description = element.getAttribute("aria-description")
  if (description) {
    node.description = description
  }

  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement
  ) {
    node.value = element.value
  } else if (element instanceof HTMLSelectElement) {
    node.value = element.value
  }

  if (
    element instanceof HTMLInputElement &&
    (element.type === "checkbox" || element.type === "radio")
  ) {
    node.checked = element.checked
  }

  if (element instanceof HTMLOptionElement) {
    node.selected = element.selected
  }

  if ("disabled" in element) {
    node.disabled = (
      element as HTMLInputElement | HTMLButtonElement | HTMLSelectElement
    ).disabled
  }

  const expanded = element.getAttribute("aria-expanded")
  if (expanded !== null) {
    node.expanded = expanded === "true"
  }

  const level = getHeadingLevel(element)
  if (level !== undefined) {
    node.level = level
  }

  node.bounds = {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  }

  node.selector = generateSelector(element)

  // Recursively build children (limit depth to prevent huge trees)
  if (depth < 20) {
    const children: A11yNode[] = []
    for (const child of element.children) {
      const childNode = buildA11yNode(child, depth + 1)
      if (childNode) {
        children.push(childNode)
      }
    }
    if (children.length > 0) {
      node.children = children
    }
  }

  return node
}

/**
 * Build the complete accessibility tree for the page
 */
export function buildA11yTree(): A11yTree {
  const tree = buildA11yNode(document.body, 0) || {
    role: "document",
    name: document.title,
    children: [],
  }

  return {
    url: window.location.href,
    title: document.title,
    tree,
  }
}

/**
 * Get a flat list of all interactive elements on the page
 */
export function getInteractiveElements(): InteractiveElement[] {
  const elements: InteractiveElement[] = []
  let index = 0

  // Query for interactive elements
  const selectors = [
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

  const allElements = document.querySelectorAll(selectors.join(","))

  for (const element of allElements) {
    const role = getImplicitRole(element)
    if (!role || !isInteractiveRole(role)) {
      continue
    }

    const name = computeAccessibleName(element)
    const visible = isVisible(element)
    const bounds = element.getBoundingClientRect()

    let actionable = visible
    if ("disabled" in element) {
      actionable =
        actionable &&
        !(element as HTMLInputElement | HTMLButtonElement | HTMLSelectElement)
          .disabled
    }
    if (element.getAttribute("aria-disabled") === "true") {
      actionable = false
    }

    elements.push({
      index: index++,
      role,
      name,
      selector: generateSelector(element),
      bounds: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      },
      actionable,
    })
  }

  return elements
}

/**
 * Find an element by CSS selector
 */
export function findElement(selector: string): Element | null {
  try {
    return document.querySelector(selector)
  } catch (error) {
    console.error("Invalid selector:", selector, error)
    return null
  }
}

let observer: MutationObserver | null = null
let debounceTimer: number | null = null
let changeCallback: (() => void) | null = null

/**
 * Watch for DOM changes and notify when the tree should be refreshed
 */
export function watchForChanges(
  callback: () => void,
  debounceMs: number = 500
): void {
  stopWatching()

  changeCallback = callback

  observer = new MutationObserver(() => {
    // Debounce the callback
    if (debounceTimer !== null) {
      window.clearTimeout(debounceTimer)
    }

    debounceTimer = window.setTimeout(() => {
      changeCallback?.()
      debounceTimer = null
    }, debounceMs)
  })

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "class",
      "id",
      "role",
      "aria-label",
      "aria-labelledby",
      "aria-hidden",
      "aria-expanded",
      "aria-checked",
      "aria-selected",
      "disabled",
      "hidden",
      "style",
    ],
  })
}

/**
 * Stop watching for DOM changes
 */
export function stopWatching(): void {
  if (observer) {
    observer.disconnect()
    observer = null
  }

  if (debounceTimer !== null) {
    window.clearTimeout(debounceTimer)
    debounceTimer = null
  }

  changeCallback = null
}

/**
 * Get a fresh tree on demand
 */
export function refreshTree(): A11yTree {
  return buildA11yTree()
}
