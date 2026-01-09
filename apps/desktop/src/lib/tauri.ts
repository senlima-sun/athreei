import { invoke } from "@tauri-apps/api/core"

/**
 * Check if running inside Tauri environment
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
}

/**
 * Invoke a Tauri command with type safety
 */
export async function tauriInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  if (!isTauri()) {
    throw new Error("Not running in Tauri environment")
  }
  return invoke<T>(cmd, args)
}
