/**
 * Verify command - test MCP server connections
 */

import { getServer, getServers } from "../lib/config.js"
import { verifyServer, verifyServers } from "../lib/mcp.js"
import type { VerifyResult } from "../types.js"

// ANSI color codes
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
}

// Spinner frames
const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

/**
 * Display spinner while verifying
 */
function createSpinner(text: string): {
  update: (newText: string) => void
  stop: (success: boolean, finalText: string) => void
} {
  let frameIndex = 0
  let currentText = text
  const interval = setInterval(() => {
    process.stdout.write(
      `\r${colors.cyan}${spinnerFrames[frameIndex]}${colors.reset} ${currentText}`
    )
    frameIndex = (frameIndex + 1) % spinnerFrames.length
  }, 80)

  return {
    update: (newText: string) => {
      currentText = newText
    },
    stop: (success: boolean, finalText: string) => {
      clearInterval(interval)
      const symbol = success
        ? `${colors.green}✓${colors.reset}`
        : `${colors.red}✗${colors.reset}`
      process.stdout.write(`\r${symbol} ${finalText}\n`)
    },
  }
}

/**
 * Print verification result
 */
function printResult(result: VerifyResult): void {
  if (result.success) {
    console.log(`  ${colors.green}✓${colors.reset} ${result.name}`)
    console.log(`    URL: ${colors.dim}${result.url}${colors.reset}`)
    if (result.tools && result.tools.length > 0) {
      console.log(
        `    Tools: ${colors.dim}${result.tools.length} available${colors.reset}`
      )
      if (result.tools.length <= 5) {
        result.tools.forEach((tool) => {
          console.log(`      - ${colors.cyan}${tool}${colors.reset}`)
        })
      } else {
        result.tools.slice(0, 5).forEach((tool) => {
          console.log(`      - ${colors.cyan}${tool}${colors.reset}`)
        })
        console.log(
          `      ${colors.dim}... and ${result.tools.length - 5} more${colors.reset}`
        )
      }
    }
  } else {
    console.log(`  ${colors.red}✗${colors.reset} ${result.name}`)
    console.log(`    URL: ${colors.dim}${result.url}${colors.reset}`)
    console.log(`    Error: ${colors.red}${result.error}${colors.reset}`)
  }
}

export async function verifyCommand(name?: string): Promise<void> {
  if (name) {
    // Verify single server
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

    const spinner = createSpinner(`Verifying ${server.name}...`)

    const result = await verifyServer(server)

    spinner.stop(
      result.success,
      result.success
        ? `${server.name} connected successfully`
        : `${server.name} connection failed`
    )

    console.log()
    printResult(result)
  } else {
    // Verify all servers
    const servers = getServers()

    if (servers.length === 0) {
      console.log(`${colors.yellow}No MCP servers configured.${colors.reset}`)
      console.log(`\nRun ${colors.cyan}a3i add${colors.reset} to add a server.`)
      return
    }

    console.log(
      `\n${colors.cyan}Verifying ${servers.length} server(s)...${colors.reset}\n`
    )

    const results = await verifyServers(servers)

    const successful = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    for (const result of results) {
      printResult(result)
      console.log()
    }

    console.log(`${colors.dim}─────────────────────────${colors.reset}`)
    console.log(
      `${colors.green}${successful} connected${colors.reset} | ${colors.red}${failed} failed${colors.reset}`
    )
  }
}
