/**
 * Config command - open config file in editor
 */

import { spawn } from "child_process"
import { existsSync } from "fs"
import { getConfigPath, readConfig, writeConfig } from "../lib/config.js"

// ANSI color codes
const colors = {
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
  reset: "\x1b[0m",
}

/**
 * Get the default editor based on platform and environment
 */
function getDefaultEditor(): string {
  // Check EDITOR environment variable first
  if (process.env.EDITOR) {
    return process.env.EDITOR
  }

  // Check VISUAL environment variable
  if (process.env.VISUAL) {
    return process.env.VISUAL
  }

  // Platform-specific defaults
  const platform = process.platform
  switch (platform) {
    case "darwin":
      return "open -t" // macOS TextEdit
    case "win32":
      return "notepad"
    default:
      return "nano" // Linux/Unix fallback
  }
}

export async function configCommand(): Promise<void> {
  const configPath = getConfigPath()

  // Ensure config file exists
  if (!existsSync(configPath)) {
    console.log(
      `${colors.yellow}Config file doesn't exist. Creating...${colors.reset}`
    )
    // Initialize with empty config
    const emptyConfig = readConfig()
    writeConfig(emptyConfig)
  }

  console.log(`${colors.cyan}Config file:${colors.reset} ${configPath}`)
  console.log()

  const editor = getDefaultEditor()
  const editorParts = editor.split(" ")
  const editorCommand = editorParts[0]
  const editorArgs = [...editorParts.slice(1), configPath]

  console.log(
    `${colors.dim}Opening with: ${editor} ${configPath}${colors.reset}`
  )

  // Spawn editor
  const child = spawn(editorCommand, editorArgs, {
    stdio: "inherit",
    shell: process.platform === "win32",
  })

  child.on("error", (err) => {
    console.error(
      `${colors.yellow}Could not open editor: ${err.message}${colors.reset}`
    )
    console.log(`\n${colors.cyan}Config file location:${colors.reset}`)
    console.log(`  ${configPath}`)
    console.log(
      `\n${colors.dim}You can open this file manually in your preferred editor.${colors.reset}`
    )
  })

  // Wait for editor to close (for terminal editors)
  await new Promise<void>((resolve) => {
    child.on("close", () => {
      resolve()
    })
  })
}
