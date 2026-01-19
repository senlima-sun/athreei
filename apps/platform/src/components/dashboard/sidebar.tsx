"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Server,
  Boxes,
  Activity,
  Users,
  Settings,
  Menu,
  X,
  Globe,
  HardDrive,
  FileText,
  Shield,
  BookOpen,
  Scale,
  BarChart3,
  Store,
  Puzzle,
} from "lucide-react"
import { useState } from "react"
import { OrgSwitcher } from "./org-switcher"
import { isLocalMode } from "@/lib/mode"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavSection {
  title?: string
  items: NavItem[]
}

// Shared items available in both modes
const sharedItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Traces", href: "/dashboard/traces", icon: Activity },
  { label: "Servers", href: "/dashboard/servers", icon: Server },
  { label: "Logs", href: "/dashboard/logs", icon: FileText },
  { label: "Permissions", href: "/dashboard/permissions", icon: Shield },
  { label: "Sessions", href: "/dashboard/sessions", icon: Users },
]

const settingsItem: NavItem = {
  label: "Settings",
  href: "/dashboard/settings",
  icon: Settings,
}

// Build navigation sections based on mode
const getNavSections = (): NavSection[] => {
  if (isLocalMode()) {
    return [{ items: sharedItems }, { items: [settingsItem] }]
  }

  return [
    { items: [{ label: "Home", href: "/dashboard", icon: Home }] },
    {
      title: "MCP",
      items: [
        { label: "Registry", href: "/dashboard/registry", icon: Globe },
        {
          label: "My Servers",
          href: "/dashboard/mcp-servers",
          icon: HardDrive,
        },
        { label: "Namespaces", href: "/dashboard/namespaces", icon: Boxes },
        { label: "Endpoints", href: "/dashboard/endpoints", icon: Server },
      ],
    },
    {
      title: "Marketplace",
      items: [
        { label: "Marketplace", href: "/dashboard/marketplace", icon: Store },
        {
          label: "Installed Plugins",
          href: "/dashboard/plugins",
          icon: Puzzle,
        },
      ],
    },
    {
      title: "AI Config",
      items: [
        { label: "Skills", href: "/dashboard/skills", icon: BookOpen },
        { label: "Rules", href: "/dashboard/rules", icon: Scale },
        { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
      ],
    },
    {
      items: [
        { label: "Traces", href: "/dashboard/traces", icon: Activity },
        { label: "Team", href: "/dashboard/organizations", icon: Users },
        { label: "Settings", href: "/dashboard/settings", icon: Settings },
        {
          label: "Marketplace Settings",
          href: "/dashboard/settings/marketplace",
          icon: Store,
        },
      ],
    },
  ]
}

export function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navSections = getNavSections()
  const localMode = isLocalMode()

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard"
    }
    return pathname.startsWith(href)
  }

  const NavLink = ({ item }: { item: NavItem }) => {
    const Icon = item.icon
    const active = isActive(item.href)

    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          active
            ? "bg-gray-100 text-gray-900"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        <Icon className="h-5 w-5" />
        {item.label}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed left-4 top-4 z-50 rounded-md p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo and org switcher */}
          <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-4">
            <Link
              href="/dashboard"
              className="text-xl font-bold text-gray-900"
              onClick={() => setMobileOpen(false)}
            >
              athreei
            </Link>
            <div className="ml-auto">
              <OrgSwitcher />
            </div>
          </div>

          {/* Local mode indicator */}
          {localMode && (
            <div className="mx-3 mt-3 rounded-md bg-amber-100 px-3 py-1.5 text-center text-xs font-medium text-amber-800">
              Local Mode
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 space-y-6 px-3 py-4">
            {navSections.map((section, index) => (
              <div key={index}>
                {section.title && (
                  <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    {section.title}
                  </p>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <NavLink key={item.href} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-gray-200 p-4">
            <p className="text-xs text-gray-500">
              Privacy-focused MCP platform
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
