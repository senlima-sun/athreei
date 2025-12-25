/**
 * Execute script action executor
 * Runs JavaScript in the page context with proper error handling
 */

import type { AiiiExecuteScriptArgs } from "@athreei/shared"

export interface ExecuteScriptResult {
  executed: boolean
  result?: unknown
  error?: string
  returnedValue: boolean
}

/**
 * Executes JavaScript code in the page context
 * Handles both sync and async scripts
 * Properly serializes return values
 */
export async function executeScript(
  args: AiiiExecuteScriptArgs
): Promise<ExecuteScriptResult> {
  if (!args.script || typeof args.script !== "string") {
    throw new Error("Script is required and must be a string")
  }

  try {
    // Create a function from the script
    // We wrap it to allow both expressions and statements
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
    const fn = new AsyncFunction("return (async () => { " + args.script + " })()")

    // Execute the function
    const result = await fn()

    // Try to serialize the result
    const serialized = serializeValue(result)

    return {
      executed: true,
      result: serialized.value,
      returnedValue: serialized.hasValue,
    }
  } catch (error) {
    // Return error information
    const errorMessage =
      error instanceof Error ? error.message : String(error)

    return {
      executed: false,
      error: errorMessage,
      returnedValue: false,
    }
  }
}

/**
 * Serialize a value for JSON transmission
 * Handles non-serializable values gracefully
 */
function serializeValue(value: unknown): {
  value: unknown
  hasValue: boolean
} {
  // Handle undefined and null
  if (value === undefined) {
    return { value: undefined, hasValue: false }
  }

  if (value === null) {
    return { value: null, hasValue: true }
  }

  // Handle primitives
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return { value, hasValue: true }
  }

  // Handle Date
  if (value instanceof Date) {
    return { value: value.toISOString(), hasValue: true }
  }

  // Handle RegExp
  if (value instanceof RegExp) {
    return { value: value.toString(), hasValue: true }
  }

  // Handle Error
  if (value instanceof Error) {
    return {
      value: {
        name: value.name,
        message: value.message,
        stack: value.stack,
      },
      hasValue: true,
    }
  }

  // Handle Functions
  if (typeof value === "function") {
    return {
      value: {
        type: "function",
        name: value.name || "anonymous",
        toString: value.toString().substring(0, 200), // Limit size
      },
      hasValue: true,
    }
  }

  // Handle DOM elements
  if (value instanceof Element) {
    return {
      value: {
        type: "element",
        tagName: value.tagName.toLowerCase(),
        id: value.id || undefined,
        className: value.className || undefined,
        textContent: value.textContent?.substring(0, 100),
      },
      hasValue: true,
    }
  }

  // Handle NodeList
  if (value instanceof NodeList) {
    return {
      value: {
        type: "NodeList",
        length: value.length,
        items: Array.from(value)
          .slice(0, 10)
          .map((node) => serializeValue(node).value),
      },
      hasValue: true,
    }
  }

  // Handle Arrays
  if (Array.isArray(value)) {
    try {
      const serialized = value.map((item) => serializeValue(item).value)
      return { value: serialized, hasValue: true }
    } catch {
      return {
        value: { type: "Array", length: value.length },
        hasValue: true,
      }
    }
  }

  // Handle plain objects
  if (value && typeof value === "object") {
    try {
      // Try JSON stringify first (fastest for simple objects)
      JSON.stringify(value)
      return { value, hasValue: true }
    } catch {
      // Object is not JSON-serializable, try to extract key properties
      try {
        const serialized: Record<string, unknown> = {}
        const keys = Object.keys(value).slice(0, 50) // Limit to 50 keys

        for (const key of keys) {
          const prop = (value as Record<string, unknown>)[key]
          const serializedProp = serializeValue(prop)
          if (serializedProp.hasValue) {
            serialized[key] = serializedProp.value
          }
        }

        return { value: serialized, hasValue: true }
      } catch {
        // Fallback to toString
        return {
          value: {
            type: "Object",
            toString: String(value).substring(0, 200),
          },
          hasValue: true,
        }
      }
    }
  }

  // Unknown type
  return {
    value: { type: typeof value, toString: String(value).substring(0, 200) },
    hasValue: true,
  }
}
