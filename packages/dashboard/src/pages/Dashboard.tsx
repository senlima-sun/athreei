import { h } from "preact"

export function Dashboard() {
  return (
    <div>
      <h2>Dashboard Overview</h2>
      <p className="text-muted">
        Welcome to the athreei privacy dashboard. This is your central hub for
        monitoring and managing AI interactions.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "var(--spacing-lg)",
          marginTop: "var(--spacing-xl)",
        }}
      >
        <StatCard title="Total Requests" value="0" />
        <StatCard title="Active Sessions" value="0" />
        <StatCard title="Permissions" value="0" />
        <StatCard title="Blocked Requests" value="0" />
      </div>

      <div className="card" style={{ marginTop: "var(--spacing-xl)" }}>
        <h3>Recent Activity</h3>
        <p className="text-muted">No recent activity to display.</p>
      </div>

      <div className="card" style={{ marginTop: "var(--spacing-lg)" }}>
        <h3>Quick Actions</h3>
        <div style={{ display: "flex", gap: "var(--spacing-md)", marginTop: "var(--spacing-md)" }}>
          <button className="btn btn-primary">View Audit Logs</button>
          <button className="btn btn-secondary">Manage Permissions</button>
          <button className="btn btn-secondary">Configure Settings</button>
        </div>
      </div>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string
}

function StatCard({ title, value }: StatCardProps) {
  return (
    <div className="card">
      <h4 className="text-muted" style={{ fontSize: "0.875rem", marginBottom: "var(--spacing-sm)" }}>
        {title}
      </h4>
      <p style={{ fontSize: "2rem", fontWeight: "600", margin: 0 }}>{value}</p>
    </div>
  )
}
