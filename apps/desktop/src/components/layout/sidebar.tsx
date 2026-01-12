import { X, Home, Database, FolderOpen, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { SidebarLink } from "./sidebar-link"

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  mcpConnected: boolean
}

export function Sidebar({
  isOpen,
  onClose,
  mcpConnected,
}: SidebarProps): React.ReactElement {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-48 flex-col bg-surface px-3 py-4 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <button
        onClick={onClose}
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
          onClick={onClose}
        >
          Today
        </SidebarLink>
        <SidebarLink
          to="/memories"
          icon={<Database className="h-4 w-4" />}
          onClick={onClose}
        >
          All Memories
        </SidebarLink>
        <SidebarLink
          to="/spaces"
          icon={<FolderOpen className="h-4 w-4" />}
          onClick={onClose}
        >
          Spaces
        </SidebarLink>
        <SidebarLink
          to="/settings"
          icon={<Settings className="h-4 w-4" />}
          onClick={onClose}
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
  )
}
