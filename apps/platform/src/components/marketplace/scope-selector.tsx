"use client"

import { Building2, User } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PluginInstallationScope } from "@/types/marketplace"

interface ScopeSelectorProps {
  value: PluginInstallationScope
  onChange: (scope: PluginInstallationScope) => void
  orgName?: string
  canInstallForOrg?: boolean
  disabled?: boolean
}

interface ScopeOption {
  value: PluginInstallationScope
  label: string
  description: string
  icon: React.ElementType
}

const scopeOptions: ScopeOption[] = [
  {
    value: "organization",
    label: "Organization",
    description: "Available to all members of the organization",
    icon: Building2,
  },
  {
    value: "user",
    label: "Personal",
    description: "Only available to you",
    icon: User,
  },
]

export function ScopeSelector({
  value,
  onChange,
  orgName,
  canInstallForOrg = true,
  disabled = false,
}: ScopeSelectorProps) {
  return (
    <div className="space-y-3">
      <fieldset disabled={disabled}>
        <legend className="text-sm font-medium text-gray-700">
          Installation scope
        </legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {scopeOptions.map((option) => {
            const isOrgOption = option.value === "organization"
            const isDisabled = disabled || (isOrgOption && !canInstallForOrg)
            const isSelected = value === option.value
            const Icon = option.icon

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => !isDisabled && onChange(option.value)}
                disabled={isDisabled}
                className={cn(
                  "relative flex flex-col items-start rounded-lg border p-3 text-left transition-colors",
                  isSelected
                    ? "border-gray-900 bg-gray-50 ring-1 ring-gray-900"
                    : "border-gray-200 hover:border-gray-300",
                  isDisabled &&
                    "cursor-not-allowed opacity-50 hover:border-gray-200"
                )}
                aria-pressed={isSelected}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md",
                      isSelected ? "bg-gray-900 text-white" : "bg-gray-100"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {isOrgOption && orgName ? orgName : option.label}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">
                  {option.description}
                </p>
                {isOrgOption && !canInstallForOrg && (
                  <p className="mt-1 text-xs text-amber-600">
                    Admin permission required
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </fieldset>
    </div>
  )
}
