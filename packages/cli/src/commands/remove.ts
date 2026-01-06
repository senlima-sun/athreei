/**
 * Remove command - remove an MCP server
 */

import { confirm } from "@inquirer/prompts"
import { removeServer, getServer } from "../lib/config.js"

// ANSI color codes
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
}

interface RemoveOptions {
  force?: boolean
}

export async function removeCommand(
  name: string,
  options: RemoveOptions
): Promise<void> {
  // Check if server exists
  const server = getServer(name)
  if (!server) {
    console.error(
      `${colors.red}Error: Server "${name}" not found${colors.reset}`
    )
    console.log(
      `\nRun ${colors.cyan}a3i list${colors.reset} to see configured servers.`
    )
    process.exit(1)
  }

  // Confirm unless force flag is set
  if (!options.force) {
    const confirmed = await confirm({
      message: `Are you sure you want to remove "${name}"?`,
      default: false,
    })

    if (!confirmed) {
      console.log(`${colors.yellow}Cancelled.${colors.reset}`)
      return
    }
  }

  // Remove the server
  const removed = removeServer(name)

  if (removed) {
    console.log(
      `${colors.green}Server "${name}" removed successfully.${colors.reset}`
    )
  } else {
    console.error(
      `${colors.red}Error: Failed to remove server "${name}"${colors.reset}`
    )
    process.exit(1)
  }
}
