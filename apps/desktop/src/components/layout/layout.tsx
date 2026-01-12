import { Outlet, useLocation } from "react-router-dom"
import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react"
import { useVaultStatus, useVaultIsSetup } from "@/hooks"
import { UnlockScreen } from "@/components/unlock-screen"
import { FullPageLoading } from "@/components/common/loading-spinner"
import { FullPageError } from "@/components/common/error-display"
import { SearchDialog } from "@/components/search-dialog"
import { Sidebar } from "./sidebar"
import { Header, type HeaderConfig } from "./header"

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
      <div className="flex h-screen bg-background text-foreground">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={closeSidebar}
          />
        )}

        <Sidebar
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          mcpConnected={mcpConnected}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header
            headerConfig={headerConfig}
            pageTitle={getPageTitle()}
            onOpenSidebar={() => setSidebarOpen(true)}
            onOpenSearch={openSearch}
          />

          <main className="flex-1 overflow-y-auto p-3 lg:p-4">
            <Outlet />
          </main>
        </div>

        <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </LayoutContext.Provider>
  )
}
