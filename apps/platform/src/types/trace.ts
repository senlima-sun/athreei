/**
 * Trace-related type definitions
 */

/**
 * Active skill reference in a trace
 */
export interface TraceActiveSkill {
  id: string
  name: string
}

/**
 * Active rule reference in a trace
 */
export interface TraceActiveRule {
  id: string
  name: string
  priority: number
}

/**
 * Attributes attached to a trace for filtering and display
 */
export interface TraceAttributes {
  toolName?: string
  serverName?: string
  aggregatedToolName?: string
  arguments?: unknown
  result?: unknown
  activeSkillIds?: string[]
  activeRuleIds?: string[]
  [key: string]: unknown
}

/**
 * A single trace record representing a tool call
 */
export interface Trace {
  id: string
  traceId: string
  parentSpanId?: string | null
  spanId?: string
  name: string
  kind?: string
  status: "success" | "error"
  statusMessage?: string | null
  startTime: string
  endTime?: string | null
  durationMs?: number | null
  attributes?: TraceAttributes | null
  events?: unknown[] | null
  createdAt?: string
  activeSkills?: TraceActiveSkill[]
  activeRules?: TraceActiveRule[]
}

/**
 * Response from the traces API
 */
export interface TracesResponse {
  traces: Trace[]
  total?: number
  hasMore?: boolean
}
