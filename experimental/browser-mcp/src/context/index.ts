/**
 * MCP Context Module
 *
 * Stores and provides access to MCP connection context,
 * including client (AI app) information captured during handshake.
 */

export interface McpContext {
  clientName: string
  clientVersion: string
  connectedAt: Date
}

let currentContext: McpContext | null = null

/**
 * Set the MCP context when a client connects
 */
export function setMcpContext(context: McpContext): void {
  currentContext = context
}

/**
 * Get the current MCP context
 */
export function getMcpContext(): McpContext | null {
  return currentContext
}

/**
 * Get the AI app name for display
 * Returns the client name if available, otherwise "AI Assistant"
 */
export function getAiAppName(): string {
  return currentContext?.clientName || "AI Assistant"
}

/**
 * Clear the MCP context when disconnected
 */
export function clearMcpContext(): void {
  currentContext = null
}

/**
 * Check if a client is currently connected
 */
export function isClientConnected(): boolean {
  return currentContext !== null
}
