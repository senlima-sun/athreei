"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  className?: string
  showHome?: boolean
  homeHref?: string
  labels?: Record<string, string>
}

const DEFAULT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  settings: "Settings",
  profile: "Profile",
  marketplace: "Marketplace",
  skills: "Skills",
  rules: "Rules",
  endpoints: "Endpoints",
  namespaces: "Namespaces",
  traces: "Traces",
  analytics: "Analytics",
  logs: "Logs",
  sessions: "Sessions",
  servers: "Servers",
  permissions: "Permissions",
  organizations: "Organizations",
  plugins: "Plugins",
  registry: "Registry",
  "mcp-servers": "MCP Servers",
  new: "New",
  configure: "Configure",
  members: "Members",
}

function formatLabel(
  segment: string,
  customLabels?: Record<string, string>
): string {
  const allLabels = { ...DEFAULT_LABELS, ...customLabels }
  if (allLabels[segment]) {
    return allLabels[segment]
  }
  return segment
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function generateBreadcrumbs(
  pathname: string,
  customLabels?: Record<string, string>
): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean)
  const items: BreadcrumbItem[] = []
  let currentPath = ""

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    if (!segment) continue

    currentPath += `/${segment}`
    const isLast = i === segments.length - 1
    const isId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment)

    if (isId) {
      continue
    }

    items.push({
      label: formatLabel(segment, customLabels),
      href: isLast ? undefined : currentPath,
    })
  }

  return items
}

export function Breadcrumbs({
  items,
  className,
  showHome = true,
  homeHref = "/dashboard",
  labels,
}: BreadcrumbsProps) {
  const pathname = usePathname()
  const breadcrumbItems = items ?? generateBreadcrumbs(pathname, labels)

  if (breadcrumbItems.length <= 1 && !showHome) {
    return null
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1 text-sm", className)}
    >
      {showHome && (
        <>
          <Link
            href={homeHref}
            className="flex items-center text-gray-500 transition-colors hover:text-gray-700"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
          {breadcrumbItems.length > 0 && (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </>
      )}

      {breadcrumbItems.map((item, index) => {
        const isLast = index === breadcrumbItems.length - 1
        const key = `${item.href ?? item.label}-${index}`
        return (
          <span key={key} className="flex items-center gap-1">
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="text-gray-500 transition-colors hover:text-gray-700"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className="font-medium text-gray-900"
                aria-current={isLast ? "page" : undefined}
              >
                {item.label}
              </span>
            )}
            {!isLast && <ChevronRight className="h-4 w-4 text-gray-400" />}
          </span>
        )
      })}
    </nav>
  )
}
