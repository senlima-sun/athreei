/**
 * Gateway Cloud Type Definitions
 *
 * Types for the cloud-hosted MCP gateway SSE service.
 */

import { z } from "zod"
import type {
  McpServerConfig,
  ConnectedMcp,
  AggregatedTool,
  Logger,
} from "@athreei/gateway-core"

// =============================================================================
// Session Types
// =============================================================================

/**
 * Gateway session state
 */
export interface GatewaySession {
  /** Unique session ID */
  id: string
  /** Endpoint name for this session */
  endpointName: string
  /** User/account ID */
  userId: string
  /** Namespace ID */
  namespaceId: string
  /** Connected MCP servers */
  connectedMcps: Map<string, ConnectedMcp>
  /** Aggregated tools from all servers */
  aggregatedTools: AggregatedTool[]
  /** Session creation timestamp */
  createdAt: Date
  /** Last activity timestamp */
  lastActivity: Date
  /** Whether session is active */
  isActive: boolean
}

/**
 * Session creation options
 */
export interface CreateSessionOptions {
  endpointName: string
  userId: string
  namespaceId: string
  servers: McpServerConfig[]
  logger?: Logger
  /** API key for fetching server environment variables */
  apiKey?: string
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Endpoint configuration from Platform API
 */
export interface EndpointConfig {
  endpointId: string
  endpointName: string
  namespaceId: string
  namespaceName: string
  namespaceSlug: string
  organizationId: string
  userId: string
  servers: McpServerConfig[]
  configVersion: string
}

/**
 * API key validation result
 */
export interface ApiKeyValidation {
  valid: boolean
  config?: EndpointConfig
  error?: string
}

// =============================================================================
// SSE Message Types
// =============================================================================

/**
 * MCP JSON-RPC message (incoming)
 */
export interface McpRequest {
  jsonrpc: "2.0"
  id: string | number
  method: string
  params?: Record<string, unknown>
}

/**
 * MCP JSON-RPC response (outgoing)
 */
export interface McpResponse {
  jsonrpc: "2.0"
  id: string | number
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
}

/**
 * SSE event types
 */
export type SseEventType = "message" | "endpoint" | "error" | "ping"

/**
 * SSE event structure
 */
export interface SseEvent {
  event: SseEventType
  data: string
  id?: string
}

// =============================================================================
// Health Check Types
// =============================================================================

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: "ok" | "degraded" | "unhealthy"
  timestamp: string
  version: string
  activeSessions: number
  uptime: number
}

// =============================================================================
// Request Validation Schemas
// =============================================================================

/**
 * SSE connection query parameters
 */
export const SseQuerySchema = z.object({
  sessionId: z.string().optional(),
})

export type SseQuery = z.infer<typeof SseQuerySchema>

/**
 * MCP message validation schema
 */
export const McpMessageSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.record(z.unknown()).optional(),
})

export type McpMessage = z.infer<typeof McpMessageSchema>

// =============================================================================
// Error Types
// =============================================================================

/**
 * Gateway cloud error codes
 */
export enum GatewayErrorCode {
  UNAUTHORIZED = "UNAUTHORIZED",
  ENDPOINT_NOT_FOUND = "ENDPOINT_NOT_FOUND",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
  SESSION_EXPIRED = "SESSION_EXPIRED",
  INVALID_REQUEST = "INVALID_REQUEST",
  SERVER_UNAVAILABLE = "SERVER_UNAVAILABLE",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

/**
 * Gateway error response
 */
export interface GatewayError {
  error: GatewayErrorCode
  message: string
  details?: unknown
}

// =============================================================================
// Configuration Types
// =============================================================================

/**
 * Gateway cloud configuration
 */
export interface GatewayCloudConfig {
  /** Port to listen on */
  port: number
  /** Platform API URL for validating API keys */
  platformUrl: string
  /** Session idle timeout in milliseconds */
  sessionIdleTimeout: number
  /** Session cleanup interval in milliseconds */
  sessionCleanupInterval: number
  /** Enable debug logging */
  debug: boolean
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: GatewayCloudConfig = {
  port: 3001,
  platformUrl: process.env.PLATFORM_URL ?? "http://localhost:3000",
  sessionIdleTimeout: 30 * 60 * 1000, // 30 minutes
  sessionCleanupInterval: 60 * 1000, // 1 minute
  debug: process.env.NODE_ENV === "development",
}
