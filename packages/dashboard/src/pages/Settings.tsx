import { h } from "preact"
import { useState, useEffect } from "preact/hooks"
import { Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { ConnectionStatus } from "../components/ConnectionStatus"
import {
  getSettings,
  updateSettings,
  exportData,
  clearAllData,
  resetSettings,
  getMcpStatus,
  getExtensionStatus,
} from "../lib/api"
import type { Settings as SettingsType } from "../lib/api"

export function Settings() {
  const [settings, setSettings] = useState<SettingsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [mcpStatus, setMcpStatus] = useState<any>(null)
  const [extensionStatus, setExtensionStatus] = useState<any>(null)

  // Fetch settings on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [settingsData, mcp, ext] = await Promise.all([
          getSettings(),
          getMcpStatus(),
          getExtensionStatus(),
        ])
        setSettings(settingsData)
        setMcpStatus(mcp)
        setExtensionStatus(ext)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load settings")
        console.error("Failed to fetch settings:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timeout = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timeout)
    }
  }, [successMessage])

  const handleSaveSettings = async () => {
    if (!settings) return

    try {
      setSaving(true)
      setError(null)
      const response = await updateSettings(settings)
      if (response.success) {
        setSuccessMessage("Settings saved successfully!")
      } else {
        setError(response.error || "Failed to save settings")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings")
      console.error("Failed to save settings:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefaults = async () => {
    if (!confirm("Are you sure you want to reset all settings to defaults?")) {
      return
    }

    try {
      setSaving(true)
      setError(null)
      const response = await resetSettings()
      if (response.success && response.settings) {
        setSettings(response.settings)
        setSuccessMessage("Settings reset to defaults!")
      } else {
        setError("Failed to reset settings")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset settings")
      console.error("Failed to reset settings:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = async () => {
    try {
      const data = await exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `athreei-export-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setSuccessMessage("Data exported successfully!")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to export data")
      console.error("Failed to export data:", err)
    }
  }

  const handleClearAllData = async () => {
    const confirmed = confirm(
      "Are you sure you want to clear ALL data? This will permanently delete all audit logs, permissions, and sessions. This action cannot be undone."
    )

    if (!confirmed) return

    const doubleConfirmed = confirm(
      "This is your last warning. ALL data will be permanently deleted. Are you absolutely sure?"
    )

    if (!doubleConfirmed) return

    try {
      setSaving(true)
      setError(null)
      const response = await clearAllData()
      if (response.success) {
        setSuccessMessage("All data cleared successfully!")
      } else {
        setError("Failed to clear data")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear data")
      console.error("Failed to clear data:", err)
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = <K extends keyof SettingsType>(
    key: K,
    value: SettingsType[K]
  ) => {
    if (settings) {
      setSettings({ ...settings, [key]: value })
    }
  }

  if (loading) {
    return (
      <div>
        <div style={{ marginBottom: "var(--spacing-xl)" }}>
          <h2>Settings</h2>
          <p style={{ color: "var(--text-tertiary)", marginTop: "var(--spacing-sm)" }}>
            Configure your athreei dashboard and privacy preferences.
          </p>
        </div>
        <Card>
          <div style={{ textAlign: "center", padding: "var(--spacing-xl)" }}>
            <p style={{ color: "var(--text-tertiary)" }}>Loading settings...</p>
          </div>
        </Card>
      </div>
    )
  }

  if (error && !settings) {
    return (
      <div>
        <div style={{ marginBottom: "var(--spacing-xl)" }}>
          <h2>Settings</h2>
        </div>
        <Card>
          <div style={{ textAlign: "center", padding: "var(--spacing-xl)" }}>
            <p style={{ color: "var(--error)" }}>Error: {error}</p>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              style={{ marginTop: "var(--spacing-md)" }}
            >
              Retry
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: "var(--spacing-xl)" }}>
        <h2>Settings</h2>
        <p style={{ color: "var(--text-tertiary)", marginTop: "var(--spacing-sm)" }}>
          Configure your athreei dashboard and privacy preferences.
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div
          style={{
            padding: "var(--spacing-md)",
            marginBottom: "var(--spacing-lg)",
            backgroundColor: "var(--error)",
            color: "#ffffff",
            borderRadius: "var(--radius-md)",
          }}
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            padding: "var(--spacing-md)",
            marginBottom: "var(--spacing-lg)",
            backgroundColor: "var(--success)",
            color: "#ffffff",
            borderRadius: "var(--radius-md)",
          }}
        >
          {successMessage}
        </div>
      )}

      {/* General Settings */}
      <Card title="General" style={{ marginBottom: "var(--spacing-lg)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          <div>
            <label
              htmlFor="theme"
              style={{
                display: "block",
                marginBottom: "var(--spacing-xs)",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Theme
            </label>
            <select
              id="theme"
              value={settings?.theme || "dark"}
              onChange={(e) =>
                updateSetting("theme", (e.target as HTMLSelectElement).value as any)
              }
              style={{
                width: "100%",
                padding: "var(--spacing-sm)",
                backgroundColor: "var(--bg-tertiary)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
              }}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="auto">Auto</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="language"
              style={{
                display: "block",
                marginBottom: "var(--spacing-xs)",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Language
            </label>
            <select
              id="language"
              value={settings?.language || "en"}
              onChange={(e) =>
                updateSetting("language", (e.target as HTMLSelectElement).value)
              }
              style={{
                width: "100%",
                padding: "var(--spacing-sm)",
                backgroundColor: "var(--bg-tertiary)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
              }}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Privacy Settings */}
      <Card title="Privacy" style={{ marginBottom: "var(--spacing-lg)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          <div>
            <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings?.autoApprove || false}
                onChange={(e) =>
                  updateSetting("autoApprove", (e.target as HTMLInputElement).checked)
                }
                style={{ marginRight: "var(--spacing-sm)", width: "auto", cursor: "pointer" }}
              />
              <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                Auto-approve known origins
              </span>
            </label>
            <p
              style={{
                marginTop: "var(--spacing-xs)",
                marginLeft: "28px",
                fontSize: "0.75rem",
                color: "var(--text-tertiary)",
              }}
            >
              Automatically grant permissions to previously approved origins.
            </p>
          </div>

          <div>
            <label
              htmlFor="retention"
              style={{
                display: "block",
                marginBottom: "var(--spacing-xs)",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Log Retention (days)
            </label>
            <select
              id="retention"
              value={settings?.logRetention || 30}
              onChange={(e) =>
                updateSetting("logRetention", parseInt((e.target as HTMLSelectElement).value))
              }
              style={{
                width: "100%",
                padding: "var(--spacing-sm)",
                backgroundColor: "var(--bg-tertiary)",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
              }}
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
              <option value="0">Forever</option>
            </select>
            <p
              style={{
                marginTop: "var(--spacing-xs)",
                fontSize: "0.75rem",
                color: "var(--text-tertiary)",
              }}
            >
              Audit logs older than this will be automatically deleted.
            </p>
          </div>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card title="Notifications" style={{ marginBottom: "var(--spacing-lg)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          <div>
            <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings?.notificationsEnabled || false}
                onChange={(e) =>
                  updateSetting("notificationsEnabled", (e.target as HTMLInputElement).checked)
                }
                style={{ marginRight: "var(--spacing-sm)", width: "auto", cursor: "pointer" }}
              />
              <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                Enable notifications
              </span>
            </label>
            <p
              style={{
                marginTop: "var(--spacing-xs)",
                marginLeft: "28px",
                fontSize: "0.75rem",
                color: "var(--text-tertiary)",
              }}
            >
              Receive browser notifications for important events.
            </p>
          </div>

          <div>
            <label
              style={{
                display: "block",
                marginBottom: "var(--spacing-xs)",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Notify on:
            </label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "var(--spacing-sm)",
                marginLeft: "var(--spacing-md)",
              }}
            >
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={settings?.notifyOnPermissionRequests || false}
                  disabled={!settings?.notificationsEnabled}
                  onChange={(e) =>
                    updateSetting(
                      "notifyOnPermissionRequests",
                      (e.target as HTMLInputElement).checked
                    )
                  }
                  style={{ marginRight: "var(--spacing-sm)", width: "auto", cursor: "pointer" }}
                />
                <span style={{ fontSize: "0.875rem" }}>New permission requests</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={settings?.notifyOnDeniedTools || false}
                  disabled={!settings?.notificationsEnabled}
                  onChange={(e) =>
                    updateSetting("notifyOnDeniedTools", (e.target as HTMLInputElement).checked)
                  }
                  style={{ marginRight: "var(--spacing-sm)", width: "auto", cursor: "pointer" }}
                />
                <span style={{ fontSize: "0.875rem" }}>Denied tool invocations</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={settings?.notifyOnNewSessions || false}
                  disabled={!settings?.notificationsEnabled}
                  onChange={(e) =>
                    updateSetting("notifyOnNewSessions", (e.target as HTMLInputElement).checked)
                  }
                  style={{ marginRight: "var(--spacing-sm)", width: "auto", cursor: "pointer" }}
                />
                <span style={{ fontSize: "0.875rem" }}>New AI sessions</span>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card title="Data Management" style={{ marginBottom: "var(--spacing-lg)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          <div>
            <Button variant="secondary" onClick={handleExportData} disabled={saving}>
              Export Data
            </Button>
            <p
              style={{
                marginTop: "var(--spacing-xs)",
                fontSize: "0.75rem",
                color: "var(--text-tertiary)",
              }}
            >
              Download all your audit logs and permissions as JSON.
            </p>
          </div>

          <div>
            <Button variant="danger" onClick={handleClearAllData} disabled={saving}>
              Clear All Data
            </Button>
            <p
              style={{
                marginTop: "var(--spacing-xs)",
                fontSize: "0.75rem",
                color: "var(--text-tertiary)",
              }}
            >
              Permanently delete all audit logs, permissions, and sessions.
            </p>
          </div>
        </div>
      </Card>

      {/* System Status */}
      <Card title="System Status" style={{ marginBottom: "var(--spacing-lg)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Version:
            </span>
            <code style={{ fontSize: "0.875rem" }}>0.1.0</code>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              MCP Server Status:
            </span>
            <span
              style={{
                padding: "4px 8px",
                fontSize: "0.75rem",
                fontWeight: 600,
                borderRadius: "var(--radius-sm)",
                backgroundColor: mcpStatus?.running
                  ? "var(--success)"
                  : "var(--error)",
                color: "#ffffff",
              }}
            >
              {mcpStatus?.running ? "Running" : "Stopped"}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Extension Status:
            </span>
            <span
              style={{
                padding: "4px 8px",
                fontSize: "0.75rem",
                fontWeight: 600,
                borderRadius: "var(--radius-sm)",
                backgroundColor: extensionStatus?.installed
                  ? "var(--success)"
                  : "var(--error)",
                color: "#ffffff",
              }}
            >
              {extensionStatus?.installed ? "Active" : "Inactive"}
            </span>
          </div>

          <div style={{ marginTop: "var(--spacing-sm)" }}>
            <ConnectionStatus />
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "var(--spacing-md)", marginTop: "var(--spacing-xl)" }}>
        <Button
          variant="primary"
          onClick={handleSaveSettings}
          loading={saving}
          disabled={saving}
        >
          Save Changes
        </Button>
        <Button
          variant="secondary"
          onClick={handleResetToDefaults}
          disabled={saving}
        >
          Reset to Defaults
        </Button>
      </div>
    </div>
  )
}
