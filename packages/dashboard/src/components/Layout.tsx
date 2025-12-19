import { h } from "preact"
import { Link } from "preact-router/match"
import type { ComponentChildren } from "preact"

interface LayoutProps {
  children: ComponentChildren
}

export function Layout({ children }: LayoutProps) {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: "240px",
          backgroundColor: "var(--bg-secondary)",
          borderRight: "1px solid var(--border-color)",
          display: "flex",
          flexDirection: "column",
          padding: "var(--spacing-lg)",
        }}
      >
        {/* Logo/Brand */}
        <div style={{ marginBottom: "var(--spacing-xl)" }}>
          <h2 style={{ margin: 0, color: "var(--accent-primary)" }}>athreei</h2>
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              color: "var(--text-tertiary)",
            }}
          >
            Privacy Dashboard
          </p>
        </div>

        {/* Navigation Links */}
        <nav style={{ flex: 1 }}>
          <NavLink href="/" icon="📊">
            Dashboard
          </NavLink>
          <NavLink href="/logs" icon="📝">
            Audit Logs
          </NavLink>
          <NavLink href="/permissions" icon="🔒">
            Permissions
          </NavLink>
          <NavLink href="/sessions" icon="🔗">
            Sessions
          </NavLink>
          <NavLink href="/settings" icon="⚙️">
            Settings
          </NavLink>
        </nav>

        {/* Version Info */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: "var(--spacing-md)",
            borderTop: "1px solid var(--border-color)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              color: "var(--text-tertiary)",
            }}
          >
            v0.1.0
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <header
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderBottom: "1px solid var(--border-color)",
            padding: "var(--spacing-lg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.5rem" }}>Dashboard</h1>

          {/* Connection Status Placeholder */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--spacing-sm)",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "var(--success)",
              }}
            />
            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Connected
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main
          style={{
            flex: 1,
            padding: "var(--spacing-xl)",
            overflowY: "auto",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

interface NavLinkProps {
  href: string
  icon: string
  children: ComponentChildren
}

function NavLink({ href, icon, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      activeClassName="nav-active"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--spacing-md)",
        padding: "var(--spacing-sm) var(--spacing-md)",
        marginBottom: "var(--spacing-xs)",
        borderRadius: "var(--radius-md)",
        color: "var(--text-secondary)",
        textDecoration: "none",
        transition: "all 0.2s",
      }}
    >
      <span>{icon}</span>
      <span>{children}</span>
    </Link>
  )
}

// Add active link styling via global styles
const style = document.createElement("style")
style.textContent = `
  .nav-active {
    background-color: var(--bg-hover) !important;
    color: var(--text-primary) !important;
  }
  a[href]:hover {
    background-color: var(--bg-tertiary);
    color: var(--text-primary);
  }
`
document.head.appendChild(style)
