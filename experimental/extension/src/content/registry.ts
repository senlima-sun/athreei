/**
 * Tool registry for website-registered custom tools
 */

import type { AiiiToolParameter } from "@athreei/shared"

export interface RegisteredTool {
  name: string
  description: string
  parameters: Record<string, AiiiToolParameter>
  origin: string
  requiresPermission: boolean
  returns?: {
    type: "string" | "number" | "boolean" | "array" | "object" | "void"
    description?: string
  }
  examples?: Array<{
    description: string
    args: Record<string, unknown>
    result?: unknown
  }>
}

/**
 * Registry for managing website-registered custom tools
 */
export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>()

  /**
   * Register a custom tool from a website
   * Tool names are automatically prefixed with origin to prevent conflicts
   */
  register(tool: RegisteredTool): void {
    const key = this.makeKey(tool.name, tool.origin)
    this.tools.set(key, tool)
  }

  /**
   * Unregister a tool by name and origin
   */
  unregister(toolName: string, origin: string): void {
    const key = this.makeKey(toolName, origin)
    this.tools.delete(key)
  }

  /**
   * Unregister all tools from a specific origin
   */
  unregisterOrigin(origin: string): void {
    for (const [key, tool] of this.tools.entries()) {
      if (tool.origin === origin) {
        this.tools.delete(key)
      }
    }
  }

  /**
   * Get a tool by name and origin
   */
  get(toolName: string, origin: string): RegisteredTool | undefined {
    const key = this.makeKey(toolName, origin)
    return this.tools.get(key)
  }

  /**
   * Get a tool by its full key (name@origin)
   */
  getByKey(key: string): RegisteredTool | undefined {
    return this.tools.get(key)
  }

  /**
   * Get all registered tools
   */
  getAll(): RegisteredTool[] {
    return Array.from(this.tools.values())
  }

  /**
   * Get all tools from a specific origin
   */
  getByOrigin(origin: string): RegisteredTool[] {
    return this.getAll().filter((tool) => tool.origin === origin)
  }

  /**
   * Check if a tool is a custom (website-registered) tool
   */
  isCustomTool(toolName: string, origin: string): boolean {
    return this.get(toolName, origin) !== undefined
  }

  /**
   * Check if a tool key exists
   */
  hasKey(key: string): boolean {
    return this.tools.has(key)
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear()
  }

  /**
   * Get the number of registered tools
   */
  get size(): number {
    return this.tools.size
  }

  /**
   * Make a unique key from tool name and origin
   */
  private makeKey(toolName: string, origin: string): string {
    return `${toolName}@${origin}`
  }

  /**
   * Parse a key into tool name and origin
   */
  parseKey(key: string): { name: string; origin: string } | null {
    const parts = key.split("@")
    if (parts.length !== 2) return null
    return { name: parts[0]!, origin: parts[1]! }
  }
}

// Singleton instance
let registry: ToolRegistry | null = null

export function getRegistry(): ToolRegistry {
  if (!registry) {
    registry = new ToolRegistry()
  }
  return registry
}

export function resetRegistry(): void {
  registry = new ToolRegistry()
}
