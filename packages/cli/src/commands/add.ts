/**
 * Add command - add a new MCP server
 * Supports both interactive and non-interactive modes
 */

import { input, password } from "@inquirer/prompts"
import { addServer, getServer } from "../lib/config.js"
import { encryptToken } from "../lib/crypto.js"
import type { AddOptions, ServerConfig } from "../types.js"

// ANSI color codes
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Interactive add flow
 */
async function interactiveAdd(): Promise<ServerConfig> {
  console.log(`\n${colors.cyan}Add MCP Server${colors.reset}\n`)

  const name = await input({
    message: "Server name:",
    validate: (value) => {
      if (!value.trim()) return "Name is required"
      if (!/^[a-z0-9-_]+$/i.test(value))
        return "Name can only contain letters, numbers, hyphens, and underscores"
      return true
    },
  })

  const url = await input({
    message: "Server URL:",
    validate: (value) => {
      if (!value.trim()) return "URL is required"
      if (!isValidUrl(value)) return "Invalid URL format"
      return true
    },
  })

  const token = await password({
    message: "API token:",
    validate: (value) => {
      if (!value.trim()) return "Token is required"
      return true
    },
  })

  return { name, url, token }
}

/**
 * Non-interactive add with options
 */
function nonInteractiveAdd(options: AddOptions): ServerConfig | null {
  const { name, url, token } = options

  if (!name) {
    console.error(`${colors.red}Error: --name is required${colors.reset}`)
    return null
  }

  if (!url) {
    console.error(`${colors.red}Error: --url is required${colors.reset}`)
    return null
  }

  if (!token) {
    console.error(`${colors.red}Error: --token is required${colors.reset}`)
    return null
  }

  if (!/^[a-z0-9-_]+$/i.test(name)) {
    console.error(
      `${colors.red}Error: Name can only contain letters, numbers, hyphens, and underscores${colors.reset}`
    )
    return null
  }

  if (!isValidUrl(url)) {
    console.error(`${colors.red}Error: Invalid URL format${colors.reset}`)
    return null
  }

  return { name, url, token }
}

export async function addCommand(options: AddOptions): Promise<void> {
  let server: ServerConfig | null

  // Determine if interactive mode
  const isInteractive = !options.name && !options.url && !options.token

  if (isInteractive) {
    server = await interactiveAdd()
  } else {
    server = nonInteractiveAdd(options)
    if (!server) {
      process.exit(1)
    }
  }

  // Check if server already exists
  const existing = getServer(server.name)
  if (existing) {
    console.log(
      `${colors.yellow}Server "${server.name}" already exists. Updating...${colors.reset}`
    )
  }

  // Encrypt the token
  const encryptedToken = encryptToken(server.token)

  // Save to config
  addServer({
    name: server.name,
    url: server.url,
    token: encryptedToken,
  })

  console.log(
    `\n${colors.green}Server "${server.name}" ${existing ? "updated" : "added"} successfully!${colors.reset}`
  )
  console.log(
    `\nRun ${colors.cyan}a3i verify ${server.name}${colors.reset} to test the connection.`
  )
}
