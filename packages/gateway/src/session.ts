/**
 * Gateway Session Management
 *
 * Manages SSE connection sessions with automatic cleanup of idle sessions.
 * Each SSE connection gets its own session with connected MCP servers.
 */

import {
  aggregateTools as coreAggregateTools,
  routeToolCall as coreRouteToolCall,
} from "@athreei/gateway-core"
import type { ConnectedMcp, AggregatedTool, McpServerConfig } from "./types.js"
import { connectToAllServers, disconnectAllServers } from "./mcp-client.js"
import { log } from "./logger.js"

export interface GatewaySession {
  id: string
  connectedMcps: Map<string, ConnectedMcp>
  aggregatedTools: AggregatedTool[]
  createdAt: Date
  lastActivity: Date
  isActive: boolean
}

export interface CreateSessionOptions {
  servers: McpServerConfig[]
}

const sessions = new Map<string, GatewaySession>()

let cleanupIntervalId: ReturnType<typeof setInterval> | null = null
let sessionIdleTimeout = 30 * 60 * 1000 // 30 minutes default

export function configureSessionManager(options: {
  idleTimeout?: number
}): void {
  if (options.idleTimeout !== undefined) {
    sessionIdleTimeout = options.idleTimeout
  }
}

function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

export async function createSession(
  options: CreateSessionOptions
): Promise<GatewaySession> {
  const sessionId = generateSessionId()

  log.info(`Creating session ${sessionId}`)

  const { connected, failed } = await connectToAllServers(options.servers)

  if (failed.length > 0) {
    log.warn(`Session ${sessionId}: ${failed.length} servers failed to connect`)
  }

  const connectedMcps = new Map<string, ConnectedMcp>()
  for (const mcp of connected) {
    connectedMcps.set(mcp.sanitizedName, mcp)
  }

  const aggregatedTools = coreAggregateTools(connected, { logger: log })

  const session: GatewaySession = {
    id: sessionId,
    connectedMcps,
    aggregatedTools,
    createdAt: new Date(),
    lastActivity: new Date(),
    isActive: true,
  }

  sessions.set(sessionId, session)

  log.info(
    `Session ${sessionId} created: ${connectedMcps.size} servers, ${aggregatedTools.length} tools`
  )

  return session
}

export function getSession(sessionId: string): GatewaySession | undefined {
  return sessions.get(sessionId)
}

export function touchSession(sessionId: string): boolean {
  const session = sessions.get(sessionId)
  if (session && session.isActive) {
    session.lastActivity = new Date()
    return true
  }
  return false
}

export async function destroySession(sessionId: string): Promise<boolean> {
  const session = sessions.get(sessionId)
  if (!session) {
    return false
  }

  log.info(`Destroying session ${sessionId}`)

  session.isActive = false

  const mcps = Array.from(session.connectedMcps.values())
  await disconnectAllServers(mcps)

  session.connectedMcps.clear()
  session.aggregatedTools = []

  sessions.delete(sessionId)

  log.info(`Session ${sessionId} destroyed`)

  return true
}

export function getSessionCount(): number {
  return sessions.size
}

export function listSessionTools(
  sessionId: string
): { name: string; description?: string; inputSchema: unknown }[] {
  const session = sessions.get(sessionId)
  if (!session || !session.isActive) {
    throw new Error(`Session not found: ${sessionId}`)
  }

  touchSession(sessionId)

  return session.aggregatedTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }))
}

export async function callSessionTool(
  sessionId: string,
  toolName: string,
  args: Record<string, unknown>
): Promise<{
  content: Array<{ type: string; text?: string }>
  isError?: boolean
}> {
  const session = sessions.get(sessionId)
  if (!session || !session.isActive) {
    throw new Error(`Session not found: ${sessionId}`)
  }

  touchSession(sessionId)

  const state = {
    connectedMcps: session.connectedMcps,
    aggregatedTools: session.aggregatedTools,
  }

  return coreRouteToolCall(state, toolName, args, { logger: log })
}

export async function cleanupIdleSessions(): Promise<number> {
  const now = Date.now()
  const sessionsToCleanup: string[] = []

  for (const [id, session] of sessions) {
    const idleTime = now - session.lastActivity.getTime()
    if (idleTime > sessionIdleTimeout) {
      sessionsToCleanup.push(id)
    }
  }

  if (sessionsToCleanup.length > 0) {
    log.info(`Cleaning up ${sessionsToCleanup.length} idle sessions`)

    await Promise.all(
      sessionsToCleanup.map((id) => destroySession(id).catch(() => {}))
    )
  }

  return sessionsToCleanup.length
}

export function startSessionCleanup(intervalMs: number = 60000): void {
  if (cleanupIntervalId) {
    return
  }

  log.info(`Starting session cleanup (interval: ${intervalMs}ms)`)

  cleanupIntervalId = setInterval(() => {
    cleanupIdleSessions().catch((error) => {
      log.error("Error during session cleanup:", error)
    })
  }, intervalMs)
}

export function stopSessionCleanup(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId)
    cleanupIntervalId = null
    log.info("Session cleanup stopped")
  }
}

export async function cleanupAllSessions(): Promise<void> {
  log.info(`Cleaning up all ${sessions.size} sessions`)

  const sessionIds = Array.from(sessions.keys())
  await Promise.all(sessionIds.map((id) => destroySession(id).catch(() => {})))

  log.info("All sessions cleaned up")
}
