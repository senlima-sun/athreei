/**
 * Tool Aggregation Logic
 *
 * Aggregates tools from multiple connected MCP servers into a single
 * tool list with prefixed names: {serverName}__{toolName}
 *
 * This module is framework-agnostic and can be used by both local
 * and cloud gateway implementations.
 */

import type { ConnectedMcp, AggregatedTool, Logger } from "./types"
import { noopLogger } from "./types"

/**
 * Sanitize a server name for use as a tool prefix.
 * Only allows alphanumeric characters and underscores.
 * Replaces other characters with underscores and collapses consecutive underscores.
 */
export function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
}

/**
 * Create a prefixed tool name in the format: {serverName}__{toolName}
 */
export function createPrefixedName(
  serverName: string,
  toolName: string
): string {
  return `${serverName}__${toolName}`
}

/**
 * Options for aggregating tools
 */
export interface AggregateToolsOptions {
  /** Logger for debug output */
  logger?: Logger
}

/**
 * Aggregate tools from all connected MCP servers.
 * Each tool is prefixed with its server name for routing.
 *
 * Example:
 * - Browser MCP's "screenshot" -> "browser__screenshot"
 * - GitHub MCP's "create_issue" -> "github__create_issue"
 */
export function aggregateTools(
  mcps: ConnectedMcp[],
  options: AggregateToolsOptions = {}
): AggregatedTool[] {
  const logger = options.logger ?? noopLogger
  const aggregated: AggregatedTool[] = []
  const seenNames = new Set<string>()

  for (const mcp of mcps) {
    if (!mcp.tools || mcp.tools.length === 0) {
      logger.debug(`Server "${mcp.config.name}" has no tools`)
      continue
    }

    for (const tool of mcp.tools) {
      const prefixedName = createPrefixedName(mcp.sanitizedName, tool.name)

      if (seenNames.has(prefixedName)) {
        logger.warn(`Duplicate tool name detected: ${prefixedName}, skipping`)
        continue
      }
      seenNames.add(prefixedName)

      const aggregatedTool: AggregatedTool = {
        name: prefixedName,
        description: tool.description
          ? `[${mcp.config.name}] ${tool.description}`
          : `Tool from ${mcp.config.name}`,
        inputSchema: tool.inputSchema,
        originalName: tool.name,
        serverName: mcp.sanitizedName,
      }

      aggregated.push(aggregatedTool)
    }

    logger.debug(
      `Aggregated ${mcp.tools.length} tools from "${mcp.config.name}" (prefix: ${mcp.sanitizedName})`
    )
  }

  return aggregated
}

/**
 * Find an aggregated tool by its prefixed name
 */
export function findAggregatedTool(
  tools: AggregatedTool[],
  prefixedName: string
): AggregatedTool | undefined {
  return tools.find((t) => t.name === prefixedName)
}

/**
 * Get all tools for a specific server
 */
export function getToolsForServer(
  tools: AggregatedTool[],
  serverName: string
): AggregatedTool[] {
  const sanitized = sanitizeName(serverName)
  return tools.filter((t) => t.serverName === sanitized)
}

/**
 * Get a summary of aggregated tools by server
 */
export function getAggregationSummary(
  tools: AggregatedTool[]
): Map<string, number> {
  const summary = new Map<string, number>()

  for (const tool of tools) {
    const count = summary.get(tool.serverName) || 0
    summary.set(tool.serverName, count + 1)
  }

  return summary
}
