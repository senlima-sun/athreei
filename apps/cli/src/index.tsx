#!/usr/bin/env bun
import { Command } from "commander"
import { render } from "ink"
import React from "react"
import { LoginFlow } from "./components/login-flow.js"
import { AuthStatus } from "./components/auth-status.js"
import { getAuthManager } from "./auth/manager.js"

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

program.parse()
