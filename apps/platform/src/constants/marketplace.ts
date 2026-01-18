import {
  Code2,
  Globe,
  Brain,
  Palette,
  Wrench,
  TrendingUp,
  Clock,
  SortAsc,
  Building2,
  User,
  Server,
  Sparkles,
  Webhook,
  Terminal,
  Bot,
} from "lucide-react"

/**
 * Marketplace category definitions
 */
export const MARKETPLACE_CATEGORIES = {
  development_workflows: {
    icon: Code2,
    label: "Development Workflows",
    description: "Tools for coding, debugging, and CI/CD",
  },
  external_integrations: {
    icon: Globe,
    label: "External Integrations",
    description: "Connect to third-party services and APIs",
  },
  code_intelligence: {
    icon: Brain,
    label: "Code Intelligence",
    description: "Code analysis, suggestions, and insights",
  },
  output_styles: {
    icon: Palette,
    label: "Output Styles",
    description: "Formatting, styling, and presentation",
  },
  utilities: {
    icon: Wrench,
    label: "Utilities",
    description: "General-purpose helper tools",
  },
} as const

/**
 * Sort options for marketplace listings
 */
export const MARKETPLACE_SORT_OPTIONS = {
  popular: {
    icon: TrendingUp,
    label: "Popular",
    field: "downloadCount",
    direction: "desc",
  },
  recent: {
    icon: Clock,
    label: "Recent",
    field: "createdAt",
    direction: "desc",
  },
  name: {
    icon: SortAsc,
    label: "Name",
    field: "name",
    direction: "asc",
  },
} as const

/**
 * Installation status styles for marketplace plugins
 */
export const INSTALLATION_STATUS_STYLES = {
  active: {
    bg: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-500",
    label: "Active",
  },
  disabled: {
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
    label: "Disabled",
  },
  pending: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    dot: "bg-yellow-500",
    label: "Pending",
  },
  error: {
    bg: "bg-red-100",
    text: "text-red-700",
    dot: "bg-red-500",
    label: "Error",
  },
} as const

/**
 * Scope labels and icons for marketplace plugins
 */
export const MARKETPLACE_SCOPES = {
  organization: {
    icon: Building2,
    label: "Organization",
    description: "Available to all organization members",
  },
  user: {
    icon: User,
    label: "Personal",
    description: "Only visible to you",
  },
} as const

/**
 * Component type icons and labels
 */
export const COMPONENT_TYPES = {
  mcp_server: {
    icon: Server,
    label: "MCP Server",
    description: "Model Context Protocol server",
  },
  skill: {
    icon: Sparkles,
    label: "Skill",
    description: "Reusable capability or knowledge",
  },
  hook: {
    icon: Webhook,
    label: "Hook",
    description: "Event-driven automation",
  },
  command: {
    icon: Terminal,
    label: "Command",
    description: "Slash command integration",
  },
  agent: {
    icon: Bot,
    label: "Agent",
    description: "Autonomous AI agent",
  },
} as const

export type MarketplaceCategory = keyof typeof MARKETPLACE_CATEGORIES
export type MarketplaceSortOption = keyof typeof MARKETPLACE_SORT_OPTIONS
export type InstallationStatus = keyof typeof INSTALLATION_STATUS_STYLES
export type MarketplaceScope = keyof typeof MARKETPLACE_SCOPES
export type ComponentType = keyof typeof COMPONENT_TYPES
