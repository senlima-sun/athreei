import {
  isLocalConfig,
  isCloudConfig,
  tryLoadConfigSync,
} from "@athreei/shared"
import type { CliMode, ModeOptions } from "../types/index"
import { CloudModeRequiredError, LocalModeRequiredError } from "../errors/index"

export type { CliMode, ModeOptions }
export { CloudModeRequiredError, LocalModeRequiredError }

let currentMode: CliMode = "local"

export function setMode(mode: CliMode): void {
  currentMode = mode
}

export function getMode(): CliMode {
  return currentMode
}

export function detectMode(options?: ModeOptions): CliMode {
  if (options?.local) {
    return "local"
  }
  if (options?.cloud) {
    return "cloud"
  }

  const envMode = process.env.ATHREEI_MODE?.toLowerCase()
  if (envMode === "local") {
    return "local"
  }
  if (envMode === "cloud") {
    return "cloud"
  }

  const config = tryLoadConfigSync()
  if (config) {
    if (isCloudConfig(config)) {
      return "cloud"
    }
    if (isLocalConfig(config)) {
      return "local"
    }
  }

  return "local"
}

export function requireCloudMode(mode: CliMode, command: string): void {
  if (mode !== "cloud") {
    throw new CloudModeRequiredError(command)
  }
}

export function requireLocalMode(mode: CliMode, command: string): void {
  if (mode !== "local") {
    throw new LocalModeRequiredError(command)
  }
}

export function getModeDescription(mode: CliMode): string {
  return mode === "local"
    ? "Local mode (offline, file-based config)"
    : "Cloud mode (connected to Platform)"
}

export function getModeIndicator(mode: CliMode): string {
  return mode === "local" ? "[local]" : "[cloud]"
}
