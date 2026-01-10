/**
 * MCP Tool Schemas for Browser Operations
 *
 * These define the tools exposed by the athreei MCP server to AI apps.
 */

import { z } from "zod"

export const BrowserListTabsInputSchema = z.object({})

export const BrowserListTabsOutputSchema = z.object({
  tabs: z.array(
    z.object({
      id: z.number(),
      url: z.string(),
      title: z.string(),
      active: z.boolean(),
      windowId: z.number(),
    })
  ),
})

export type BrowserListTabsInput = z.infer<typeof BrowserListTabsInputSchema>
export type BrowserListTabsOutput = z.infer<typeof BrowserListTabsOutputSchema>

export const BrowserGetActiveTabInputSchema = z.object({})

export const BrowserGetActiveTabOutputSchema = z.object({
  id: z.number(),
  url: z.string(),
  title: z.string(),
  windowId: z.number(),
})

export type BrowserGetActiveTabInput = z.infer<
  typeof BrowserGetActiveTabInputSchema
>
export type BrowserGetActiveTabOutput = z.infer<
  typeof BrowserGetActiveTabOutputSchema
>

export const BrowserNavigateInputSchema = z.object({
  url: z.string().url().describe("The URL to navigate to"),
  tabId: z.number().optional().describe("Tab ID (defaults to active tab)"),
  waitUntil: z
    .enum(["load", "domcontentloaded", "networkidle"])
    .optional()
    .default("load")
    .describe("When to consider navigation complete"),
})

export const BrowserNavigateOutputSchema = z.object({
  success: z.boolean(),
  url: z.string(),
  title: z.string(),
})

export type BrowserNavigateInput = z.infer<typeof BrowserNavigateInputSchema>
export type BrowserNavigateOutput = z.infer<typeof BrowserNavigateOutputSchema>

export const BrowserGetContentInputSchema = z.object({
  tabId: z.number().optional().describe("Tab ID (defaults to active tab)"),
  format: z
    .enum(["a11y", "html", "text", "markdown"])
    .optional()
    .default("a11y")
    .describe("Content format: a11y tree, raw HTML, plain text, or markdown"),
  selector: z.string().optional().describe("CSS selector to scope content"),
})

export const BrowserGetContentOutputSchema = z.object({
  content: z.string(),
  format: z.enum(["a11y", "html", "text", "markdown"]),
  url: z.string(),
  title: z.string(),
})

export type BrowserGetContentInput = z.infer<
  typeof BrowserGetContentInputSchema
>
export type BrowserGetContentOutput = z.infer<
  typeof BrowserGetContentOutputSchema
>

export const BrowserGetElementsInputSchema = z.object({
  tabId: z.number().optional().describe("Tab ID (defaults to active tab)"),
  selector: z.string().optional().describe("CSS selector to filter elements"),
  roles: z
    .array(z.string())
    .optional()
    .describe("ARIA roles to filter (e.g., button, link, textbox)"),
  interactiveOnly: z
    .boolean()
    .optional()
    .default(true)
    .describe("Only return interactive elements"),
})

export const ElementInfoSchema = z.object({
  index: z.number().describe("Stable index for referencing in other tools"),
  selector: z.string().describe("Unique CSS selector"),
  role: z.string().describe("ARIA role"),
  name: z.string().optional().describe("Accessible name"),
  text: z.string().optional().describe("Text content"),
  value: z.string().optional().describe("Current value (for inputs)"),
  boundingBox: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .optional(),
  enabled: z.boolean(),
  visible: z.boolean(),
  focused: z.boolean().optional(),
  checked: z.boolean().optional(),
  attributes: z.record(z.string()).optional(),
})

export const BrowserGetElementsOutputSchema = z.object({
  elements: z.array(ElementInfoSchema),
  count: z.number(),
})

export type BrowserGetElementsInput = z.infer<
  typeof BrowserGetElementsInputSchema
>
export type BrowserGetElementsOutput = z.infer<
  typeof BrowserGetElementsOutputSchema
>
export type ElementInfo = z.infer<typeof ElementInfoSchema>

export const BrowserClickInputSchema = z.object({
  tabId: z.number().optional().describe("Tab ID (defaults to active tab)"),
  selector: z.string().optional().describe("CSS selector of element to click"),
  index: z
    .number()
    .optional()
    .describe("Element index from browser_get_elements"),
  button: z
    .enum(["left", "right", "middle"])
    .optional()
    .default("left")
    .describe("Mouse button to use"),
  clickCount: z
    .number()
    .optional()
    .default(1)
    .describe("Number of clicks (2 for double-click)"),
  modifiers: z
    .array(z.enum(["ctrl", "shift", "alt", "meta"]))
    .optional()
    .describe("Modifier keys to hold"),
})

