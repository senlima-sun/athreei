/**
 * Build Script for athreei Gateway
 *
 * Compiles the gateway into standalone binaries for distribution.
 * Uses Bun's native compile feature.
 *
 * Usage:
 *   bun run ./build.ts [--all | --target <target>]
 *
 * Targets:
 *   darwin-arm64   - macOS Apple Silicon
 *   darwin-x64     - macOS Intel
 *   linux-x64      - Linux x64
 *   windows-x64    - Windows x64
 */

import { $ } from "bun"
import { existsSync, mkdirSync, rmSync } from "node:fs"
import { join } from "node:path"

const TARGETS = [
  { name: "darwin-arm64", label: "macOS (Apple Silicon)" },
  { name: "darwin-x64", label: "macOS (Intel)" },
  { name: "linux-x64", label: "Linux (x64)" },
  { name: "windows-x64", label: "Windows (x64)", ext: ".exe" },
] as const

type Target = (typeof TARGETS)[number]

const DIST_DIR = join(import.meta.dir, "dist")
const ENTRY_POINT = join(import.meta.dir, "src", "index.ts")
const BINARY_NAME = "athreei-gateway"

/**
 * Ensure dist directory exists
 */
function ensureDistDir(): void {
  if (!existsSync(DIST_DIR)) {
    mkdirSync(DIST_DIR, { recursive: true })
    console.log(`Created dist directory: ${DIST_DIR}`)
  }
}

/**
 * Build for a specific target
 */
async function buildForTarget(target: Target): Promise<void> {
  const outputName = `${BINARY_NAME}-${target.name}${target.ext || ""}`
  const outputPath = join(DIST_DIR, outputName)

  console.log(`\nBuilding for ${target.label}...`)
  console.log(`  Target: ${target.name}`)
  console.log(`  Output: ${outputPath}`)

  try {
    if (existsSync(outputPath)) {
      rmSync(outputPath)
    }

    // Use Bun's compile feature
    await $`bun build ${ENTRY_POINT} --compile --target=bun-${target.name} --outfile=${outputPath}`

    console.log(`  ✓ Built successfully: ${outputName}`)
  } catch (error) {
    console.error(`  ✗ Build failed for ${target.name}:`, error)
    throw error
  }
}

/**
 * Build for current platform only
 */
async function buildForCurrentPlatform(): Promise<void> {
  const outputName = BINARY_NAME
  const outputPath = join(DIST_DIR, outputName)

  console.log("\nBuilding for current platform...")
  console.log(`  Output: ${outputPath}`)

  try {
    if (existsSync(outputPath)) {
      rmSync(outputPath)
    }

    await $`bun build ${ENTRY_POINT} --compile --outfile=${outputPath}`

    console.log(`  ✓ Built successfully: ${outputName}`)
  } catch (error) {
    console.error("  ✗ Build failed:", error)
    throw error
  }
}

/**
 * Build for all targets
 */
async function buildAll(): Promise<void> {
  console.log("Building for all platforms...\n")

  const results: Array<{ target: string; success: boolean }> = []

  for (const target of TARGETS) {
    try {
      await buildForTarget(target)
      results.push({ target: target.name, success: true })
    } catch {
      results.push({ target: target.name, success: false })
    }
  }

  // Summary
  console.log("\n=== Build Summary ===")
  for (const result of results) {
    const icon = result.success ? "✓" : "✗"
    console.log(`  ${icon} ${result.target}`)
  }

  const failedCount = results.filter((r) => !r.success).length
  if (failedCount > 0) {
    console.log(`\n${failedCount} build(s) failed`)
    process.exit(1)
  }
}

/**
 * Parse CLI arguments and run build
 */
async function main(): Promise<void> {
  console.log("athreei Gateway Build Script")
  console.log("============================")

  ensureDistDir()

  const args = process.argv.slice(2)

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
Usage: bun run ./build.ts [options]

Options:
  --all              Build for all platforms
  --target <name>    Build for specific target
  --help, -h         Show this help message

Available targets:
${TARGETS.map((t) => `  ${t.name.padEnd(15)} ${t.label}`).join("\n")}

Examples:
  bun run ./build.ts                    # Build for current platform
  bun run ./build.ts --all              # Build for all platforms
  bun run ./build.ts --target linux-x64 # Build for Linux only
`)
    return
  }

  if (args.includes("--all")) {
    await buildAll()
    return
  }

  const targetIndex = args.indexOf("--target")
  if (targetIndex !== -1 && args[targetIndex + 1]) {
    const targetName = args[targetIndex + 1]
    const target = TARGETS.find((t) => t.name === targetName)

    if (!target) {
      console.error(`Unknown target: ${targetName}`)
      console.error(
        `Available targets: ${TARGETS.map((t) => t.name).join(", ")}`
      )
      process.exit(1)
    }

    await buildForTarget(target)
    return
  }

  // Default: build for current platform
  await buildForCurrentPlatform()
}

main().catch((error) => {
  console.error("Build failed:", error)
  process.exit(1)
})
