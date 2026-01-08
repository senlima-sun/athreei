#!/usr/bin/env bun
import { Command } from "commander"
import { render } from "ink"
import React from "react"
import { LoginFlow } from "./components/login-flow.js"
import { AuthStatus } from "./components/auth-status.js"
import { getAuthManager } from "./auth/manager.js"
import { OrgList, OrgSwitch, OrgCurrent } from "./commands/org.js"
import {
  McpList,
  McpUpdate,
  McpDelete,
  McpCreate,
  McpVerify,
  McpTools,
  McpEnvList,
  McpEnvSet,
  McpEnvDelete,
} from "./commands/mcp.js"
import {
  EndpointList,
  EndpointDetails,
  EndpointCreate,
  EndpointDelete,
} from "./commands/endpoint.js"
import {
  ConfigInit,
  ConfigShow,
  ConfigSet,
  ConfigGet,
  ConfigValidate,
} from "./commands/config.js"
import {
  GatewayStatus,
  GatewayStart,
  GatewayStop,
  GatewayLogs,
  GatewayConfigShow,
  GatewayConfigSet,
} from "./commands/gateway.js"
import { SyncStatus, SyncPull, SyncPush, SyncDiff } from "./commands/sync.js"
import { ApiKeyList, ApiKeyCreate, ApiKeyRevoke } from "./commands/apikey.js"

const program = new Command()

program
  .name("athreei")
  .description("Athreei CLI - Universal MCP Gateway")
  .version("0.1.0")
  .option("-p, --profile <name>", "Use a specific profile", "default")

const auth = program.command("auth").description("Manage authentication")

auth
  .command("login")
  .description("Authenticate with a provider")
  .argument("[provider]", "Authentication provider", "athreei")
  .option("-t, --token <token>", "Use a personal access token")
  .action(async (provider: string, options: { token?: string }) => {
    const profile = program.opts().profile
    const { waitUntilExit } = render(
      <LoginFlow provider={provider} token={options.token} profile={profile} />
    )
    await waitUntilExit()
  })

auth
  .command("logout")
  .description("Log out from a provider")
  .argument("[provider]", "Provider to log out from")
  .action(async (provider?: string) => {
    const manager = getAuthManager()
    await manager.logout(provider)
    console.log(
      provider
        ? `✓ Logged out from ${provider}`
        : "✓ Logged out from all providers"
    )
  })

auth
  .command("status")
  .description("Show authentication status")
  .action(async () => {
    const { waitUntilExit } = render(<AuthStatus />)
    await waitUntilExit()
  })

auth
  .command("token")
  .description("Print the current access token")
  .argument("[provider]", "Provider to get token for")
  .option("--no-mask", "Print full token")
  .action(async (provider?: string, options?: { mask: boolean }) => {
    const manager = getAuthManager()
    const session = await manager.getSession(provider)

    if (!session) {
      console.error("Not authenticated")
      process.exit(1)
    }

    if (options?.mask === false) {
      console.log(session.accessToken)
    } else {
      const masked =
        session.accessToken.slice(0, 8) + "..." + session.accessToken.slice(-4)
      console.log(`Token (${session.provider}): ${masked}`)
    }
  })

const org = program.command("org").description("Manage organizations")

org
  .command("list")
  .description("List available organizations")
  .action(async () => {
    const { waitUntilExit } = render(<OrgList />)
    await waitUntilExit()
  })

org
  .command("switch")
  .description("Switch active organization")
  .argument("<name>", "Organization name or slug")
  .action(async (name: string) => {
    const { waitUntilExit } = render(<OrgSwitch orgName={name} />)
    await waitUntilExit()
  })

org
  .command("current")
  .description("Show current organization")
  .action(async () => {
    const { waitUntilExit } = render(<OrgCurrent />)
    await waitUntilExit()
  })

const mcp = program.command("mcp").description("Manage MCP servers")

mcp
  .command("list")
  .description("List configured MCP servers")
  .option("-s, --search <query>", "Search by name or description")
  .option("--status <status>", "Filter by status (active, inactive, pending)")
  .option(
    "--transport <type>",
    "Filter by transport (stdio, sse, streamable-http)"
  )
  .action(
    async (options: {
      search?: string
      status?: string
      transport?: string
    }) => {
      const { waitUntilExit } = render(
        <McpList
          search={options.search}
          status={options.status}
          transport={options.transport}
        />
      )
      await waitUntilExit()
    }
  )

