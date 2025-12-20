import { NavLink, useLocation } from "react-router-dom"
import type { ReactNode } from "react"
import { ConnectionStatus } from "./ConnectionStatus"
import { ThemeToggle } from "./ThemeToggle"
import { cn } from "@/lib/utils"

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()

  // Get page title based on current route
  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
        return "Dashboard"
      case "/logs":
        return "Audit Logs"
      case "/permissions":
        return "Permissions"
      case "/sessions":
        return "Sessions"
      case "/settings":
        return "Settings"
      default:
        return "Dashboard"
    }
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-card border-r border-border flex flex-col p-6">
        {/* Logo/Brand */}
        <div className="mb-8">
          <h2 className="m-0 text-primary text-xl font-semibold">athreei</h2>
          <p className="m-0 text-xs text-muted-foreground">Privacy Dashboard</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1">
          <SidebarLink to="/" icon="📊">
            Dashboard
          </SidebarLink>
          <SidebarLink to="/logs" icon="📝">
            Audit Logs
          </SidebarLink>
          <SidebarLink to="/permissions" icon="🔒">
            Permissions
          </SidebarLink>
          <SidebarLink to="/sessions" icon="🔗">
            Sessions
          </SidebarLink>
          <SidebarLink to="/settings" icon="⚙️">
            Settings
          </SidebarLink>
        </nav>

        {/* Version Info */}
        <div className="mt-auto pt-4 border-t border-border">
          <p className="m-0 text-xs text-muted-foreground">v0.1.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border p-6 flex items-center justify-between">
          <h1 className="m-0 text-2xl font-semibold">{getPageTitle()}</h1>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <ConnectionStatus />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

interface SidebarLinkProps {
  to: string
  icon: string
  children: ReactNode
}

function SidebarLink({ to, icon, children }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-4 px-4 py-2 rounded-md text-muted-foreground no-underline transition-colors",
          "hover:bg-accent hover:text-foreground",
          isActive && "bg-accent text-foreground"
        )
      }
    >
      <span>{icon}</span>
      <span>{children}</span>
    </NavLink>
  )
}
