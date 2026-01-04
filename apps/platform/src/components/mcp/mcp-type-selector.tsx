"use client"

import { Terminal, Radio, Globe } from "lucide-react"

export type McpTransportType = "stdio" | "sse" | "http"

interface TransportOption {
  value: McpTransportType
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const transportOptions: TransportOption[] = [
  {
    value: "stdio",
    label: "STDIO",
    description: "Local process communication via stdin/stdout",
    icon: Terminal,
  },
  {
    value: "sse",
    label: "SSE",
    description: "Server-Sent Events for real-time streaming",
    icon: Radio,
  },
  {
    value: "http",
    label: "HTTP",
    description: "Standard HTTP request/response protocol",
    icon: Globe,
  },
]

interface McpTypeSelectorProps {
  value: McpTransportType
  onChange: (value: McpTransportType) => void
  disabled?: boolean
}

export function McpTypeSelector({
  value,
  onChange,
  disabled = false,
}: McpTypeSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {transportOptions.map((option) => {
        const Icon = option.icon
        const isSelected = value === option.value

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-colors ${
              isSelected
                ? "border-gray-900 bg-gray-50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          >
            <Icon
              className={`h-6 w-6 ${isSelected ? "text-gray-900" : "text-gray-400"}`}
            />
            <div>
              <p
                className={`text-sm font-medium ${isSelected ? "text-gray-900" : "text-gray-700"}`}
              >
                {option.label}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                {option.description}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
