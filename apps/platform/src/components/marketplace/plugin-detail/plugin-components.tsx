"use client"

import {
  Server,
  Sparkles,
  Terminal,
  Webhook,
  Bot,
  ChevronRight,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type {
  PluginComponentSummary,
  PluginComponentType,
} from "@/types/marketplace"

interface PluginComponentsProps {
  components: PluginComponentSummary[]
}

const componentTypeConfig: Record<
  PluginComponentType | string,
  {
    label: string
    icon: typeof Server
    color: string
    bgColor: string
  }
> = {
  mcp_server: {
    label: "MCP Servers",
    icon: Server,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  skill: {
    label: "Skills",
    icon: Sparkles,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  hook: {
    label: "Hooks",
    icon: Webhook,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  command: {
    label: "Commands",
    icon: Terminal,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  agent: {
    label: "Agents",
    icon: Bot,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
}

function getComponentConfig(type: PluginComponentType | string) {
  return (
    componentTypeConfig[type] || {
      label: type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " "),
      icon: Server,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
    }
  )
}

function groupComponentsByType(
  components: PluginComponentSummary[]
): Map<string, PluginComponentSummary[]> {
  const groups = new Map<string, PluginComponentSummary[]>()

  components.forEach((component) => {
    const type = component.type
    if (!groups.has(type)) {
      groups.set(type, [])
    }
    groups.get(type)!.push(component)
  })

  return groups
}

export function PluginComponents({ components }: PluginComponentsProps) {
  if (!components || components.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <p className="text-center text-gray-500">
          No components found in this plugin.
        </p>
      </div>
    )
  }

  const groupedComponents = groupComponentsByType(components)

  return (
    <div className="space-y-6">
      {Array.from(groupedComponents.entries()).map(([type, items]) => {
        const config = getComponentConfig(type)
        const Icon = config.icon

        return (
          <div
            key={type}
            className="rounded-xl border border-gray-200 bg-white p-6"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.bgColor}`}
              >
                <Icon className={`h-5 w-5 ${config.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{config.label}</h3>
                <p className="text-sm text-gray-500">
                  {items.length}{" "}
                  {items.length === 1 ? "component" : "components"}
                </p>
              </div>
            </div>

            <div className="mt-4 divide-y divide-gray-100">
              {items.map((component) => (
                <ComponentItem key={component.id} component={component} />
              ))}
            </div>
          </div>
        )
      })}

      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h3 className="font-semibold text-gray-900">Component Summary</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from(groupedComponents.entries()).map(([type, items]) => {
            const config = getComponentConfig(type)
            return (
              <Badge
                key={type}
                variant="secondary"
                className={`${config.bgColor} ${config.color}`}
              >
                {items.length} {config.label}
              </Badge>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ComponentItem({ component }: { component: PluginComponentSummary }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{component.name}</span>
        </div>
        {component.description && (
          <p className="mt-1 text-sm text-gray-600">{component.description}</p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
    </div>
  )
}
