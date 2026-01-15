"use client"

import { useState } from "react"
import {
  Scale,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Globe,
  Boxes,
  Server,
} from "lucide-react"
import type { RuleScope } from "@/types"

const SCOPE_ICONS: Record<
  RuleScope,
  React.ComponentType<{ className?: string }>
> = {
  global: Globe,
  namespace: Boxes,
  endpoint: Server,
}

const SCOPE_LABELS: Record<RuleScope, string> = {
  global: "Global",
  namespace: "Namespace",
  endpoint: "Endpoint",
}

export interface NamespaceRule {
  id: string
  ruleId: string
  name: string
  description?: string | null
  scope: RuleScope
  priority: number
  enabled: boolean
}

interface NamespaceRuleListProps {
  rules: NamespaceRule[]
  onRemove: (ruleId: string) => Promise<void>
  onToggleEnabled: (ruleId: string, enabled: boolean) => Promise<void>
}

export function NamespaceRuleList({
  rules,
  onRemove,
  onToggleEnabled,
}: NamespaceRuleListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const handleRemove = async (ruleId: string) => {
    setRemovingId(ruleId)
    try {
      await onRemove(ruleId)
    } finally {
      setRemovingId(null)
      setConfirmRemoveId(null)
    }
  }

  const handleToggle = async (ruleId: string, currentEnabled: boolean) => {
    setTogglingId(ruleId)
    try {
      await onToggleEnabled(ruleId, !currentEnabled)
    } finally {
      setTogglingId(null)
    }
  }

  if (rules.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
        <Scale className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No rules in this namespace
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Add rules to this namespace to define AI behavior guidelines.
        </p>
      </div>
    )
  }

  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority)

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <ul className="divide-y divide-gray-200">
        {sortedRules.map((rule) => {
          const ScopeIcon = SCOPE_ICONS[rule.scope]
          return (
            <li key={rule.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                    <Scale className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{rule.name}</p>
                      {!rule.enabled && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
                        <ScopeIcon className="h-3 w-3" />
                        {SCOPE_LABELS[rule.scope]}
                      </span>
                      <span className="text-xs text-gray-400">
                        Priority #{rule.priority}
                      </span>
                      {rule.description && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span className="line-clamp-1">
                            {rule.description}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(rule.ruleId, rule.enabled)}
                    disabled={togglingId === rule.ruleId}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                    title={rule.enabled ? "Disable rule" : "Enable rule"}
                  >
                    {togglingId === rule.ruleId ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : rule.enabled ? (
                      <ToggleRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>

                  {confirmRemoveId === rule.ruleId ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleRemove(rule.ruleId)}
                        disabled={removingId === rule.ruleId}
                        className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {removingId === rule.ruleId ? "..." : "Confirm"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveId(null)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveId(rule.ruleId)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                      title="Remove from namespace"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
