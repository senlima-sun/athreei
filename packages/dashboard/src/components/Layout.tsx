import { NavLink, useLocation } from "react-router-dom"
import { useState, type ReactNode } from "react"
import { Menu, X } from "lucide-react"
import { ConnectionStatus } from "./ConnectionStatus"
import { ThemeToggle } from "./ThemeToggle"
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts"
import { cn } from "@/lib/utils"

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Enable keyboard shortcuts
  useKeyboardShortcuts()

  // Get page title based on current route
  const getPageTitle = () => {
    if (location.pathname === "/") return "Dashboard"
    if (location.pathname === "/traces") return "Traces"
    if (location.pathname.startsWith("/traces/")) return "Trace Details"
    if (location.pathname === "/logs") return "Audit Logs"
    if (location.pathname === "/permissions") return "Permissions"
    if (location.pathname === "/sessions") return "Sessions"
    if (location.pathname === "/settings") return "Settings"
    if (location.pathname === "/showcase/browser") return "Browser MCP"
    return "Dashboard"
  }

  // Close sidebar when route changes (for mobile)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="flex h-screen">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 w-60 bg-card border-r border-border flex flex-col p-6 transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile close button */}
        <button
          onClick={closeSidebar}
          className="absolute top-4 right-4 p-2 rounded-md hover:bg-accent lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo/Brand */}
        <div className="mb-8">
          <h2 className="m-0 text-primary text-xl font-semibold">athreei</h2>
          <p className="m-0 text-xs text-muted-foreground">Privacy Dashboard</p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1">
          <SidebarLink to="/" icon="📊" onClick={closeSidebar}>
            Dashboard
          </SidebarLink>
          <SidebarLink to="/traces" icon="📈" onClick={closeSidebar}>
            Traces
          </SidebarLink>
          <SidebarLink to="/logs" icon="📝" onClick={closeSidebar}>
            Audit Logs
          </SidebarLink>
          <SidebarLink to="/permissions" icon="🔒" onClick={closeSidebar}>
            Permissions
          </SidebarLink>
          <SidebarLink to="/sessions" icon="🔗" onClick={closeSidebar}>
            Sessions
          </SidebarLink>
          <SidebarLink to="/settings" icon="⚙️" onClick={closeSidebar}>
            Settings
          </SidebarLink>
        </nav>

        {/* Version Info */}
        <div className="mt-auto pt-4 border-t border-border">
          <p className="m-0 text-xs text-muted-foreground">v0.1.0</p>
          <p className="m-0 text-[10px] text-muted-foreground mt-1 hidden lg:block">
            Ctrl+D: Dashboard | Ctrl+T: Traces
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-card border-b border-border p-4 lg:p-6 flex items-center justify-between">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-md hover:bg-accent lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="m-0 text-xl lg:text-2xl font-semibold truncate">
            {getPageTitle()}
          </h1>

          <div className="flex items-center gap-2 lg:gap-4">
            <ThemeToggle />
            <div className="hidden sm:block">
              <ConnectionStatus />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

interface SidebarLinkProps {
  to: string
  icon: string
  children: ReactNode
  onClick?: () => void
}

function SidebarLink({ to, icon, children, onClick }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
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
