/**
 * MCP Server Registry
 *
 * Curated list of tested and verified MCP servers for one-click installation.
 */

export interface RegistryMcpServer {
  slug: string
  name: string
  description: string
  publisher: string
  iconUrl?: string
  transport: "stdio" | "sse"
  command?: string
  args?: string[]
  url?: string
  docsUrl: string
  envVars: Array<{
    name: string
    description: string
    required: boolean
  }>
  categories: string[]
  verified: boolean
}

export const REGISTRY_SERVERS: RegistryMcpServer[] = [
  {
    slug: "figma",
    name: "Figma",
    description:
      "Access Figma designs, components, and design tokens directly from AI applications",
    publisher: "Anthropic",
    iconUrl: "https://www.figma.com/favicon.ico",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@anthropic/mcp-figma"],
    docsUrl: "https://github.com/anthropics/mcp-figma",
    envVars: [
      {
        name: "FIGMA_ACCESS_TOKEN",
        description: "Personal access token from Figma settings",
        required: true,
      },
    ],
    categories: ["design", "productivity"],
    verified: true,
  },
  {
    slug: "sentry",
    name: "Sentry",
    description:
      "Query and analyze error reports, performance data, and application monitoring from Sentry",
    publisher: "Sentry",
    iconUrl: "https://sentry.io/favicon.ico",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@sentry/mcp-server"],
    docsUrl: "https://github.com/getsentry/sentry-mcp",
    envVars: [
      {
        name: "SENTRY_AUTH_TOKEN",
        description: "Auth token from Sentry settings",
        required: true,
      },
    ],
    categories: ["monitoring", "developer-tools"],
    verified: true,
  },
  {
    slug: "linear",
    name: "Linear",
    description:
      "Manage issues, projects, and workflows in Linear directly from AI applications",
    publisher: "Linear",
    iconUrl: "https://linear.app/favicon.ico",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@linear/mcp-server"],
    docsUrl: "https://github.com/linear/linear-mcp",
    envVars: [
      {
        name: "LINEAR_API_KEY",
        description: "API key from Linear settings",
        required: true,
      },
    ],
    categories: ["project-management", "productivity"],
    verified: true,
  },
  {
    slug: "github",
    name: "GitHub",
    description:
      "Interact with GitHub repositories, issues, pull requests, and code search",
    publisher: "GitHub",
    iconUrl: "https://github.com/favicon.ico",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@github/mcp-server"],
    docsUrl: "https://github.com/github/github-mcp",
    envVars: [
      {
        name: "GITHUB_TOKEN",
        description: "Personal access token with repo permissions",
        required: true,
      },
    ],
    categories: ["developer-tools", "version-control"],
    verified: true,
  },
  {
    slug: "notion",
    name: "Notion",
    description:
      "Search, read, and create pages and databases in Notion workspaces",
    publisher: "Notion",
    iconUrl: "https://www.notion.so/favicon.ico",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@notionhq/mcp-server"],
    docsUrl: "https://github.com/makenotion/notion-mcp",
    envVars: [
      {
        name: "NOTION_API_KEY",
        description: "Internal integration token from Notion",
        required: true,
      },
    ],
    categories: ["productivity", "documentation"],
    verified: true,
  },
  {
    slug: "slack",
    name: "Slack",
    description:
      "Send messages, search conversations, and manage channels in Slack workspaces",
    publisher: "Slack",
    iconUrl: "https://slack.com/favicon.ico",
    transport: "stdio",
    command: "npx",
    args: ["-y", "@slack/mcp-server"],
    docsUrl: "https://github.com/slackapi/slack-mcp",
    envVars: [
      {
        name: "SLACK_BOT_TOKEN",
        description: "Bot user OAuth token (xoxb-...)",
        required: true,
      },
    ],
    categories: ["communication", "productivity"],
    verified: true,
  },
]
