import {
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  mkdirSync,
} from "fs"
import { join } from "path"
import { homedir } from "os"
import { spawnSync, execFileSync } from "child_process"

export function getAthreeiDir(): string {
  return join(homedir(), ".athreei")
}

export function getGatewayPidPath(): string {
  return join(getAthreeiDir(), "gateway.pid")
}

export function getGatewayLogPath(): string {
  return join(getAthreeiDir(), "gateway.log")
}

export function ensureAthreeiDir(): void {
  const dir = getAthreeiDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

export function findGatewayBinary(): string | null {
  const locations = [
    join(getAthreeiDir(), "bin", "gateway"),
    join(process.cwd(), "packages", "gateway", "dist", "gateway"),
    "/usr/local/bin/athreei-gateway",
    "/opt/homebrew/bin/athreei-gateway",
  ]

  try {
    const whichCmd = process.platform === "win32" ? "where" : "which"
    const result = spawnSync(whichCmd, ["athreei-gateway"], {
      encoding: "utf-8",
    })
    if (result.status === 0 && result.stdout.trim()) {
      return result.stdout.trim().split("\n")[0]
    }
  } catch {
    // Not found in PATH
  }

  for (const loc of locations) {
    if (existsSync(loc)) {
      return loc
    }
  }

  return null
}

export function readPidFile(): number | null {
  const pidPath = getGatewayPidPath()
  if (!existsSync(pidPath)) {
    return null
  }

  try {
    const content = readFileSync(pidPath, "utf-8").trim()
    const pid = parseInt(content, 10)
    return isNaN(pid) ? null : pid
  } catch {
    return null
  }
}

export function writePidFile(pid: number): void {
  ensureAthreeiDir()
  writeFileSync(getGatewayPidPath(), String(pid), "utf-8")
}

export function removePidFile(): void {
  const pidPath = getGatewayPidPath()
  if (existsSync(pidPath)) {
    try {
      unlinkSync(pidPath)
    } catch {
      // Ignore errors
    }
  }
}

export function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export function isGatewayRunning(): { running: boolean; pid: number | null } {
  const pid = readPidFile()
  if (!pid) {
    return { running: false, pid: null }
  }

  if (isProcessRunning(pid)) {
    return { running: true, pid }
  }

  removePidFile()
  return { running: false, pid: null }
}

export function getProcessStartTime(pid: number): Date | null {
  if (process.platform === "win32") {
    return null
  }

  try {
    const result = execFileSync("ps", ["-o", "lstart=", "-p", String(pid)], {
      encoding: "utf-8",
    })
    return new Date(result.trim())
  } catch {
    return null
  }
}

export function formatUptime(startTime: Date): string {
  const now = new Date()
  const diff = now.getTime() - startTime.getTime()

  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}