export const BrowserClickOutputSchema = z.object({
  success: z.boolean(),
  clicked: z.object({
    selector: z.string(),
    text: z.string().optional(),
  }),
})

export type BrowserClickInput = z.infer<typeof BrowserClickInputSchema>
export type BrowserClickOutput = z.infer<typeof BrowserClickOutputSchema>

export const BrowserTypeInputSchema = z.object({
  tabId: z.number().optional().describe("Tab ID (defaults to active tab)"),
  selector: z.string().optional().describe("CSS selector of input element"),
  index: z
    .number()
    .optional()
    .describe("Element index from browser_get_elements"),
  text: z.string().describe("Text to type"),
  clear: z
    .boolean()
    .optional()
    .default(false)
    .describe("Clear existing content first"),
  delay: z
    .number()
    .optional()
    .describe("Delay between keystrokes in ms (for realistic typing)"),
  submit: z
    .boolean()
    .optional()
    .default(false)
    .describe("Press Enter after typing"),
})

export const BrowserTypeOutputSchema = z.object({
  success: z.boolean(),
  typed: z.object({
    selector: z.string(),
    text: z.string(),
    previousValue: z.string().optional(),
  }),
})

export type BrowserTypeInput = z.infer<typeof BrowserTypeInputSchema>
export type BrowserTypeOutput = z.infer<typeof BrowserTypeOutputSchema>

export const BrowserScrollInputSchema = z.object({
  tabId: z.number().optional().describe("Tab ID (defaults to active tab)"),
  selector: z
    .string()
    .optional()
    .describe("CSS selector of scrollable element (defaults to page)"),
  direction: z
    .enum(["up", "down", "left", "right"])
    .optional()
    .describe("Scroll direction"),
  amount: z
    .number()
    .optional()
    .describe("Scroll amount in pixels (or 'page' equivalent)"),
  x: z.number().optional().describe("Absolute scroll X position"),
  y: z.number().optional().describe("Absolute scroll Y position"),
  behavior: z
    .enum(["auto", "smooth"])
    .optional()
    .default("auto")
    .describe("Scroll behavior"),
})

export const BrowserScrollOutputSchema = z.object({
  success: z.boolean(),
  scrollPosition: z.object({
    x: z.number(),
    y: z.number(),
  }),
})

export type BrowserScrollInput = z.infer<typeof BrowserScrollInputSchema>
export type BrowserScrollOutput = z.infer<typeof BrowserScrollOutputSchema>

export const BrowserScreenshotInputSchema = z.object({
  tabId: z.number().optional().describe("Tab ID (defaults to active tab)"),
  selector: z
    .string()
    .optional()
    .describe("CSS selector of element to screenshot"),
  fullPage: z
    .boolean()
    .optional()
    .default(false)
    .describe("Capture full scrollable page"),
  format: z
    .enum(["png", "jpeg", "webp"])
    .optional()
    .default("png")
    .describe("Image format"),
  quality: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe("Image quality (for jpeg/webp)"),
})

export const BrowserScreenshotOutputSchema = z.object({
  success: z.boolean(),
  image: z.string().describe("Base64-encoded image data"),
  format: z.enum(["png", "jpeg", "webp"]),
  dimensions: z.object({
    width: z.number(),
    height: z.number(),
  }),
})

export type BrowserScreenshotInput = z.infer<
  typeof BrowserScreenshotInputSchema
>
export type BrowserScreenshotOutput = z.infer<
  typeof BrowserScreenshotOutputSchema
>

export const BrowserExecuteScriptInputSchema = z.object({
  tabId: z.number().optional().describe("Tab ID (defaults to active tab)"),
  script: z.string().describe("JavaScript code to execute"),
  args: z
    .array(z.unknown())
    .optional()
    .describe("Arguments to pass to the script"),
})

export const BrowserExecuteScriptOutputSchema = z.object({
  success: z.boolean(),
  result: z.unknown().describe("Return value from the script"),
})

export type BrowserExecuteScriptInput = z.infer<
  typeof BrowserExecuteScriptInputSchema
>
export type BrowserExecuteScriptOutput = z.infer<
  typeof BrowserExecuteScriptOutputSchema
>

export const BrowserWaitInputSchema = z.object({
  tabId: z.number().optional().describe("Tab ID (defaults to active tab)"),
  selector: z.string().optional().describe("CSS selector to wait for"),
  state: z
    .enum(["attached", "detached", "visible", "hidden"])
    .optional()
    .default("visible")
    .describe("Element state to wait for"),
  timeout: z
    .number()
    .optional()
    .default(30000)
    .describe("Maximum wait time in ms"),
  condition: z
    .string()
    .optional()
    .describe("Custom JS condition that returns true when ready"),
})

