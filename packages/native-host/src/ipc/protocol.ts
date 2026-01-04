/**
 * IPC Protocol - Socket path utilities
 *
 * Platform-aware Unix socket path management for IPC server.
 * Uses ~/.athreei/athreei.sock on Unix, %APPDATA%/athreei.sock on Windows.
 */

import { homedir } from "os"
import { join } from "path"
import { existsSync, unlinkSync, mkdirSync } from "fs"

/**
 * Get the platform-appropriate socket path
 */
export function getSocketPath(): string {
  const baseDir =
    process.platform === "win32"
      ? process.env.APPDATA || join(homedir(), "AppData", "Roaming")
      : join(homedir(), ".athreei")

  return join(baseDir, "athreei.sock")
}

/**
 * Clean up stale socket file if it exists
 */
export function cleanupStaleSocket(socketPath: string): void {
  if (existsSync(socketPath)) {
    try {
      unlinkSync(socketPath)
      console.error(`[ipc-protocol] Removed stale socket: ${socketPath}`)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error(
        `[ipc-protocol] Failed to remove stale socket: ${errorMessage}`
      )
    }
  }
}

/**
 * Ensure the directory for the socket path exists
 */
export function ensureSocketDir(socketPath: string): void {
  const lastSlash = socketPath.lastIndexOf("/")
  const lastBackslash = socketPath.lastIndexOf("\\")
  const separatorIndex = Math.max(lastSlash, lastBackslash)

  if (separatorIndex === -1) {
    // No directory separator, current directory
    return
  }

  const dir = socketPath.substring(0, separatorIndex)

  if (!existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true })
      console.error(`[ipc-protocol] Created socket directory: ${dir}`)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      console.error(
        `[ipc-protocol] Failed to create socket directory: ${errorMessage}`
      )
      throw error
    }
  }
}
