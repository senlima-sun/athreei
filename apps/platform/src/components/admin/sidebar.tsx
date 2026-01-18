"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAdminPermissions } from "@/hooks/use-admin-permissions"

interface NavItem {
  href: string
  label: string
  show: boolean
}

export function AdminSidebar() {
  const pathname = usePathname()
  const { canManageUsers, hasAnyAdminAccess } = useAdminPermissions()

  const navItems: NavItem[] = [
    { href: "/admin", label: "Dashboard", show: hasAnyAdminAccess },
    { href: "/admin/users", label: "Users", show: canManageUsers },
  ]

  const visibleItems = navItems.filter((item) => item.show)

  return (
    <aside className="w-64 border-r bg-muted/40">
      <div className="p-4 border-b">
        <h1 className="font-bold text-lg">Admin Panel</h1>
      </div>
      <nav className="p-4 space-y-2">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