export const BrowserWaitOutputSchema = z.object({
  success: z.boolean(),
  waited: z.number().describe("Time waited in ms"),
  timedOut: z.boolean(),
})

export type BrowserWaitInput = z.infer<typeof BrowserWaitInputSchema>
export type BrowserWaitOutput = z.infer<typeof BrowserWaitOutputSchema>

export const MCP_TOOL_NAMES = [
  "browser_list_tabs",
  "browser_get_active_tab",
  "browser_navigate",
  "browser_get_content",
  "browser_get_elements",
  "browser_click",
  "browser_type",
  "browser_scroll",
  "browser_screenshot",
  "browser_execute_script",
  "browser_wait",
] as const

export type MCPToolName = (typeof MCP_TOOL_NAMES)[number]

export const MCP_TOOL_SCHEMAS = {
  browser_list_tabs: {
    input: BrowserListTabsInputSchema,
    output: BrowserListTabsOutputSchema,
  },
  browser_get_active_tab: {
    input: BrowserGetActiveTabInputSchema,
    output: BrowserGetActiveTabOutputSchema,
  },
  browser_navigate: {
    input: BrowserNavigateInputSchema,
    output: BrowserNavigateOutputSchema,
  },
  browser_get_content: {
    input: BrowserGetContentInputSchema,
    output: BrowserGetContentOutputSchema,
  },
  browser_get_elements: {
    input: BrowserGetElementsInputSchema,
    output: BrowserGetElementsOutputSchema,
  },
  browser_click: {
    input: BrowserClickInputSchema,
    output: BrowserClickOutputSchema,
  },
  browser_type: {
    input: BrowserTypeInputSchema,
    output: BrowserTypeOutputSchema,
  },
  browser_scroll: {
    input: BrowserScrollInputSchema,
    output: BrowserScrollOutputSchema,
  },
  browser_screenshot: {
    input: BrowserScreenshotInputSchema,
    output: BrowserScreenshotOutputSchema,
  },
  browser_execute_script: {
    input: BrowserExecuteScriptInputSchema,
    output: BrowserExecuteScriptOutputSchema,
  },
  browser_wait: {
    input: BrowserWaitInputSchema,
    output: BrowserWaitOutputSchema,
  },
} as const

/**
 * MCP Tool definitions for registration with the MCP SDK
 */
export const MCP_TOOL_DEFINITIONS: Record<
  MCPToolName,
  { description: string; inputSchema: z.ZodObject<z.ZodRawShape> }
> = {
  browser_list_tabs: {
    description: "List all open browser tabs with their IDs, URLs, and titles",
    inputSchema: BrowserListTabsInputSchema,
  },
  browser_get_active_tab: {
    description: "Get information about the currently active browser tab",
    inputSchema: BrowserGetActiveTabInputSchema,
  },
  browser_navigate: {
    description:
      "Navigate to a URL in the browser. Can target a specific tab or use the active tab.",
    inputSchema: BrowserNavigateInputSchema,
  },
  browser_get_content: {
    description:
      "Get the content of a web page in various formats: accessibility tree (recommended for AI), HTML, plain text, or markdown",
    inputSchema: BrowserGetContentInputSchema,
  },
  browser_get_elements: {
    description:
      "Get a list of interactive elements on the page (buttons, links, inputs, etc.) with their selectors and accessible names",
    inputSchema: BrowserGetElementsInputSchema,
  },
  browser_click: {
    description:
      "Click on an element identified by CSS selector or element index from browser_get_elements",
    inputSchema: BrowserClickInputSchema,
  },
  browser_type: {
    description:
      "Type text into an input element. Can optionally clear existing content first and submit the form.",
    inputSchema: BrowserTypeInputSchema,
  },
  browser_scroll: {
    description:
      "Scroll the page or a specific element by direction/amount or to absolute coordinates",
    inputSchema: BrowserScrollInputSchema,
  },
  browser_screenshot: {
    description:
      "Take a screenshot of the page, full page, or a specific element",
    inputSchema: BrowserScreenshotInputSchema,
  },
  browser_execute_script: {
    description:
      "Execute JavaScript code in the page context. Requires explicit user permission.",
    inputSchema: BrowserExecuteScriptInputSchema,
  },
  browser_wait: {
    description:
      "Wait for an element to reach a specific state or for a custom condition to be met",
    inputSchema: BrowserWaitInputSchema,
  },
}
