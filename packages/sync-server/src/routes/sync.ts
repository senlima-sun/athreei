import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import {
  SyncPushRequestSchema,
  SyncSettingsSchema,
  type SyncPullResponse,
  type SyncPushResponse,
  type SyncSettingsResponse,
  type ErrorResponse,
} from "../types"
import { pullChanges, pushChanges, getInitialSyncState } from "../services/sync"
import { getSyncSettings, updateSyncSettings } from "../db/client"
import { authMiddleware, getAuthContext } from "../middleware/auth"

const sync = new Hono()

// All sync routes require authentication
sync.use("*", authMiddleware)

// Get changes since last sync (pull)
sync.get("/", async (c) => {
  try {
    const { accountId } = getAuthContext(c)
    const deviceId = c.req.query("deviceId")
    const cursor = c.req.query("cursor")
    const limitStr = c.req.query("limit")
    const limit = limitStr ? parseInt(limitStr, 10) : 100

    if (!deviceId) {
      return c.json<ErrorResponse>(
        { error: "deviceId query parameter is required" },
        400
      )
    }

    const result = await pullChanges(accountId, deviceId, cursor, limit)
    return c.json<SyncPullResponse>(result, 200)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to pull changes"
    return c.json<ErrorResponse>({ error: message }, 500)
  }
})

// Push changes to server
sync.post("/", zValidator("json", SyncPushRequestSchema), async (c) => {
  try {
    const { accountId } = getAuthContext(c)
    const { items, deviceId } = c.req.valid("json")

    const result = await pushChanges(accountId, deviceId, items)
    return c.json<SyncPushResponse>(result, 200)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to push changes"
    return c.json<ErrorResponse>({ error: message }, 500)
  }
})

// Get sync state for a device
sync.get("/state", async (c) => {
  try {
    const { accountId } = getAuthContext(c)
    const deviceId = c.req.query("deviceId")

    if (!deviceId) {
      return c.json<ErrorResponse>(
        { error: "deviceId query parameter is required" },
        400
      )
    }

    const state = await getInitialSyncState(accountId, deviceId)
    return c.json(state, 200)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get sync state"
    return c.json<ErrorResponse>({ error: message }, 500)
  }
})

// Get sync settings
sync.get("/settings", async (c) => {
  try {
    const { accountId } = getAuthContext(c)
    const settings = await getSyncSettings(accountId)

    if (!settings) {
      return c.json<ErrorResponse>({ error: "Sync settings not found" }, 404)
    }

    const response: SyncSettingsResponse = {
      syncPermissions: settings.sync_permissions,
      syncAuditLog: settings.sync_audit_log,
      syncSessions: settings.sync_sessions,
      syncSettings: settings.sync_settings,
      auditLogRetentionDays: settings.audit_log_retention_days,
    }

    return c.json(response, 200)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get sync settings"
    return c.json<ErrorResponse>({ error: message }, 500)
  }
})

// Update sync settings
sync.put("/settings", zValidator("json", SyncSettingsSchema), async (c) => {
  try {
    const { accountId } = getAuthContext(c)
    const updates = c.req.valid("json")

    const settings = await updateSyncSettings(accountId, {
      sync_permissions: updates.syncPermissions,
      sync_audit_log: updates.syncAuditLog,
      sync_sessions: updates.syncSessions,
      sync_settings: updates.syncSettings,
      audit_log_retention_days: updates.auditLogRetentionDays,
    })

    const response: SyncSettingsResponse = {
      syncPermissions: settings.sync_permissions,
      syncAuditLog: settings.sync_audit_log,
      syncSessions: settings.sync_sessions,
      syncSettings: settings.sync_settings,
      auditLogRetentionDays: settings.audit_log_retention_days,
    }

    return c.json(response, 200)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update sync settings"
    return c.json<ErrorResponse>({ error: message }, 500)
  }
})

export default sync
