/**
 * Health Check Routes
 *
 * Provides health and status endpoints for the gateway cloud service.
 */

import { Hono } from "hono"
import type { HealthCheckResponse } from "../types"
import { getSessionCount, getAllSessions } from "../gateway/session"

const health = new Hono()

/** Server start time for uptime calculation */
const startTime = Date.now()

/** Package version */
const VERSION = "0.1.0"

/**
 * Basic health check
 * GET /health
 */
health.get("/", (c) => {
  const activeSessions = getSessionCount()
  const uptime = Math.floor((Date.now() - startTime) / 1000)

  const response: HealthCheckResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: VERSION,
    activeSessions,
    uptime,
  }

  return c.json(response)
})

/**
 * Liveness probe for Kubernetes
 * GET /health/live
 */
health.get("/live", (c) => {
  return c.json({ status: "alive" })
})

/**
 * Readiness probe for Kubernetes
 * GET /health/ready
 */
health.get("/ready", (c) => {
  // For now, always ready if server is running
  return c.json({ status: "ready" })
})

/**
 * Detailed status for debugging
 * GET /health/status
 */
health.get("/status", (c) => {
  const sessions = getAllSessions()
  const uptime = Math.floor((Date.now() - startTime) / 1000)

  const sessionStats = sessions.map((session) => ({
    id: session.id,
    endpointName: session.endpointName,
    userId: session.userId,
    connectedServers: session.connectedMcps.size,
    toolCount: session.aggregatedTools.length,
    createdAt: session.createdAt.toISOString(),
    lastActivity: session.lastActivity.toISOString(),
    idleSeconds: Math.floor(
      (Date.now() - session.lastActivity.getTime()) / 1000
    ),
  }))

  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: VERSION,
    uptime,
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    sessions: {
      count: sessions.length,
      details: sessionStats,
    },
  })
})

export default health