mcp
  .command("create")
  .description("Create a new MCP server")
  .option("-n, --name <name>", "Server name")
  .option("-d, --description <desc>", "Server description")
  .option(
    "-t, --transport <type>",
    "Transport type (stdio, sse, streamable-http)"
  )
  .option("-c, --command <cmd>", "Command to run (required for stdio)")
  .option("-a, --args <args>", "Arguments for the command (for stdio)")
  .option("-u, --url <url>", "Server URL (required for sse/streamable-http)")
  .action(
    async (options: {
      name?: string
      description?: string
      transport?: string
      command?: string
      args?: string
      url?: string
    }) => {
      const { waitUntilExit } = render(
        <McpCreate
          name={options.name}
          description={options.description}
          transport={options.transport}
          command={options.command}
          args={options.args}
          url={options.url}
        />
      )
      await waitUntilExit()
    }
  )

mcp
  .command("update")
  .description("Update an existing MCP server")
  .argument("<id>", "MCP server ID to update")
  .option("-n, --name <name>", "New server name")
  .option("-d, --description <desc>", "New description")
  .option(
    "-t, --transport <type>",
    "Transport type (stdio, sse, streamable-http)"
  )
  .option("-c, --command <cmd>", "Command to run (for stdio)")
  .option("-a, --args <args...>", "Arguments for the command (for stdio)")
  .option("-u, --url <url>", "Server URL (for sse/streamable-http)")
  .option("-y, --yes", "Skip confirmation prompt")
  .action(
    async (
      id: string,
      options: {
        name?: string
        description?: string
        transport?: "stdio" | "sse" | "streamable-http"
        command?: string
        args?: string[]
        url?: string
        yes?: boolean
      }
    ) => {
      const { waitUntilExit } = render(
        <McpUpdate
          id={id}
          name={options.name}
          description={options.description}
          transport={options.transport}
          command={options.command}
          args={options.args}
          url={options.url}
          yes={options.yes}
        />
      )
      await waitUntilExit()
    }
  )

mcp
  .command("delete")
  .description("Delete an MCP server")
  .argument("<id>", "MCP server ID to delete")
  .option("--confirm", "Skip interactive confirmation")
  .action(async (id: string, options: { confirm?: boolean }) => {
    const { waitUntilExit } = render(
      <McpDelete id={id} confirm={options.confirm} />
    )
    await waitUntilExit()
  })

mcp
  .command("verify")
  .description("Verify MCP server connectivity")
  .argument("<id>", "MCP server ID to verify")
  .option(
    "-t, --timeout <ms>",
    "Connection timeout in milliseconds",
    (val) => parseInt(val, 10),
    10000
  )
  .action(async (id: string, options: { timeout: number }) => {
    const { waitUntilExit } = render(
      <McpVerify id={id} timeout={options.timeout} />
    )
    await waitUntilExit()
  })

mcp
  .command("tools")
  .description("List tools exposed by an MCP server")
  .argument("<id>", "MCP server ID")
  .option("--json", "Output in JSON format")
  .action(async (id: string, options: { json?: boolean }) => {
    const { waitUntilExit } = render(<McpTools id={id} json={options.json} />)
    await waitUntilExit()
  })

// Environment variable subcommands
const mcpEnv = mcp
  .command("env")
  .description("Manage MCP server environment variables")

mcpEnv
  .command("list")
  .description("List environment variables for an MCP server")
  .argument("<id>", "MCP server ID")
  .option("--show", "Reveal environment variable values")
  .action(async (id: string, options: { show?: boolean }) => {
    const { waitUntilExit } = render(<McpEnvList id={id} show={options.show} />)
    await waitUntilExit()
  })

mcpEnv
  .command("set")
  .description("Set an environment variable for an MCP server")
  .argument("<id>", "MCP server ID")
  .argument("<key>", "Environment variable name")
  .argument("<value>", "Environment variable value")
  .action(async (id: string, key: string, value: string) => {
    const { waitUntilExit } = render(
      <McpEnvSet id={id} envKey={key} value={value} />
    )
    await waitUntilExit()
  })

