import { h } from "preact"
import { useState } from "preact/hooks"

export function Settings() {
  const [autoApprove, setAutoApprove] = useState(false)
  const [logRetention, setLogRetention] = useState("30")
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)

  return (
    <div>
      <div style={{ marginBottom: "var(--spacing-xl)" }}>
        <h2>Settings</h2>
        <p className="text-muted">
          Configure your athreei dashboard and privacy preferences.
        </p>
      </div>

      {/* General Settings */}
      <div className="card" style={{ marginBottom: "var(--spacing-lg)" }}>
        <h3 style={{ fontSize: "1.125rem", marginBottom: "var(--spacing-md)" }}>
          General
        </h3>
        <div className="form-group">
          <label htmlFor="theme">Theme</label>
          <select id="theme">
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="auto">Auto</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="language">Language</label>
          <select id="language">
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="card" style={{ marginBottom: "var(--spacing-lg)" }}>
        <h3 style={{ fontSize: "1.125rem", marginBottom: "var(--spacing-md)" }}>
          Privacy
        </h3>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={autoApprove}
              onChange={(e) => setAutoApprove((e.target as HTMLInputElement).checked)}
              style={{ marginRight: "var(--spacing-sm)", width: "auto" }}
            />
            Auto-approve known origins
          </label>
          <p className="text-muted text-sm">
            Automatically grant permissions to previously approved origins.
          </p>
        </div>
        <div className="form-group">
          <label htmlFor="retention">Log Retention (days)</label>
          <select
            id="retention"
            value={logRetention}
            onChange={(e) => setLogRetention((e.target as HTMLSelectElement).value)}
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="365">1 year</option>
            <option value="0">Forever</option>
          </select>
          <p className="text-muted text-sm">
            Audit logs older than this will be automatically deleted.
          </p>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="card" style={{ marginBottom: "var(--spacing-lg)" }}>
        <h3 style={{ fontSize: "1.125rem", marginBottom: "var(--spacing-md)" }}>
          Notifications
        </h3>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={notificationsEnabled}
              onChange={(e) =>
                setNotificationsEnabled((e.target as HTMLInputElement).checked)
              }
              style={{ marginRight: "var(--spacing-sm)", width: "auto" }}
            />
            Enable notifications
          </label>
          <p className="text-muted text-sm">
            Receive browser notifications for important events.
          </p>
        </div>
        <div className="form-group">
          <label>Notify on:</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xs)", marginTop: "var(--spacing-xs)" }}>
            <label>
              <input
                type="checkbox"
                disabled={!notificationsEnabled}
                style={{ marginRight: "var(--spacing-sm)", width: "auto" }}
              />
              New permission requests
            </label>
            <label>
              <input
                type="checkbox"
                disabled={!notificationsEnabled}
                style={{ marginRight: "var(--spacing-sm)", width: "auto" }}
              />
              Denied tool invocations
            </label>
            <label>
              <input
                type="checkbox"
                disabled={!notificationsEnabled}
                style={{ marginRight: "var(--spacing-sm)", width: "auto" }}
              />
              New AI sessions
            </label>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="card" style={{ marginBottom: "var(--spacing-lg)" }}>
        <h3 style={{ fontSize: "1.125rem", marginBottom: "var(--spacing-md)" }}>
          Data Management
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-md)" }}>
          <div>
            <button className="btn btn-secondary">Export Data</button>
            <p className="text-muted text-sm" style={{ marginTop: "var(--spacing-xs)" }}>
              Download all your audit logs and permissions as JSON.
            </p>
          </div>
          <div>
            <button className="btn btn-danger">Clear All Data</button>
            <p className="text-muted text-sm" style={{ marginTop: "var(--spacing-xs)" }}>
              Permanently delete all audit logs, permissions, and sessions.
            </p>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card">
        <h3 style={{ fontSize: "1.125rem", marginBottom: "var(--spacing-md)" }}>
          About
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-sm)" }}>
          <div>
            <span className="text-muted">Version:</span>{" "}
            <code>0.1.0</code>
          </div>
          <div>
            <span className="text-muted">MCP Server Status:</span>{" "}
            <span className="badge badge-success">Running</span>
          </div>
          <div>
            <span className="text-muted">Extension Status:</span>{" "}
            <span className="badge badge-success">Active</span>
          </div>
        </div>
        <div style={{ marginTop: "var(--spacing-md)" }}>
          <button className="btn btn-secondary">Check for Updates</button>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ marginTop: "var(--spacing-xl)", display: "flex", gap: "var(--spacing-md)" }}>
        <button className="btn btn-primary">Save Changes</button>
        <button className="btn btn-secondary">Reset to Defaults</button>
      </div>
    </div>
  )
}
