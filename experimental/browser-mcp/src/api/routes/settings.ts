/**
 * Settings API Routes
 *
 * Provides endpoints for managing application settings.
 * Settings are stored locally in the MCP server's data directory.
 */

import { Hono } from "hono"
import { homedir } from "os"
import { join } from "path"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"

// Default settings
const DEFAULT_SETTINGS = {
  theme: "auto" as "dark" | "light" | "auto",
  language: "en",
  autoApprove: false,
  logRetention: 30, // days
  notificationsEnabled: true,
  notifyOnPermissionRequests: true,
  notifyOnDeniedTools: true,
  notifyOnNewSessions: false,
}

type Settings = typeof DEFAULT_SETTINGS

// Settings file path
const DATA_DIR = join(homedir(), ".athreei")
const SETTINGS_FILE = join(DATA_DIR, "settings.json")

/**
 * Load settings from disk
 */
function loadSettings(): Settings {
  try {
    if (existsSync(SETTINGS_FILE)) {
      const data = readFileSync(SETTINGS_FILE, "utf-8")
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) }
    }
  } catch {
    // Ignore errors, return defaults
  }
  return { ...DEFAULT_SETTINGS }
}

/**
 * Save settings to disk
 */
function saveSettings(settings: Settings): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
}

export const settingsRoutes = new Hono()

/**
 * GET /api/settings - Get current settings
 */
settingsRoutes.get("/", async (c) => {
  const settings = loadSettings()
  return c.json(settings)
})

/**
 * PUT /api/settings - Update settings
 */
settingsRoutes.put("/", async (c) => {
  const updates = await c.req.json<Partial<Settings>>()

  const current = loadSettings()
  const newSettings = { ...current, ...updates }

  try {
    saveSettings(newSettings)
    return c.json({ success: true, settings: newSettings })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

/**
 * POST /api/settings/reset - Reset settings to defaults
 */
settingsRoutes.post("/reset", async (c) => {
  try {
    saveSettings(DEFAULT_SETTINGS)
    return c.json({ success: true, settings: DEFAULT_SETTINGS })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})

/**
 * POST /api/settings/export - Export all data
 */
settingsRoutes.post("/export", async (c) => {
  const { listAuditLogEntries } =
    await import("../../db/repositories/audit-log.js")
  const { listSessions } = await import("../../db/repositories/sessions.js")
  const { listPermissions } =
    await import("../../db/repositories/permissions.js")

  const settings = loadSettings()
  const auditLogs = listAuditLogEntries({ limit: 10000 })
  const permissions = listPermissions({ limit: 10000 })
  const sessions = listSessions({ limit: 10000 })

  return c.json({
    version: "1.0.0",
    exportedAt: Date.now(),
    settings,
    auditLogs,
    permissions,
    sessions,
  })
})

/**
 * DELETE /api/settings/data - Clear all data
 */
settingsRoutes.delete("/data", async (c) => {
  const { clearAuditLog } = await import("../../db/repositories/audit-log.js")
  const { clearSessions } = await import("../../db/repositories/sessions.js")

  try {
    clearAuditLog()
    clearSessions()
    return c.json({ success: true, message: "All data cleared" })
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500)
  }
})
