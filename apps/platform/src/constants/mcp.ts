import { Terminal, Radio, Globe } from "lucide-react"

/**
 * MCP transport type icons
 */
export const TRANSPORT_ICONS = {
  stdio: Terminal,
  sse: Radio,
  http: Globe,
} as const

/**
 * Human-readable transport labels
 */
export const TRANSPORT_LABELS = {
  stdio: "STDIO",
  sse: "SSE",
  http: "HTTP",
} as const

/**
 * Status badge styles for MCP servers
 */
export const STATUS_STYLES = {
  active: {
    bg: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  inactive: {
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
  },
  error: {
    bg: "bg-red-100",
    text: "text-red-700",
    dot: "bg-red-500",
  },
} as const

export type TransportType = keyof typeof TRANSPORT_ICONS
export type ServerStatus = keyof typeof STATUS_STYLES
