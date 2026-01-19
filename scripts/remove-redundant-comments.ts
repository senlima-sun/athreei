#!/usr/bin/env bun
/**
 * Codemod script to remove redundant comments from TypeScript/JavaScript files.
 *
 * Usage:
 *   bun scripts/remove-redundant-comments.ts [options]
 *
 * Options:
 *   --dry-run       Show what would be removed without modifying files
 *   --verbose       Show detailed output
 *   --include=GLOB  Include files matching glob (default: "**\/*.{ts,tsx}")
 *   --exclude=GLOB  Exclude files matching glob (can be repeated)
 *
 * Examples:
 *   bun scripts/remove-redundant-comments.ts --dry-run
 *   bun scripts/remove-redundant-comments.ts --exclude="**\/__tests__/**"
 *   bun scripts/remove-redundant-comments.ts --include="packages/**\/*.ts"
 */

import { Glob } from "bun"
import { readFileSync, writeFileSync } from "fs"
import { relative, resolve } from "path"

interface Options {
  dryRun: boolean
  verbose: boolean
  include: string
  exclude: string[]
}

interface RemovalResult {
  file: string
  removedCount: number
  removedComments: string[]
}

// Patterns that indicate redundant comments (action verbs that just restate code)
const REDUNDANT_PATTERNS = [
  // Action verb comments
  /^\s*\/\/\s*(Create|Get|Set|Parse|Return|Handle|Update|Delete|Add|Check|Validate|Format|Convert|Filter|Build|Extract|Initialize|Generate|Send|Fetch|Load|Save|Store|Clear|Reset|Start|Stop|Setup|Configure|Process|Transform|Calculate|Compute|Find|Search|Sort|Map|Reduce|Iterate|Loop|Call|Invoke|Execute|Run|Apply|Merge|Clone|Copy|Remove|Insert|Append|Prepend|Push|Pop|Shift|Unshift|Splice|Slice|Split|Join|Concat|Trim|Replace|Match|Test|Include|Exclude|Enable|Disable|Show|Hide|Open|Close|Read|Write|Render|Mount|Unmount|Subscribe|Unsubscribe|Emit|Dispatch|Trigger|Fire|Notify|Log|Debug|Warn|Error|Throw|Catch|Try|Await|Resolve|Reject|Import|Export|Require|Define|Declare|Assign|Bind|Connect|Disconnect|Attach|Detach)\s+/i,

  // Simple variable/constant descriptions
  /^\s*\/\/\s*(The|A|An)\s+(new|current|default|initial|final|updated|modified|original|previous|next|first|last|temp|temporary)\s+/i,

  // Obvious state/step comments
  /^\s*\/\/\s*(Now|Then|Next|First|Finally|After|Before)\s+(we\s+)?(create|get|set|call|return|check|validate|handle|update|delete|add)/i,

  // Empty or trivial comments
  /^\s*\/\/\s*$/,
  /^\s*\/\/\s*\.\.\.\s*$/,

  // Comments that just name the section without adding value
  /^\s*\/\/\s*(Imports|Exports|Types|Interfaces|Constants|Variables|Functions|Methods|Handlers|Helpers|Utils|Utilities)\s*$/i,
]

// Patterns that indicate valuable comments to KEEP
const KEEP_PATTERNS = [
  // WHY comments (explain reasoning)
  /^\s*\/\/\s*(because|since|due to|reason:|note:|important:|warning:|caution:|todo:|fixme:|hack:|workaround:|see:|ref:|reference:|matches|upstream|external|legacy|backwards|compat|browser|node|environment)/i,

  // License/legal headers
  /^\s*\/\/\s*(copyright|license|mit|apache|bsd|gpl|lgpl|mpl|isc|unlicense|all rights reserved)/i,

  // Technical explanations (contain specific technical terms)
  /^\s*\/\/\s*.*\b(algorithm|complexity|O\(|performance|optimization|security|encryption|authentication|authorization|cache|buffer|memory|stack|heap|thread|async|concurrent|parallel|race condition|deadlock|mutex|semaphore|lock|atomic|transaction|rollback|commit|migration|schema|index|query|join|aggregate|pagination|offset|limit|cursor|token|jwt|oauth|cors|csrf|xss|injection|sanitize|escape|encode|decode|hash|salt|nonce|iv|cipher|digest|signature|certificate|ssl|tls|https|websocket|sse|polling|webhook|callback|promise|observable|stream|pipe|channel|queue|pubsub|event loop|tick|microtask|macrotask)\b/i,

  // Configuration/magic number explanations
  /^\s*\/\/\s*.*\b(\d+\s*(ms|sec|min|hour|day|byte|kb|mb|gb|px|em|rem|vh|vw|%)|timeout|interval|delay|threshold|limit|max|min|default|fallback)\b/i,

  // JSDoc-style comments (keep these)
  /^\s*\/\*\*/,
  /^\s*\*\s*@/,

  // Disable/enable directives
  /^\s*\/\/\s*(eslint|prettier|typescript|@ts-|tslint|stylelint|biome)/i,
]

// File patterns to always exclude
const DEFAULT_EXCLUDES = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.next/**",
  "**/coverage/**",
  "**/*.d.ts",
  "**/*.min.js",
  "**/*.bundle.js",
]

