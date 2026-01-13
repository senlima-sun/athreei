/**
 * Trace analytics API functions
 *
 * Provides operations for trace management and cleanup.
 */

import { invoke } from "@tauri-apps/api/core"

/**
 * Analytics summary for traces
 */
export interface TraceAnalytics {
  total_traces: number
  total_sessions: number
  traces_by_tool: Record<string, number>
  traces_by_day: Record<string, number>
  average_duration_ms: number | null
  error_rate: number
}

/**
 * Session state summary
 */
export interface SessionState {
  session_id: string
  first_trace_at: number
  last_trace_at: number
  trace_count: number
  unique_tools: number
}

/**
 * Session summary with details
 */
export interface SessionSummary {
  session_id: string
  total_traces: number
  unique_tools: number
  first_trace_at: number
  last_trace_at: number
  duration_ms: number
  traces_by_tool: Record<string, number>
  error_count: number
}

/**
 * Single trace entry
 */
export interface TraceEntry {
  id: string
  session_id: string
  tool_name: string
  input: string
  output: string | null
  error: string | null
  started_at: number
  ended_at: number | null
  duration_ms: number | null
}

/**
 * Get trace analytics for a given time range
 */
export const getTraceAnalytics = (days?: number): Promise<TraceAnalytics> =>
  invoke("get_trace_analytics", { days })

/**
 * Get summary for a specific session
 */
export const getSessionSummary = (
  sessionId: string
): Promise<SessionSummary | null> =>
  invoke("get_session_summary", { sessionId })

/**
 * Get recent sessions with pagination
 */
export const getRecentSessions = (
  limit?: number,
  offset?: number
): Promise<SessionState[]> => invoke("get_recent_sessions", { limit, offset })

/**
 * Get all traces for a specific session
 */
export const getSessionTraces = (sessionId: string): Promise<TraceEntry[]> =>
  invoke("get_session_traces", { sessionId })

/**
 * Cleanup old traces based on retention policy
 *
 * @param retentionDays - Delete traces older than this many days (default: 30)
 * @returns Number of traces deleted
 */
export const cleanupTraces = (retentionDays?: number): Promise<number> =>
  invoke("cleanup_traces", { retentionDays })
