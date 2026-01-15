"use client"

import Link from "next/link"
import { Scale, Settings, ToggleLeft, ToggleRight, Globe, Boxes, Server } from "lucide-react"
import type { Rule, RuleScope } from "@/types"

const SCOPE_ICONS: Record<RuleScope, React.ComponentType<{ className?: string }>> = {
  global: Globe,
  namespace: Boxes,
  endpoint: Server,
}

const SCOPE_LABELS: Record<RuleScope, string> = {
  global: "Global",
  namespace: "Namespace",
  endpoint: "Endpoint",
}

interface RuleCardProps {
  rule: Rule
  href?: string
  showActions?: boolean
  onToggle?: (id: string, enabled: boolean) => void
}

export function RuleCard({
  rule,
  href,
  showActions = true,
  onToggle,
}: RuleCardProps) {
  const ScopeIcon = SCOPE_ICONS[rule.scope]

  const CardContent = () => (
    <>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
            <Scale className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{rule.name}</h3>
            {rule.description && (
              <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">
                {rule.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Enabled badge */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              rule.isEnabled
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                rule.isEnabled ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            {rule.isEnabled ? "Enabled" : "Disabled"}
          </span>

          {/* Scope badge */}
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
            <ScopeIcon className="h-3 w-3" />
            {SCOPE_LABELS[rule.scope]}
          </span>

          {/* Priority badge */}
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            #{rule.priority}
          </span>
        </div>
      </div>

      {/* Content preview */}
      <div className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600 line-clamp-2">
        {rule.content.substring(0, 150)}
        {rule.content.length > 150 && "..."}
      </div>

      {showActions && (
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          {onToggle && (
            <button
              type="button"
              onClick={() => onToggle(rule.id, !rule.isEnabled)}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
            >
              {rule.isEnabled ? (
                <ToggleRight className="h-4 w-4 text-green-600" />
              ) : (
                <ToggleLeft className="h-4 w-4 text-gray-400" />
              )}
              {rule.isEnabled ? "Disable" : "Enable"}
            </button>
          )}
          {href && (
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <Settings className="h-4 w-4" />
              Edit
            </Link>
          )}
        </div>
      )}
    </>
  )

  if (href && !showActions) {
    return (
      <Link
        href={href}
        className="block rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 hover:bg-gray-50"
      >
        <CardContent />
      </Link>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <CardContent />
    </div>
  )
}

interface RuleCardGridProps {
  rules: Rule[]
  baseHref?: string
  showActions?: boolean
  onToggle?: (id: string, enabled: boolean) => void
}

export function RuleCardGrid({
  rules,
  baseHref,
  showActions = true,
  onToggle,
}: RuleCardGridProps) {
  return (
    <div className="space-y-4">
      {rules.map((rule) => (
        <RuleCard
          key={rule.id}
          rule={rule}
          href={baseHref ? `${baseHref}/${rule.id}` : undefined}
          showActions={showActions}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}
