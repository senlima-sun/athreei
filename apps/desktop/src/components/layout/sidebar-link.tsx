import { NavLink } from "react-router-dom"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SidebarLinkProps {
  to: string
  icon: ReactNode
  children: ReactNode
  onClick?: () => void
}

export function SidebarLink({
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
          "flex items-center gap-2.5 rounded px-2 py-1.5 text-xs text-muted-foreground no-underline transition-colors",
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
