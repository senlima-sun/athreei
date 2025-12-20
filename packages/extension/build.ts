#!/usr/bin/env bun

/**
 * Build script for athreei Chrome extension
 * Bundles TypeScript files and copies static assets to dist/
 */

import { watch } from "fs"
import { copyFile, mkdir, rm } from "fs/promises"
import { join, dirname } from "path"

const DIST_DIR = join(import.meta.dir, "dist")
const SRC_DIR = join(import.meta.dir, "src")
const MANIFEST_PATH = join(import.meta.dir, "manifest.json")

// Check if watch mode is enabled
const isWatchMode = process.argv.includes("--watch")

/**
 * Clean the dist directory
 */
async function clean() {
  console.log("🧹 Cleaning dist directory...")
  try {
    await rm(DIST_DIR, { recursive: true, force: true })
  } catch (error) {
    // Ignore errors if directory doesn't exist
  }
  await mkdir(DIST_DIR, { recursive: true })
}

/**
 * Bundle a TypeScript file using Bun
 */
async function bundle(entrypoint: string, outfile: string) {
  const relativePath = entrypoint.replace(SRC_DIR + "/", "")
  console.log(`📦 Bundling ${relativePath}...`)

  try {
    const result = await Bun.build({
      entrypoints: [entrypoint],
      outdir: DIST_DIR,
      target: "browser",
      format: "esm",
      minify: false,
      sourcemap: "external",
    })

    if (!result.success) {
      console.error(`❌ Failed to bundle ${relativePath}:`)
      for (const log of result.logs) {
        console.error(log)
      }
      throw new Error(`Bundle failed for ${relativePath}`)
    }

    // Bun outputs as index.js by default, so we need to rename
    const builtFile = result.outputs[0]
    if (builtFile) {
      await Bun.write(outfile, builtFile)
      // Also write the sourcemap
      const mapFile = result.outputs.find((o) => o.path.endsWith(".map"))
      if (mapFile) {
        await Bun.write(outfile + ".map", mapFile)
      }
    }

    console.log(
      `✅ Bundled ${relativePath} → ${outfile.replace(import.meta.dir + "/", "")}`
    )
  } catch (error) {
    console.error(`❌ Error bundling ${relativePath}:`, error)
    throw error
  }
}

/**
 * Copy manifest.json to dist
 */
async function copyManifest() {
  console.log("📄 Copying manifest.json...")
  const destPath = join(DIST_DIR, "manifest.json")
  await copyFile(MANIFEST_PATH, destPath)
  console.log(
    `✅ Copied manifest.json → ${destPath.replace(import.meta.dir + "/", "")}`
  )
}

/**
 * Build all extension files
 */
async function build() {
  console.log("🚀 Building athreei extension...")
  console.log("")

  try {
    // Clean first
    await clean()

    // Bundle background service worker
    await bundle(
      join(SRC_DIR, "background/index.ts"),
      join(DIST_DIR, "background.js")
    )

    // Bundle content script
    await bundle(
      join(SRC_DIR, "content/index.ts"),
      join(DIST_DIR, "content.js")
    )

    // Copy manifest
    await copyManifest()

    console.log("")
    console.log("✨ Build complete!")
  } catch (error) {
    console.error("")
    console.error("💥 Build failed:", error)
    if (!isWatchMode) {
      process.exit(1)
    }
  }
}

/**
 * Watch mode - rebuild on file changes
 */
async function watchMode() {
  console.log("👀 Watch mode enabled - rebuilding on changes...")
  console.log("")

  // Initial build
  await build()

  // Watch src directory
  const srcWatcher = watch(
    SRC_DIR,
    { recursive: true },
    async (eventType, filename) => {
      if (filename && filename.endsWith(".ts")) {
        console.log("")
        console.log(`📝 File changed: ${filename}`)
        await build()
      }
    }
  )

  // Watch manifest.json
  const manifestWatcher = watch(MANIFEST_PATH, async (eventType) => {
    if (eventType === "change") {
      console.log("")
      console.log("📝 manifest.json changed")
      await build()
    }
  })

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("")
    console.log("👋 Stopping watch mode...")
    srcWatcher.close()
    manifestWatcher.close()
    process.exit(0)
  })
}

// Run build or watch
if (isWatchMode) {
  watchMode()
} else {
  build()
}