mcpEnv
  .command("delete")
  .description("Delete an environment variable from an MCP server")
  .argument("<id>", "MCP server ID")
  .argument("<key>", "Environment variable name")
  .option("--confirm", "Skip interactive confirmation")
  .action(async (id: string, key: string, options: { confirm?: boolean }) => {
    const { waitUntilExit } = render(
      <McpEnvDelete id={id} envKey={key} confirm={options.confirm} />
    )
    await waitUntilExit()
  })

// Config commands
const config = program
  .command("config")
  .description("Manage configuration files")

config
  .command("init")
  .description("Initialize a new athreei.config.json file")
  .option("-p, --path <path>", "Custom path for config file")
  .action(async (options: { path?: string }) => {
    const { waitUntilExit } = render(<ConfigInit path={options.path} />)
    await waitUntilExit()
  })

config
  .command("show")
  .description("Display current configuration")
  .option("--show-secrets", "Reveal sensitive values")
  .action(async (options: { showSecrets?: boolean }) => {
    const { waitUntilExit } = render(
      <ConfigShow showSecrets={options.showSecrets} />
    )
    await waitUntilExit()
  })

config
  .command("set")
  .description("Set a configuration value")
  .argument("<key>", "Config key (supports dot notation, e.g., gateway.port)")
  .argument("<value>", "Value to set")
  .action(async (key: string, value: string) => {
    const { waitUntilExit } = render(
      <ConfigSet configKey={key} value={value} />
    )
    await waitUntilExit()
  })

config
  .command("get")
  .description("Get a configuration value")
  .argument("<key>", "Config key (supports dot notation, e.g., gateway.port)")
  .action(async (key: string) => {
    const { waitUntilExit } = render(<ConfigGet configKey={key} />)
    await waitUntilExit()
  })

config
  .command("validate")
  .description("Validate configuration file against schema")
  .action(async () => {
    const { waitUntilExit } = render(<ConfigValidate />)
    await waitUntilExit()
  })

// Gateway commands
const gateway = program
  .command("gateway")
  .description("Manage the local MCP gateway")

gateway
  .command("status")
  .description("Check if the gateway is running")
  .action(async () => {
    const { waitUntilExit } = render(<GatewayStatus />)
    await waitUntilExit()
  })

gateway
  .command("start")
  .description("Start the gateway process")
  .option("-p, --port <port>", "Port to run the gateway on", (val) =>
    parseInt(val, 10)
  )
  .action(async (options: { port?: number }) => {
    const { waitUntilExit } = render(<GatewayStart port={options.port} />)
    await waitUntilExit()
  })

gateway
  .command("stop")
  .description("Stop the gateway process")
  .option("-f, --force", "Force kill the gateway if graceful shutdown fails")
  .action(async (options: { force?: boolean }) => {
    const { waitUntilExit } = render(<GatewayStop force={options.force} />)
    await waitUntilExit()
  })

gateway
  .command("logs")
  .description("View gateway logs")
  .option("-f, --follow", "Follow log output (like tail -f)")
  .option(
    "-n, --lines <count>",
    "Number of lines to show",
    (val) => parseInt(val, 10),
    50
  )
  .option(
    "-l, --level <level>",
    "Filter by log level (error, warn, info, debug)"
  )
  .action(
    async (options: { follow?: boolean; lines?: number; level?: string }) => {
      const { waitUntilExit } = render(
        <GatewayLogs
          follow={options.follow}
          lines={options.lines}
          level={options.level}
        />
      )
      await waitUntilExit()
    }
  )

// Gateway config subcommands
const gatewayConfig = gateway
  .command("config")
  .description("Manage gateway configuration")

gatewayConfig
  .command("show")
  .description("Display gateway configuration")
  .action(async () => {
    const { waitUntilExit } = render(<GatewayConfigShow />)
    await waitUntilExit()
  })

gatewayConfig
  .command("set")
  .description("Set a gateway configuration value")
  .argument("<key>", "Config key (port, logLevel)")
  .argument("<value>", "Value to set")
  .action(async (key: string, value: string) => {
    const { waitUntilExit } = render(
      <GatewayConfigSet configKey={key} value={value} />
    )
    await waitUntilExit()
  })

// Sync commands
const sync = program
  .command("sync")
  .description("Synchronize local config with cloud organization")

sync
  .command("status")
  .description("Check sync status between local and cloud configurations")
  .action(async () => {
    const { waitUntilExit } = render(<SyncStatus />)
    await waitUntilExit()
  })

