/**
 * Settings API routes
 *
 * Endpoints for managing dashboard settings and data management.
 * Currently uses mock data - will integrate with SQLite later.
 */

import { Hono } from "hono"

export const settingsRouter = new Hono()

export interface Settings {
  theme: "dark" | "light" | "auto"
  language: string
  autoApprove: boolean
  logRetention: number
  notificationsEnabled: boolean
  notifyOnPermissionRequests: boolean
  notifyOnDeniedTools: boolean
  notifyOnNewSessions: boolean
}

// Default settings - single source of truth
const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  language: "en",
  autoApprove: false,
  logRetention: 30,
  notificationsEnabled: true,
  notifyOnPermissionRequests: true,
  notifyOnDeniedTools: true,
  notifyOnNewSessions: false,
}

// Mock settings storage
let mockSettings: Settings = { ...DEFAULT_SETTINGS }

/**
 * GET /api/settings
 * Get current settings
 */
settingsRouter.get("/", (c) => {
  return c.json(mockSettings)
})

/**
 * PUT /api/settings
 * Update settings
 *
 * Body should contain partial settings to update
 */
settingsRouter.put("/", async (c) => {
  try {
    const updates = await c.req.json<Partial<Settings>>()

    // Validate and merge with existing settings
    mockSettings = {
      ...mockSettings,
      ...updates,
    }

    return c.json({
      success: true,
      settings: mockSettings,
      message: "Settings updated successfully",
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Invalid settings data",
      },
      400
    )
  }
})

/**
 * POST /api/settings/export
 * Export all data as JSON
 *
 * Returns a complete export of all audit logs, permissions, sessions, and settings
 */
settingsRouter.post("/export", (c) => {
  // Mock export data - in production this would query the database
  const exportData = {
    version: "0.1.0",
    exportedAt: Date.now(),
    settings: mockSettings,
    auditLogs: [],
    permissions: [],
    sessions: [],
  }

  return c.json(exportData)
})

/**
 * DELETE /api/settings/data
 * Clear all data
 *
 * Deletes all audit logs, permissions, and sessions.
 * Settings are reset to defaults.
 */
settingsRouter.delete("/data", (c) => {
  // Reset settings to defaults
  mockSettings = { ...DEFAULT_SETTINGS }

  return c.json({
    success: true,
    message: "All data cleared successfully",
  })
})

/**
 * POST /api/settings/reset
 * Reset settings to defaults without clearing data
 */
settingsRouter.post("/reset", (c) => {
  mockSettings = { ...DEFAULT_SETTINGS }

  return c.json({
    success: true,
    settings: mockSettings,
    message: "Settings reset to defaults",
  })
})
