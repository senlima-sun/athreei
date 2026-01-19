"use client"

import { Server, Sparkles, Webhook, Terminal, Bot } from "lucide-react"
import { cn } from "@/lib/utils"
import type {
  PluginComponentType,
  PluginComponentSummary,
} from "@/types/marketplace"

const componentTypeConfig: Record<
  PluginComponentType,
  { icon: typeof Server; label: string }
> = {
  mcp_server: { icon: Server, label: "MCP Server" },
  skill: { icon: Sparkles, label: "Skill" },
  hook: { icon: Webhook, label: "Hook" },
  command: { icon: Terminal, label: "Command" },
  agent: { icon: Bot, label: "Agent" },
}

interface ComponentsSummaryProps {
  components: PluginComponentSummary[]
  className?: string
  showLabels?: boolean
}

export function ComponentsSummary({
  components,
  className,
  showLabels = false,
}: ComponentsSummaryProps) {
  const componentCounts = components.reduce<Record<string, number>>(
    (acc, component) => {
      const type = component.type as PluginComponentType
      acc[type] = (acc[type] || 0) + 1
      return acc
    },
    {}
  )

  const entries = Object.entries(componentCounts).filter(
    ([type]) => type in componentTypeConfig
  )

  if (entries.length === 0) {
    return null
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      {entries.map(([type, count]) => {
        const config = componentTypeConfig[type as PluginComponentType]
        const Icon = config.icon

        return (
          <div
            key={type}
            className="flex items-center gap-1.5 text-sm text-gray-600"
            title={`${count} ${config.label}${count > 1 ? "s" : ""}`}
          >
            <Icon className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{count}</span>
            {showLabels && (
              <span className="text-gray-500">
                {config.label}
                {count > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface ComponentsListProps {
  components: PluginComponentSummary[]
  className?: string
}

export function ComponentsList({ components, className }: ComponentsListProps) {
  if (components.length === 0) {
    return <p className="text-sm text-gray-500">No components</p>
  }

  return (
    <div className={cn("space-y-2", className)}>
      {components.map((component) => {
        const config =
          componentTypeConfig[component.type as PluginComponentType]
        if (!config) return null
        const Icon = config.icon

        return (
          <div
            key={component.id}
            className="flex items-start gap-2 rounded-md border border-gray-100 bg-gray-50 p-2"
          >
            <Icon className="mt-0.5 h-4 w-4 text-gray-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {component.name}
              </p>
              {component.description && (
                <p className="truncate text-xs text-gray-500">
                  {component.description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
