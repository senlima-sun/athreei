import { NavLink, Outlet, useLocation } from "react-router-dom"
import { useState, useEffect, type ReactNode } from "react"
import {
  Home,
  FolderOpen,
  Settings,
  Menu,
  X,
  Search,
  Command,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useVaultStatus, useVaultIsSetup } from "@/hooks"
import { UnlockScreen } from "@/components/unlock-screen"
import { FullPageLoading } from "@/components/loading-spinner"
import { FullPageError } from "@/components/error-display"

export function Layout(): React.ReactElement {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mcpConnected, setMcpConnected] = useState(false)

  // Vault status queries
  const {
    data: isUnlocked,
    isLoading: isStatusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useVaultStatus()
  const {
    data: isSetup,
    isLoading: isSetupLoading,
    error: setupError,
    refetch: refetchSetup,
  } = useVaultIsSetup()

  // Get page title based on current route
  const getPageTitle = (): string => {
    if (location.pathname === "/") return "Today"
    if (location.pathname === "/spaces") return "Spaces"
    if (location.pathname.startsWith("/spaces/")) return "Space"
    if (location.pathname === "/settings") return "Settings"
    return "aiii"
  }

  // Close sidebar when route changes (for mobile)
  const closeSidebar = (): void => setSidebarOpen(false)

  // Keyboard shortcut for search (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        // TODO: Open search modal
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Simulate MCP connection status check
  useEffect(() => {
    const checkMcpStatus = async (): Promise<void> => {
      // TODO: Replace with actual MCP status check from Tauri
      setMcpConnected(true)
    }
    checkMcpStatus()
  }, [])

  // Show loading state while checking vault status
  if (isStatusLoading || isSetupLoading) {
    return <FullPageLoading message="Checking vault status..." />
  }

  // Show error state if vault status check fails
  if (statusError || setupError) {
    return (
      <FullPageError
        error={statusError || setupError}
        onRetry={() => {
          refetchStatus()
          refetchSetup()
        }}
      />
    )
  }

  // Show unlock screen if vault is locked or not set up
  if (!isUnlocked) {
    return <UnlockScreen isFirstTime={!isSetup} />
  }

  return (
    <div className="dark flex h-screen bg-background text-foreground">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-card p-6 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile close button */}
        <button
          onClick={closeSidebar}
          className="absolute right-4 top-4 rounded-md p-2 hover:bg-accent lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo/Brand */}
        <div className="mb-8">
          <h2 className="m-0 text-xl font-semibold text-primary">aiii</h2>
          <p className="m-0 text-xs text-muted-foreground">
            Personal Memory Engine
          </p>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1">
          <SidebarLink
            to="/"
            icon={<Home className="h-4 w-4" />}
            onClick={closeSidebar}
          >
            Today
          </SidebarLink>
          <SidebarLink
            to="/spaces"
            icon={<FolderOpen className="h-4 w-4" />}
            onClick={closeSidebar}
          >
            Spaces
          </SidebarLink>
          <SidebarLink
            to="/settings"
            icon={<Settings className="h-4 w-4" />}
            onClick={closeSidebar}
          >
            Settings
          </SidebarLink>
        </nav>

        {/* MCP Status */}
        <div className="mt-auto border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "h-2 w-2 rounded-full",
                mcpConnected ? "bg-green-500" : "bg-red-500"
              )}
            />
            <span className="text-xs text-muted-foreground">
              MCP {mcpConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          <p className="m-0 mt-2 text-xs text-muted-foreground">v0.1.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border bg-card p-4 lg:p-6">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="-ml-2 rounded-md p-2 hover:bg-accent lg:hidden"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <h1 className="m-0 truncate text-xl font-semibold lg:text-2xl">
            {getPageTitle()}
          </h1>

          <div className="flex items-center gap-2 lg:gap-4">
            {/* Search shortcut hint */}
            <button
              className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
              onClick={() => {
                // TODO: Open search modal
              }}
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search</span>
              <Badge variant="outline" className="ml-1 hidden sm:flex">
                <Command className="h-3 w-3" />K
              </Badge>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

interface SidebarLinkProps {
  to: string
  icon: ReactNode
  children: ReactNode
  onClick?: () => void
}

function SidebarLink({
  to,
  icon,
  children,
  onClick,
}: SidebarLinkProps): React.ReactElement {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-4 rounded-md px-4 py-2 text-muted-foreground no-underline transition-colors",
          "hover:bg-accent hover:text-foreground",
          isActive && "bg-accent text-foreground"
        )
      }
    >
      {icon}
      <span>{children}</span>
    </NavLink>
  )
}
