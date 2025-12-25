/**
 * Get content action executor
 * Supports multiple formats: accessibility tree, HTML, text, and markdown
 */

import type { AiiiGetContentArgs } from "@athreei/shared"
import { buildA11yTree } from "../a11y"

export interface GetContentResult {
  format: string
  content: unknown
  selector?: string
}

/**
 * Executes a get content action
 * Returns page or element content in the requested format
 */
export async function executeGetContent(
  args: AiiiGetContentArgs
): Promise<GetContentResult> {
  const format = args.format ?? "text"
  const selector = args.selector

  // Get target element (or document.body if no selector)
  let element: Element | null = null
  if (selector) {
    element = document.querySelector(selector)
    if (!element) {
      throw new Error(`Element not found: ${selector}`)
    }
  }

  switch (format) {
    case "accessibility":
      return {
        format: "accessibility",
        content: buildA11yTree(),
        selector,
      }

    case "html":
      return {
        format: "html",
        content: element
          ? (element as HTMLElement).outerHTML
          : document.documentElement.outerHTML,
        selector,
      }

    case "text":
      return {
        format: "text",
        content: element
          ? element.textContent?.trim() || ""
          : document.body.innerText,
        selector,
      }

    case "markdown":
      return {
        format: "markdown",
        content: element
          ? htmlToMarkdown(element as HTMLElement)
          : htmlToMarkdown(document.body),
        selector,
      }

    default:
      throw new Error(`Unknown format: ${format}`)
  }
}

/**
 * Convert HTML to basic markdown
 * Handles common elements: headings, links, lists, bold, italic, code
 */
function htmlToMarkdown(element: HTMLElement): string {
  const result: string[] = []

  function processNode(node: Node, depth: number = 0): void {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) {
        result.push(text)
      }
      return
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return
    }

    const el = node as HTMLElement
    const tagName = el.tagName.toLowerCase()

    // Skip script, style, and other non-content elements
    if (["script", "style", "noscript", "iframe", "svg"].includes(tagName)) {
      return
    }

    // Handle different elements
    switch (tagName) {
      case "h1":
        result.push("\n# ")
        processChildren(el, depth)
        result.push("\n\n")
        break

      case "h2":
        result.push("\n## ")
        processChildren(el, depth)
        result.push("\n\n")
        break

      case "h3":
        result.push("\n### ")
        processChildren(el, depth)
        result.push("\n\n")
        break

      case "h4":
        result.push("\n#### ")
        processChildren(el, depth)
        result.push("\n\n")
        break

      case "h5":
        result.push("\n##### ")
        processChildren(el, depth)
        result.push("\n\n")
        break

      case "h6":
        result.push("\n###### ")
        processChildren(el, depth)
        result.push("\n\n")
        break

      case "p":
        result.push("\n")
        processChildren(el, depth)
        result.push("\n\n")
        break

      case "br":
        result.push("\n")
        break

      case "hr":
        result.push("\n---\n\n")
        break

      case "a": {
        const href = el.getAttribute("href")
        if (href) {
          result.push("[")
          processChildren(el, depth)
          result.push(`](${href})`)
        } else {
          processChildren(el, depth)
        }
        break
      }

      case "strong":
      case "b":
        result.push("**")
        processChildren(el, depth)
        result.push("**")
        break

      case "em":
      case "i":
        result.push("*")
        processChildren(el, depth)
        result.push("*")
        break

      case "code":
        result.push("`")
        processChildren(el, depth)
        result.push("`")
        break

      case "pre":
        result.push("\n```\n")
        processChildren(el, depth)
        result.push("\n```\n\n")
        break

      case "blockquote":
        result.push("\n> ")
        processChildren(el, depth)
        result.push("\n\n")
        break

      case "ul":
        result.push("\n")
        for (const child of el.children) {
          if (child.tagName.toLowerCase() === "li") {
            result.push("- ")
            processChildren(child as HTMLElement, depth + 1)
            result.push("\n")
          }
        }
        result.push("\n")
        break

      case "ol":
        result.push("\n")
        let index = 1
        for (const child of el.children) {
          if (child.tagName.toLowerCase() === "li") {
            result.push(`${index}. `)
            processChildren(child as HTMLElement, depth + 1)
            result.push("\n")
            index++
          }
        }
        result.push("\n")
        break

      case "li":
        // Handled by parent ul/ol
        processChildren(el, depth)
        break

      case "img": {
        const alt = el.getAttribute("alt") || ""
        const src = el.getAttribute("src") || ""
        if (src) {
          result.push(`![${alt}](${src})`)
        }
        break
      }

      case "table":
        // Basic table support - just extract text
        result.push("\n")
        processChildren(el, depth)
        result.push("\n\n")
        break

      case "div":
      case "section":
      case "article":
      case "nav":
      case "header":
      case "footer":
      case "main":
      case "aside":
        // Container elements - just process children
        processChildren(el, depth)
        break

      default:
        // For unknown elements, just process children
        processChildren(el, depth)
        break
    }
  }

  function processChildren(element: Element, depth: number): void {
    for (const child of element.childNodes) {
      processNode(child, depth)
    }
  }

  processNode(element, 0)

  // Clean up the result
  let markdown = result.join("")

  // Remove excessive whitespace
  markdown = markdown.replace(/\n{3,}/g, "\n\n") // Max 2 newlines
  markdown = markdown.replace(/[ \t]+/g, " ") // Collapse spaces
  markdown = markdown.trim()

  return markdown
}
