"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href: string
}

const segmentLabels: Record<string, string> = {
  dashboard: "Dashboard",
  mcps: "MCPs",
  traces: "Traces",
  organizations: "Organizations",
  settings: "Settings",
  new: "New",
  members: "Members",
  profile: "Profile",
}

export function Breadcrumbs() {
  const pathname = usePathname()

  const segments = pathname.split("/").filter(Boolean)

  const breadcrumbs: BreadcrumbItem[] = []
  let currentPath = ""

  for (const segment of segments) {
    currentPath += `/${segment}`

    // Skip dynamic segments like [id] - they'll be handled specially
    if (segment.startsWith("[") && segment.endsWith("]")) {
      continue
    }

    const isUuid = /^[0-9a-f-]{36}$/i.test(segment)

    breadcrumbs.push({
      label: isUuid ? "Details" : segmentLabels[segment] || segment,
      href: currentPath,
    })
  }

  // Don't show breadcrumbs for just "/dashboard"
  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <Link
        href="/dashboard"
        className="flex items-center text-gray-500 hover:text-gray-700"
      >
        <Home className="h-4 w-4" />
      </Link>

      {breadcrumbs.slice(1).map((item, index) => (
        <div key={item.href} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4 text-gray-400" />
          {index === breadcrumbs.length - 2 ? (
            <span className="font-medium text-gray-900">{item.label}</span>
          ) : (
            <Link
              href={item.href}
              className="text-gray-500 hover:text-gray-700"
            >
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
