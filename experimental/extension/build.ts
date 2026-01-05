#!/usr/bin/env bun

/**
 * Build script for athreei Chrome extension
 * Bundles TypeScript files and copies static assets to dist/
 */

import { watch } from "fs"
import { copyFile, mkdir, readdir, rm } from "fs/promises"
import { join } from "path"

const DIST_DIR = join(import.meta.dir, "dist")
const SRC_DIR = join(import.meta.dir, "src")
const MANIFEST_PATH = join(import.meta.dir, "manifest.json")
const ICONS_DIR = join(import.meta.dir, "icons")
const POPUP_HTML = join(import.meta.dir, "popup.html")

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
async function bundle(
  entrypoint: string,
  outfile: string,
  format: "esm" | "iife" = "esm"
) {
  const relativePath = entrypoint.replace(SRC_DIR + "/", "")
  console.log(`📦 Bundling ${relativePath}...`)

  try {
    const result = await Bun.build({
      entrypoints: [entrypoint],
      outdir: DIST_DIR,
      target: "browser",
      format,
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
 * Copy and transform manifest.json for dist folder
 * Adjusts paths since dist/ becomes the extension root
 */
async function copyManifest() {
  console.log("📄 Processing manifest.json...")
  const manifest = await Bun.file(MANIFEST_PATH).json()

  // Adjust paths for dist folder (remove dist/ prefix since dist is the root)
  if (manifest.background?.service_worker) {
    manifest.background.service_worker =
      manifest.background.service_worker.replace("dist/", "")
  }
  if (manifest.content_scripts) {
    for (const script of manifest.content_scripts) {
      if (script.js) {
        script.js = script.js.map((js: string) => js.replace("dist/", ""))
      }
    }
  }

  const destPath = join(DIST_DIR, "manifest.json")
  await Bun.write(destPath, JSON.stringify(manifest, null, 2))
  console.log(
    `✅ Processed manifest.json → ${destPath.replace(import.meta.dir + "/", "")}`
  )
}

/**
 * Copy static assets (popup.html, icons)
 */
async function copyAssets() {
  console.log("📂 Copying static assets...")

  // Copy popup.html
  await copyFile(POPUP_HTML, join(DIST_DIR, "popup.html"))
  console.log("✅ Copied popup.html")

  // Copy icons
  const iconsDistDir = join(DIST_DIR, "icons")
  await mkdir(iconsDistDir, { recursive: true })

  const iconFiles = await readdir(ICONS_DIR)
  for (const file of iconFiles) {
    if (file.endsWith(".png")) {
      await copyFile(join(ICONS_DIR, file), join(iconsDistDir, file))
      console.log(`✅ Copied icons/${file}`)
    }
  }
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

    // Bundle content script (IIFE format - content scripts can't use ES modules)
    await bundle(
      join(SRC_DIR, "content/index.ts"),
      join(DIST_DIR, "content.js"),
      "iife"
    )

    // Bundle popup script
    await bundle(join(SRC_DIR, "popup/index.ts"), join(DIST_DIR, "popup.js"))

    // Copy manifest and static assets
    await copyManifest()
    await copyAssets()

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
