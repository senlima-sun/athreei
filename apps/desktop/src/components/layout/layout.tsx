import { Outlet, useLocation } from "react-router-dom"
import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from "react"
import {
  Home,
  FolderOpen,
  Settings,
  Menu,
  X,
  Search,
  Database,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useVaultStatus, useVaultIsSetup } from "@/hooks"
import { UnlockScreen } from "@/components/unlock-screen"
import { FullPageLoading } from "@/components/common/loading-spinner"
import { FullPageError } from "@/components/common/error-display"
import { SearchDialog } from "@/components/search-dialog"
import { SidebarLink } from "./sidebar-link"

interface HeaderConfig {
  title?: ReactNode
  actions?: ReactNode
}

interface LayoutContextValue {
  setHeader: (config: HeaderConfig | null) => void
}

const LayoutContext = createContext<LayoutContextValue | null>(null)

export function useLayoutHeader(config: HeaderConfig | null): void {
  const context = useContext(LayoutContext)
  useEffect(() => {
    context?.setHeader(config)
    return () => context?.setHeader(null)
  }, [context, config])
}

export function Layout(): React.ReactElement {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [mcpConnected, setMcpConnected] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [headerConfig, setHeaderConfig] = useState<HeaderConfig | null>(null)

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

  const getPageTitle = (): string => {
    if (location.pathname === "/") return "Today"
    if (location.pathname === "/memories") return "All Memories"
    if (location.pathname.startsWith("/memories/")) return "Memory"
    if (location.pathname === "/spaces") return "Spaces"
    if (location.pathname.startsWith("/spaces/")) return "Space"
    if (location.pathname === "/settings") return "Settings"
    return "aiii"
  }

  const closeSidebar = (): void => setSidebarOpen(false)

  const openSearch = useCallback((): void => {
    setSearchOpen(true)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        openSearch()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [openSearch])

  useEffect(() => {
    const checkMcpStatus = async (): Promise<void> => {
      setMcpConnected(true)
    }
    checkMcpStatus()
  }, [])

  useEffect(() => {
    setHeaderConfig(null)
  }, [location.pathname])

  if (isStatusLoading || isSetupLoading) {
    return <FullPageLoading message="Checking vault status..." />
  }

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

  if (!isUnlocked) {
    return <UnlockScreen isFirstTime={!isSetup} />
  }

  const contextValue: LayoutContextValue = {
    setHeader: setHeaderConfig,
  }

  return (
    <LayoutContext.Provider value={contextValue}>
      <div className="dark flex h-screen bg-background text-foreground">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={closeSidebar}
          />
        )}

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-48 flex-col bg-surface px-3 py-4 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <button
            onClick={closeSidebar}
            className="absolute right-2 top-2 rounded p-1.5 hover:bg-accent lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="mb-4 px-2">
            <h2 className="m-0 text-sm font-semibold">aiii</h2>
            <p className="m-0 text-xs text-muted-foreground">Memory Engine</p>
          </div>

          <nav className="flex-1 space-y-0.5">
            <SidebarLink
              to="/"
              icon={<Home className="h-4 w-4" />}
              onClick={closeSidebar}
            >
              Today
            </SidebarLink>
            <SidebarLink
              to="/memories"
              icon={<Database className="h-4 w-4" />}
              onClick={closeSidebar}
            >
              All Memories
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

          <div className="mt-auto px-2 pt-3">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  mcpConnected ? "bg-green-500" : "bg-red-500"
                )}
              />
              <span className="text-xs text-muted-foreground">
                {mcpConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <p className="m-0 mt-1 text-xs text-muted-foreground/60">v0.1.0</p>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 bg-surface px-4 py-2.5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="-ml-1.5 shrink-0 rounded p-1.5 hover:bg-accent lg:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-4 w-4" />
            </button>

            {headerConfig?.title ? (
              <div className="min-w-0 flex-1">{headerConfig.title}</div>
            ) : (
              <h1 className="m-0 min-w-0 flex-1 truncate text-sm font-medium">
                {getPageTitle()}
              </h1>
            )}

            {headerConfig?.actions && (
              <div className="flex shrink-0 items-center gap-1">
                {headerConfig.actions}
              </div>
            )}

            <button
              className="flex shrink-0 items-center gap-1.5 rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
              onClick={openSearch}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="ml-1 hidden rounded bg-background px-1 text-[10px] sm:inline">
                ⌘K
              </kbd>
            </button>
          </header>

          <main className="flex-1 overflow-y-auto p-3 lg:p-4">
            <Outlet />
          </main>
        </div>

        <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </LayoutContext.Provider>
  )
}
