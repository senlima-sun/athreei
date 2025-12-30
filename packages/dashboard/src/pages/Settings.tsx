import { useState, useEffect } from "react"
import { LegacyCard as Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { ConnectionStatus } from "../components/ConnectionStatus"
import { ConnectionMethodSelector, type ConnectionMethod } from "../components/ConnectionMethodSelector"
import {
  getSettings,
  updateSettings,
  exportData,
  clearAllData,
  resetSettings,
  getMcpStatus,
  getExtensionStatus,
} from "../lib/api"
import type { Settings as SettingsType, McpStatus, ExtensionStatus } from "../lib/api"
import { cn } from "@/lib/utils"

export function Settings() {
  const [settings, setSettings] = useState<SettingsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [mcpStatus, setMcpStatus] = useState<McpStatus | null>(null)
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus | null>(null)
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod | undefined>(undefined)

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
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Settings</h2>
          <p className="text-muted-foreground">
            Configure your athreei dashboard and privacy preferences.
          </p>
        </div>
        <Card>
          <div className="text-center p-8">
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </Card>
      </div>
    )
  }

  if (error && !settings) {
    return (
      <div>
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Settings</h2>
        </div>
        <Card>
          <div className="text-center p-8">
            <p className="text-error">Error: {error}</p>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              className="mt-4"
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
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Settings</h2>
        <p className="text-muted-foreground">
          Configure your athreei dashboard and privacy preferences.
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-4 mb-6 bg-destructive text-destructive-foreground rounded-md">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 mb-6 bg-success text-white rounded-md">
          {successMessage}
        </div>
      )}

      {/* Connection Method Selector */}
      <Card title="Connection Method" className="mb-6">
        <ConnectionMethodSelector
          selectedMethod={connectionMethod}
          onMethodSelect={setConnectionMethod}
        />
      </Card>

      {/* General Settings */}
      <Card title="General" className="mb-6">
        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="theme" className="block mb-1.5 text-sm font-medium">
              Theme
            </label>
            <select
              id="theme"
              value={settings?.theme || "dark"}
              onChange={(e) => updateSetting("theme", e.target.value as "dark" | "light" | "auto")}
              className="w-full p-2 bg-secondary border border-border rounded-md text-foreground"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="auto">Auto</option>
            </select>
          </div>

          <div>
            <label htmlFor="language" className="block mb-1.5 text-sm font-medium">
              Language
            </label>
            <select
              id="language"
              value={settings?.language || "en"}
              onChange={(e) => updateSetting("language", e.target.value)}
              className="w-full p-2 bg-secondary border border-border rounded-md text-foreground"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Privacy Settings */}
      <Card title="Privacy" className="mb-6">
        <div className="flex flex-col gap-4">
          <div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings?.autoApprove || false}
                onChange={(e) => updateSetting("autoApprove", e.target.checked)}
                className="mr-2 w-4 h-4 cursor-pointer"
              />
              <span className="text-sm font-medium">Auto-approve known origins</span>
            </label>
            <p className="mt-1 ml-6 text-xs text-muted-foreground">
              Automatically grant permissions to previously approved origins.
            </p>
          </div>

          <div>
            <label htmlFor="retention" className="block mb-1.5 text-sm font-medium">
              Log Retention (days)
            </label>
            <select
              id="retention"
              value={settings?.logRetention || 30}
              onChange={(e) => updateSetting("logRetention", parseInt(e.target.value))}
              className="w-full p-2 bg-secondary border border-border rounded-md text-foreground"
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
              <option value="0">Forever</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Audit logs older than this will be automatically deleted.
            </p>
          </div>
        </div>
      </Card>

      {/* Notification Settings */}
      <Card title="Notifications" className="mb-6">
        <div className="flex flex-col gap-4">
          <div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings?.notificationsEnabled || false}
                onChange={(e) => updateSetting("notificationsEnabled", e.target.checked)}
                className="mr-2 w-4 h-4 cursor-pointer"
              />
              <span className="text-sm font-medium">Enable notifications</span>
            </label>
            <p className="mt-1 ml-6 text-xs text-muted-foreground">
              Receive browser notifications for important events.
            </p>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium">Notify on:</label>
            <div className="flex flex-col gap-2 ml-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.notifyOnPermissionRequests || false}
                  disabled={!settings?.notificationsEnabled}
                  onChange={(e) =>
                    updateSetting("notifyOnPermissionRequests", e.target.checked)
                  }
                  className="mr-2 w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">New permission requests</span>
              </label>

              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.notifyOnDeniedTools || false}
                  disabled={!settings?.notificationsEnabled}
                  onChange={(e) =>
                    updateSetting("notifyOnDeniedTools", e.target.checked)
                  }
                  className="mr-2 w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">Denied tool invocations</span>
              </label>

              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.notifyOnNewSessions || false}
                  disabled={!settings?.notificationsEnabled}
                  onChange={(e) =>
                    updateSetting("notifyOnNewSessions", e.target.checked)
                  }
                  className="mr-2 w-4 h-4 cursor-pointer"
                />
                <span className="text-sm">New AI sessions</span>
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card title="Data Management" className="mb-6">
        <div className="flex flex-col gap-4">
          <div>
            <Button variant="secondary" onClick={handleExportData} disabled={saving}>
              Export Data
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              Download all your audit logs and permissions as JSON.
            </p>
          </div>

          <div>
            <Button variant="danger" onClick={handleClearAllData} disabled={saving}>
              Clear All Data
            </Button>
            <p className="mt-1 text-xs text-muted-foreground">
              Permanently delete all audit logs, permissions, and sessions.
            </p>
          </div>
        </div>
      </Card>

      {/* System Status */}
      <Card title="System Status" className="mb-6">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Version:</span>
            <code className="text-sm">0.1.0</code>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">MCP Server Status:</span>
            <span
              className={cn(
                "px-2 py-1 text-xs font-semibold rounded",
                mcpStatus?.running
                  ? "bg-success text-white"
                  : "bg-destructive text-destructive-foreground"
              )}
            >
              {mcpStatus?.running ? "Running" : "Stopped"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Extension Status:</span>
            <span
              className={cn(
                "px-2 py-1 text-xs font-semibold rounded",
                extensionStatus?.installed
                  ? "bg-success text-white"
                  : "bg-destructive text-destructive-foreground"
              )}
            >
              {extensionStatus?.installed ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="mt-2">
            <ConnectionStatus />
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-4 mt-8">
        <Button
          variant="primary"
          onClick={handleSaveSettings}
          loading={saving}
          disabled={saving}
        >
          Save Changes
        </Button>
        <Button variant="secondary" onClick={handleResetToDefaults} disabled={saving}>
          Reset to Defaults
        </Button>
      </div>
    </div>
  )
}