sync
  .command("diff")
  .description(
    "Show detailed differences between local and cloud configurations"
  )
  .option("--json", "Output in JSON format")
  .action(async (options: { json?: boolean }) => {
    const { waitUntilExit } = render(<SyncDiff json={options.json} />)
    await waitUntilExit()
  })

sync
  .command("pull")
  .description("Pull MCP server configurations from cloud to local config")
  .option("-y, --yes", "Skip confirmation prompts")
  .action(async (options: { yes?: boolean }) => {
    const { waitUntilExit } = render(<SyncPull yes={options.yes} />)
    await waitUntilExit()
  })

sync
  .command("push")
  .description("Push local MCP server configurations to cloud")
  .option("-y, --yes", "Skip confirmation prompts")
  .option(
    "--delete",
    "Delete cloud servers that are not in local config (dangerous)"
  )
  .action(async (options: { yes?: boolean; delete?: boolean }) => {
    const { waitUntilExit } = render(
      <SyncPush yes={options.yes} delete={options.delete} />
    )
    await waitUntilExit()
  })

// Endpoint commands
const endpoint = program
  .command("endpoint")
  .description("Manage endpoints (MCP server aggregations with API keys)")

endpoint
  .command("list")
  .description("List configured endpoints")
  .option("--json", "Output in JSON format")
  .action(async (options: { json?: boolean }) => {
    const { waitUntilExit } = render(<EndpointList json={options.json} />)
    await waitUntilExit()
  })

endpoint
  .command("create")
  .description("Create a new endpoint")
  .option("-n, --name <name>", "Endpoint name")
  .option(
    "-s, --slug <slug>",
    "Endpoint slug (auto-generated from name if not provided)"
  )
  .option("--namespace <id>", "Namespace ID")
  .action(
    async (options: { name?: string; slug?: string; namespace?: string }) => {
      const { waitUntilExit } = render(
        <EndpointCreate
          name={options.name}
          slug={options.slug}
          namespace={options.namespace}
        />
      )
      await waitUntilExit()
    }
  )

endpoint
  .command("details")
  .description("Show endpoint details")
  .argument("<id>", "Endpoint ID")
  .action(async (id: string) => {
    const { waitUntilExit } = render(<EndpointDetails id={id} />)
    await waitUntilExit()
  })

endpoint
  .command("delete")
  .description("Delete an endpoint")
  .argument("<id>", "Endpoint ID to delete")
  .option("--confirm", "Skip interactive confirmation")
  .action(async (id: string, options: { confirm?: boolean }) => {
    const { waitUntilExit } = render(
      <EndpointDelete id={id} confirm={options.confirm} />
    )
    await waitUntilExit()
  })

// API Key commands
const apikey = program
  .command("apikey")
  .description("Manage API keys for endpoints")

apikey
  .command("list")
  .description("List API keys for an endpoint")
  .option("-e, --endpoint <id>", "Endpoint ID to filter by")
  .option("--json", "Output in JSON format")
  .action(async (options: { endpoint?: string; json?: boolean }) => {
    const { waitUntilExit } = render(
      <ApiKeyList endpointId={options.endpoint} json={options.json} />
    )
    await waitUntilExit()
  })

apikey
  .command("create")
  .description("Create a new API key")
  .option("-n, --name <name>", "API key name")
  .option("-e, --endpoint <id>", "Endpoint ID")
  .option("--expires <date>", "Expiration date (ISO format)")
  .action(
    async (options: { name?: string; endpoint?: string; expires?: string }) => {
      const { waitUntilExit } = render(
        <ApiKeyCreate
          name={options.name}
          endpointId={options.endpoint}
          expires={options.expires}
        />
      )
      await waitUntilExit()
    }
  )

apikey
  .command("revoke")
  .description("Revoke an API key")
  .argument("<id>", "API key ID to revoke")
  .option("-e, --endpoint <id>", "Endpoint ID")
  .option("--confirm", "Skip interactive confirmation")
  .action(
    async (id: string, options: { endpoint?: string; confirm?: boolean }) => {
      const { waitUntilExit } = render(
        <ApiKeyRevoke
          keyId={id}
          endpointId={options.endpoint}
          confirm={options.confirm}
        />
      )
      await waitUntilExit()
    }
  )

program.parse()
