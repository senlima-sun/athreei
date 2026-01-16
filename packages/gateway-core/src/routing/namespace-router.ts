/**
 * Namespace Router
 *
 * Routes tool calls to the correct MCP server based on namespace prefixes.
 * Manages the mapping between namespaced tool names and their connections.
 */

import type { TransportConnection } from "../types/transports.js"

export interface Tool {
  name: string
  description?: string
  inputSchema?: unknown
}

export interface NamespaceRoute {
  namespace: string
  serverId: string
  connection: TransportConnection
  tools: Tool[]
}

export interface NamespacedTool extends Tool {
  namespacedName: string
  namespace: string
  originalName: string
}

export class NamespaceRouter {
  private routes = new Map<string, NamespaceRoute>()
  private toolToNamespace = new Map<string, string>()

  registerServer(
    namespace: string,
    serverId: string,
    connection: TransportConnection,
    tools: Tool[]
  ): void {
    const existingRoute = this.routes.get(namespace)
    if (existingRoute) {
      this.unregisterServer(namespace)
    }

    this.routes.set(namespace, { namespace, serverId, connection, tools })

    for (const tool of tools) {
      const namespacedTool = `${namespace}__${tool.name}`
      this.toolToNamespace.set(namespacedTool, namespace)
    }
  }

  unregisterServer(namespace: string): void {
    const route = this.routes.get(namespace)
    if (!route) return

    for (const tool of route.tools) {
      const namespacedTool = `${namespace}__${tool.name}`
      this.toolToNamespace.delete(namespacedTool)
    }

    this.routes.delete(namespace)
  }

  routeToolCall(namespacedToolName: string): NamespaceRoute | undefined {
    const namespace = this.toolToNamespace.get(namespacedToolName)
    if (!namespace) return undefined
    return this.routes.get(namespace)
  }

  getOriginalToolName(namespacedToolName: string): string {
    const parts = namespacedToolName.split("__")
    if (parts.length < 2) return namespacedToolName
    return parts.slice(1).join("__")
  }

  getNamespace(namespacedToolName: string): string | undefined {
    const parts = namespacedToolName.split("__")
    if (parts.length < 2) return undefined
    return parts[0]
  }

  parseToolName(namespacedToolName: string): {
    namespace: string | undefined
    toolName: string
  } {
    const parts = namespacedToolName.split("__")
    if (parts.length < 2) {
      return { namespace: undefined, toolName: namespacedToolName }
    }
    return {
      namespace: parts[0],
      toolName: parts.slice(1).join("__"),
    }
  }

  getAllTools(): NamespacedTool[] {
    const tools: NamespacedTool[] = []

    for (const [namespace, route] of this.routes) {
      for (const tool of route.tools) {
        tools.push({
          ...tool,
          namespacedName: `${namespace}__${tool.name}`,
          namespace,
          originalName: tool.name,
        })
      }
    }

    return tools
  }

  getToolsForNamespace(namespace: string): Tool[] {
    const route = this.routes.get(namespace)
    return route?.tools ?? []
  }

  getRoute(namespace: string): NamespaceRoute | undefined {
    return this.routes.get(namespace)
  }

  getAllRoutes(): NamespaceRoute[] {
    return Array.from(this.routes.values())
  }

  getAllNamespaces(): string[] {
    return Array.from(this.routes.keys())
  }

  hasNamespace(namespace: string): boolean {
    return this.routes.has(namespace)
  }

  hasTool(namespacedToolName: string): boolean {
    return this.toolToNamespace.has(namespacedToolName)
  }

  getServerIdForTool(namespacedToolName: string): string | undefined {
    const route = this.routeToolCall(namespacedToolName)
    return route?.serverId
  }

  getConnectionForTool(
    namespacedToolName: string
  ): TransportConnection | undefined {
    const route = this.routeToolCall(namespacedToolName)
    return route?.connection
  }

  clear(): void {
    this.routes.clear()
    this.toolToNamespace.clear()
  }

  getStats(): {
    namespaceCount: number
    totalTools: number
    toolsByNamespace: Map<string, number>
  } {
    const toolsByNamespace = new Map<string, number>()

    for (const [namespace, route] of this.routes) {
      toolsByNamespace.set(namespace, route.tools.length)
    }

    return {
      namespaceCount: this.routes.size,
      totalTools: this.toolToNamespace.size,
      toolsByNamespace,
    }
  }
}
