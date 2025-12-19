/**
 * Bridge Module
 *
 * Provides the Native Messaging bridge for communication between
 * the MCP server and the Chrome extension (via native host).
 */

export { NativeMessagingClient, createNativeMessagingClient } from "./native-messaging.js"
export type { BridgeState, BridgeConfig, BridgeHealth, BridgeMetrics } from "./types.js"
