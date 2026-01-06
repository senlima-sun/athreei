/**
 * List command - displays all configured MCP servers
 */

import { getServers } from "../lib/config.js"

// ANSI color codes
const colors = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
}

export function listCommand(): void {
  const servers = getServers()

  if (servers.length === 0) {
    console.log(`${colors.yellow}No MCP servers configured.${colors.reset}`)
    console.log(`\nRun ${colors.cyan}a3i add${colors.reset} to add a server.`)
    return
  }

  console.log(`\n${colors.green}Configured MCP Servers:${colors.reset}\n`)

  for (const server of servers) {
    console.log(`  ${colors.cyan}${server.name}${colors.reset}`)
    console.log(`    URL: ${colors.dim}${server.url}${colors.reset}`)
    console.log(
      `    Token: ${colors.dim}${server.token.startsWith("encrypted:") ? "[encrypted]" : "[plaintext]"}${colors.reset}`
    )
    console.log()
  }

  console.log(
    `${colors.dim}Total: ${servers.length} server(s)${colors.reset}\n`
  )
}
