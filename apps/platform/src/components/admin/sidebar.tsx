"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import {
  CheckCircle,
  LayoutDashboard,
  Puzzle,
  Store,
  Users,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useAdminPermissions } from "@/hooks/use-admin-permissions"

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  show: boolean
  exact?: boolean
}

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AdminSidebar() {
  const pathname = usePathname()
  const { canManageUsers, hasAnyAdminAccess } = useAdminPermissions()

  const navItems: NavItem[] = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: LayoutDashboard,
      show: hasAnyAdminAccess,
      exact: true,
    },
    {
      href: "/admin/users",
      label: "Users",
      icon: Users,
      show: canManageUsers,
    },
    {
      href: "/admin/marketplaces",
      label: "Marketplaces",
      icon: Store,
      show: hasAnyAdminAccess,
    },
    {
      href: "/admin/plugins",
      label: "Plugins",
      icon: Puzzle,
      show: hasAnyAdminAccess,
    },
    {
      href: "/admin/approvals",
      label: "Approvals",
      icon: CheckCircle,
      show: hasAnyAdminAccess,
    },
  ]

  const visibleItems = navItems.filter((item) => item.show)

  return (
    <aside className="w-64 border-r bg-muted/40">
      <div className="p-4 border-b">
        <h1 className="font-bold text-lg">Admin Panel</h1>
      </div>
      <nav className="p-4 space-y-2">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const active = isActive(pathname, item.href, item.exact)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
