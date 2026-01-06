#!/usr/bin/env bun
/**
 * a3i - athreei CLI for managing MCP servers locally
 */

import { Command } from "commander"
import { listCommand } from "./commands/list.js"
import { addCommand } from "./commands/add.js"
import { verifyCommand } from "./commands/verify.js"
import { removeCommand } from "./commands/remove.js"
import { configCommand } from "./commands/config.js"

const VERSION = "0.1.0"

const program = new Command()
  .name("a3i")
  .description("athreei CLI for managing MCP servers locally")
  .version(VERSION)

// list command
program
  .command("list")
  .description("List all configured MCP servers")
  .action(() => {
    listCommand()
  })

// add command
program
  .command("add")
  .description("Add a new MCP server")
  .option("-n, --name <name>", "Server name")
  .option("-u, --url <url>", "Server URL")
  .option("-t, --token <token>", "API token")
  .action(async (options) => {
    await addCommand(options)
  })

// verify command
program
  .command("verify [name]")
  .description("Verify connection to MCP server(s)")
  .action(async (name?: string) => {
    await verifyCommand(name)
  })

// remove command
program
  .command("remove <name>")
  .description("Remove an MCP server")
  .option("-f, --force", "Skip confirmation prompt")
  .action(async (name: string, options) => {
    await removeCommand(name, options)
  })

// config command
program
  .command("config")
  .description("Open config file in editor")
  .action(async () => {
    await configCommand()
  })

// Parse arguments
program.parse()

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp()
}
