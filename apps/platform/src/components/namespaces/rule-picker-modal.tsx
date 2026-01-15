"use client"

import { useState } from "react"
import {
  X,
  Scale,
  Search,
  Plus,
  Check,
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

export interface PickerRule {
  id: string
  name: string
  description?: string | null
  scope: RuleScope
  priority: number
  isEnabled: boolean
}

interface RulePickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (ruleId: string) => Promise<void>
  availableRules: PickerRule[]
  excludeRuleIds?: string[]
}

export function RulePickerModal({
  isOpen,
  onClose,
  onSelect,
  availableRules,
  excludeRuleIds = [],
}: RulePickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdding, setIsAdding] = useState<string | null>(null)

  if (!isOpen) return null

  const filteredRules = availableRules.filter(
    (rule) =>
      !excludeRuleIds.includes(rule.id) &&
      (rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rule.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleSelect = async (ruleId: string) => {
    setIsAdding(ruleId)
    try {
      await onSelect(ruleId)
    } finally {
      setIsAdding(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Rule</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules by name or description..."
              className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {filteredRules.length === 0 ? (
            <div className="p-8 text-center">
              <Scale className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-sm font-medium text-gray-900">
                {searchQuery
                  ? "No rules match your search"
                  : "No rules available"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery
                  ? "Try a different search term"
                  : "All rules are already in this namespace"}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredRules.map((rule) => {
                const ScopeIcon = SCOPE_ICONS[rule.scope]
                return (
                  <li
                    key={rule.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                        <Scale className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{rule.name}</p>
                        {rule.description && (
                          <p className="text-sm text-gray-500 line-clamp-1">
                            {rule.description}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-1.5 py-0.5 text-xs text-purple-700">
                            <ScopeIcon className="h-2.5 w-2.5" />
                            {SCOPE_LABELS[rule.scope]}
                          </span>
                          <span className="text-xs text-gray-400">
                            Priority #{rule.priority}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelect(rule.id)}
                      disabled={isAdding === rule.id}
                      className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isAdding === rule.id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      Add
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-gray-200 p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
