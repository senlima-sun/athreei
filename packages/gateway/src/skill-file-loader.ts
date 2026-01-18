/**
 * Skill File Loader
 *
 * Loads skills and rules from markdown files for local mode.
 * Supports loading from a directory of .md files with frontmatter.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, basename, extname } from "node:path"
import type { SkillConfig, RuleConfig } from "./types"
import { log } from "./logger"

interface FrontmatterResult {
  frontmatter: Record<string, unknown>
  content: string
}

/**
 * Parse YAML-like frontmatter from markdown content
 */
function parseFrontmatter(fileContent: string): FrontmatterResult {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  const match = fileContent.match(frontmatterRegex)

  if (!match) {
    return { frontmatter: {}, content: fileContent }
  }

  const [, frontmatterStr = "", content = ""] = match
  const frontmatter: Record<string, unknown> = {}

  // Simple YAML parsing for common fields
  for (const line of frontmatterStr.split("\n")) {
    const colonIndex = line.indexOf(":")
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    let value: unknown = line.slice(colonIndex + 1).trim()

    // Parse arrays (simple format: [item1, item2])
    if (
      typeof value === "string" &&
      value.startsWith("[") &&
      value.endsWith("]")
    ) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((v) => v.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean)
    }
    // Parse numbers
    else if (typeof value === "string" && /^\d+$/.test(value)) {
      value = parseInt(value, 10)
    }
    // Remove quotes from strings
    else if (typeof value === "string") {
      value = value.replace(/^["']|["']$/g, "")
    }

    if (key) {
      frontmatter[key] = value
    }
  }

  return { frontmatter, content: content?.trim() ?? "" }
}

/**
 * Load a single skill from a markdown file
 */
export function loadSkillFromFile(filePath: string): SkillConfig | null {
  if (!existsSync(filePath)) {
    log.warn(`Skill file not found: ${filePath}`)
    return null
  }

  const fileContent = readFileSync(filePath, "utf-8")
  const { frontmatter, content } = parseFrontmatter(fileContent)

  const name = basename(filePath, extname(filePath))
  const id =
    typeof frontmatter.id === "string"
      ? frontmatter.id
      : `file-skill-${name.toLowerCase().replace(/\s+/g, "-")}`

  return {
    id,
    name: typeof frontmatter.name === "string" ? frontmatter.name : name,
    description:
      typeof frontmatter.description === "string"
        ? frontmatter.description
        : null,
    content,
    tags: Array.isArray(frontmatter.tags)
      ? frontmatter.tags.filter((t): t is string => typeof t === "string")
      : [],
    version: typeof frontmatter.version === "number" ? frontmatter.version : 1,
  }
}

/**
 * Load a single rule from a markdown file
 */
export function loadRuleFromFile(filePath: string): RuleConfig | null {
  if (!existsSync(filePath)) {
    log.warn(`Rule file not found: ${filePath}`)
    return null
  }

  const fileContent = readFileSync(filePath, "utf-8")
  const { frontmatter, content } = parseFrontmatter(fileContent)

  const name = basename(filePath, extname(filePath))
  const id =
    typeof frontmatter.id === "string"
      ? frontmatter.id
      : `file-rule-${name.toLowerCase().replace(/\s+/g, "-")}`

  const scope = frontmatter.scope as string | undefined
  const validScopes = ["global", "namespace", "endpoint"] as const

  return {
    id,
    name: typeof frontmatter.name === "string" ? frontmatter.name : name,
    description:
      typeof frontmatter.description === "string"
        ? frontmatter.description
        : null,
    content,
    priority:
      typeof frontmatter.priority === "number" ? frontmatter.priority : 0,
    scope:
      scope && validScopes.includes(scope as (typeof validScopes)[number])
        ? (scope as (typeof validScopes)[number])
        : "global",
  }
}

/**
 * Load all skills from a directory
 */
export function loadSkillsFromDirectory(dirPath: string): SkillConfig[] {
  if (!existsSync(dirPath)) {
    log.warn(`Skills directory not found: ${dirPath}`)
    return []
  }

  const stats = statSync(dirPath)
  if (!stats.isDirectory()) {
    log.warn(`Path is not a directory: ${dirPath}`)
    return []
  }

  const files = readdirSync(dirPath).filter(
    (f) => f.endsWith(".md") || f.endsWith(".markdown")
  )

  const skills: SkillConfig[] = []
  for (const file of files) {
    const skill = loadSkillFromFile(join(dirPath, file))
    if (skill) {
      skills.push(skill)
    }
  }

  log.info(`Loaded ${skills.length} skills from ${dirPath}`)
  return skills
}

/**
 * Load all rules from a directory
 */
export function loadRulesFromDirectory(dirPath: string): RuleConfig[] {
  if (!existsSync(dirPath)) {
    log.warn(`Rules directory not found: ${dirPath}`)
    return []
  }

  const stats = statSync(dirPath)
  if (!stats.isDirectory()) {
    log.warn(`Path is not a directory: ${dirPath}`)
    return []
  }

  const files = readdirSync(dirPath).filter(
    (f) => f.endsWith(".md") || f.endsWith(".markdown")
  )

  const rules: RuleConfig[] = []
  for (const file of files) {
    const rule = loadRuleFromFile(join(dirPath, file))
    if (rule) {
      rules.push(rule)
    }
  }

  // Sort by priority (higher first)
  rules.sort((a, b) => b.priority - a.priority)

  log.info(`Loaded ${rules.length} rules from ${dirPath}`)
  return rules
}

/**
 * Export skills to markdown files
 */
export function exportSkillToMarkdown(skill: SkillConfig): string {
  const frontmatter = ["---", `id: "${skill.id}"`, `name: "${skill.name}"`]

  if (skill.description) {
    frontmatter.push(`description: "${skill.description}"`)
  }

  if (skill.tags && skill.tags.length > 0) {
    frontmatter.push(`tags: [${skill.tags.map((t) => `"${t}"`).join(", ")}]`)
  }

  if (skill.version) {
    frontmatter.push(`version: ${skill.version}`)
  }

  frontmatter.push("---")
  frontmatter.push("")

  return frontmatter.join("\n") + skill.content
}

/**
 * Export rule to markdown file
 */
export function exportRuleToMarkdown(rule: RuleConfig): string {
  const frontmatter = [
    "---",
    `id: "${rule.id}"`,
    `name: "${rule.name}"`,
    `priority: ${rule.priority}`,
    `scope: "${rule.scope}"`,
  ]

  if (rule.description) {
    frontmatter.push(`description: "${rule.description}"`)
  }

  frontmatter.push("---")
  frontmatter.push("")

  return frontmatter.join("\n") + rule.content
}
