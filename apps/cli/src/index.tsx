#!/usr/bin/env bun
import { Command } from "commander"
import { render } from "ink"
import React from "react"
import { LoginFlow } from "./components/login-flow.js"
import { AuthStatus } from "./components/auth-status.js"
import { getAuthManager } from "./auth/manager.js"
import { OrgList, OrgSwitch, OrgCurrent } from "./commands/org.js"
import { McpList, McpUpdate } from "./commands/mcp.js"

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

program.parse()
