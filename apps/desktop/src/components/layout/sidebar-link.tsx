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
          "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-muted-foreground no-underline transition-all duration-150",
          "hover:bg-accent/60 hover:text-foreground",
          isActive && "bg-brand-light text-brand-dark font-medium"
        )
      }
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center transition-transform duration-150 group-hover:scale-110"
        )}
      >
        {icon}
      </span>
      <span>{children}</span>
    </NavLink>
  )
}
