import type { ReactNode } from "react"
import { Menu, Search } from "lucide-react"

export interface HeaderConfig {
  title?: ReactNode
  actions?: ReactNode
}

interface HeaderProps {
  headerConfig: HeaderConfig | null
  pageTitle: string
  onOpenSidebar: () => void
  onOpenSearch: () => void
}

export function Header({
  headerConfig,
  pageTitle,
  onOpenSidebar,
  onOpenSearch,
}: HeaderProps): React.ReactElement {
  return (
    <header className="flex items-center gap-3 bg-surface px-4 py-2.5">
      <button
        onClick={onOpenSidebar}
        className="-ml-1.5 shrink-0 rounded p-1.5 hover:bg-accent lg:hidden"
        aria-label="Open sidebar"
      >
        <Menu className="h-4 w-4" />
      </button>

      {headerConfig?.title ? (
        <div className="min-w-0 flex-1">{headerConfig.title}</div>
      ) : (
        <h1 className="m-0 min-w-0 flex-1 truncate text-sm font-medium">
          {pageTitle}
        </h1>
      )}

      {headerConfig?.actions && (
        <div className="flex shrink-0 items-center gap-1">
          {headerConfig.actions}
        </div>
      )}

      <button
        className="flex shrink-0 items-center gap-1.5 rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
        onClick={onOpenSearch}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="ml-1 hidden rounded bg-background px-1 text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>
    </header>
  )
}
