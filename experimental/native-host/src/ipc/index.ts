/**
 * IPC Module - Unix socket server for MCP connections
 *
 * Public exports for the IPC server and protocol utilities.
 */

export { IPCServer } from "./server.js"
export {
  getSocketPath,
  cleanupStaleSocket,
  ensureSocketDir,
} from "./protocol.js"
