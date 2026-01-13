import { X, Home, Database, FolderOpen, Briefcase, Settings, Sparkles } from "lucide-react"
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
        "fixed inset-y-0 left-0 z-50 flex w-52 flex-col border-r border-border/50 bg-surface px-3 py-4 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <button
        onClick={onClose}
        className="absolute right-2 top-2 rounded-md p-1.5 transition-colors hover:bg-accent lg:hidden"
        aria-label="Close sidebar"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="mb-6 flex items-center gap-2.5 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h2 className="m-0 text-sm font-semibold tracking-tight">aiii</h2>
          <p className="m-0 text-[11px] text-muted-foreground">Memory Engine</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
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
          to="/workspaces"
          icon={<Briefcase className="h-4 w-4" />}
          onClick={onClose}
        >
          Workspaces
        </SidebarLink>
        <SidebarLink
          to="/settings"
          icon={<Settings className="h-4 w-4" />}
          onClick={onClose}
        >
          Settings
        </SidebarLink>
      </nav>

      <div className="mt-auto space-y-3 px-2 pt-4">
        <div className="flex items-center gap-2 rounded-md bg-card/50 px-2.5 py-2">
          <div className="relative flex h-2 w-2 items-center justify-center">
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                mcpConnected ? "bg-emerald-400" : "bg-red-400"
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                mcpConnected ? "bg-emerald-500" : "bg-red-500"
              )}
            />
          </div>
          <span className="text-[11px] text-muted-foreground">
            {mcpConnected ? "MCP Connected" : "Disconnected"}
          </span>
        </div>
        <p className="m-0 text-center text-[10px] text-muted-foreground/50">
          v0.1.0
        </p>
      </div>
    </aside>
  )
}