function parseArgs(): Options {
  const args = process.argv.slice(2)
  const options: Options = {
    dryRun: false,
    verbose: false,
    include: "**/*.{ts,tsx}",
    exclude: [...DEFAULT_EXCLUDES],
  }

  for (const arg of args) {
    if (arg === "--dry-run") {
      options.dryRun = true
    } else if (arg === "--verbose") {
      options.verbose = true
    } else if (arg.startsWith("--include=")) {
      options.include = arg.slice(10)
    } else if (arg.startsWith("--exclude=")) {
      options.exclude.push(arg.slice(10))
    } else if (arg === "--help" || arg === "-h") {
      console.log(`
Usage: bun scripts/remove-redundant-comments.ts [options]

Options:
  --dry-run       Show what would be removed without modifying files
  --verbose       Show detailed output
  --include=GLOB  Include files matching glob (default: "**/*.{ts,tsx}")
  --exclude=GLOB  Exclude files matching glob (can be repeated)

Examples:
  bun scripts/remove-redundant-comments.ts --dry-run
  bun scripts/remove-redundant-comments.ts --exclude="**/__tests__/**"
  bun scripts/remove-redundant-comments.ts --include="packages/**/*.ts"
`)
      process.exit(0)
    }
  }

  return options
}

function isRedundantComment(line: string): boolean {
  for (const pattern of KEEP_PATTERNS) {
    if (pattern.test(line)) {
      return false
    }
  }

  for (const pattern of REDUNDANT_PATTERNS) {
    if (pattern.test(line)) {
      return true
    }
  }

  return false
}

function processFile(filePath: string, options: Options): RemovalResult | null {
  const content = readFileSync(filePath, "utf-8")
  const lines = content.split("\n")
  const newLines: string[] = []
  const removedComments: string[] = []

  let inMultilineComment = false
  let multilineBuffer: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const trimmed = line.trim()

    if (trimmed.startsWith("/*") && !trimmed.startsWith("/**")) {
      inMultilineComment = true
      multilineBuffer = [line]

      if (trimmed.endsWith("*/")) {
        inMultilineComment = false
        const commentContent = trimmed.slice(2, -2).trim()
        if (isRedundantComment(`// ${commentContent}`)) {
          removedComments.push(line.trim())
          continue
        }
        newLines.push(line)
        multilineBuffer = []
      }
      continue
    }

    if (inMultilineComment) {
      multilineBuffer.push(line)
      if (trimmed.endsWith("*/")) {
        inMultilineComment = false
        // Keep all multiline comments for now (could be JSDoc or important)
        newLines.push(...multilineBuffer)
        multilineBuffer = []
      }
      continue
    }

    if (trimmed.startsWith("//")) {
      if (isRedundantComment(line)) {
        removedComments.push(line.trim())
        // If the previous line is empty and next line is also empty or code, we might leave extra blank lines
        // Keep track but don't add to newLines
        continue
      }
    }

    newLines.push(line)
  }

  // Clean up consecutive empty lines that might result from removal
  const cleanedLines: string[] = []
  let prevWasEmpty = false
  for (const line of newLines) {
    const isEmpty = line.trim() === ""
    if (isEmpty && prevWasEmpty) {
      continue // Skip consecutive empty lines
    }
    cleanedLines.push(line)
    prevWasEmpty = isEmpty
  }

  if (removedComments.length === 0) {
    return null
  }

  const newContent = cleanedLines.join("\n")

  if (!options.dryRun) {
    writeFileSync(filePath, newContent)
  }

  return {
    file: filePath,
    removedCount: removedComments.length,
    removedComments,
  }
}

async function main() {
  const options = parseArgs()
  const cwd = process.cwd()

  console.log(`\n🔍 Scanning for redundant comments...`)
  console.log(`   Include: ${options.include}`)
  console.log(`   Exclude: ${options.exclude.join(", ")}`)
  if (options.dryRun) {
    console.log(`   Mode: DRY RUN (no files will be modified)\n`)
  } else {
    console.log(`   Mode: LIVE (files will be modified)\n`)
  }

  const glob = new Glob(options.include)
  const results: RemovalResult[] = []
  let filesScanned = 0

  for await (const file of glob.scan({ cwd, onlyFiles: true })) {
    const shouldExclude = options.exclude.some((pattern) => {
      const excludeGlob = new Glob(pattern)
      return excludeGlob.match(file)
    })

    if (shouldExclude) {
      continue
    }

    filesScanned++
    const fullPath = resolve(cwd, file)

    try {
      const result = processFile(fullPath, options)
      if (result) {
        results.push(result)

        if (options.verbose) {
          console.log(`📝 ${relative(cwd, result.file)}`)
          for (const comment of result.removedComments) {
            console.log(
              `   - ${comment.slice(0, 80)}${comment.length > 80 ? "..." : ""}`
            )
          }
        } else {
          console.log(
            `📝 ${relative(cwd, result.file)} (${result.removedCount} comments)`
          )
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error)
    }
  }

  // Summary
  const totalRemoved = results.reduce((sum, r) => sum + r.removedCount, 0)
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`📊 Summary:`)
  console.log(`   Files scanned: ${filesScanned}`)
  console.log(`   Files modified: ${results.length}`)
  console.log(`   Comments removed: ${totalRemoved}`)

  if (options.dryRun && totalRemoved > 0) {
    console.log(`\n💡 Run without --dry-run to apply changes`)
  }
}

main().catch(console.error)
