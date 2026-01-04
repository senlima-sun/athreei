/**
 * Bridge-specific types
 *
 * Additional types used by the Native Messaging bridge beyond what's in @athreei/shared
 */

/**
 * Bridge connection state
 */
export type BridgeState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error"

/**
 * Bridge configuration
 */
export interface BridgeConfig {
  /** Path to the native host binary */
  binaryPath: string

  /** Default timeout for requests in milliseconds */
  defaultTimeout?: number

  /** Heartbeat interval in milliseconds */
  heartbeatInterval?: number

  /** Maximum number of reconnect attempts */
  maxReconnectAttempts?: number

  /** Delay between reconnect attempts in milliseconds */
  reconnectDelay?: number

  /** Enable debug logging */
  debug?: boolean
}

/**
 * Bridge health status
 */
export interface BridgeHealth {
  state: BridgeState
  connected: boolean
  lastHeartbeat?: number
  reconnectAttempts: number
  pendingRequests: number
  processId?: number
}

/**
 * Bridge metrics
 */
export interface BridgeMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  uptimeSeconds: number
}
