import { z } from "zod"

const relativePathSchema = z
  .string()
  .regex(/^\.\//, "Path must be relative and start with ./")

const kebabCaseSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    "Must be kebab-case (lowercase alphanumeric with hyphens)"
  )

const semverSchema = z
  .string()
  .regex(
    /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/,
    "Must be valid semantic version (X.Y.Z)"
  )

const semverRangeSchema = z
  .string()
  .regex(
    /^([<>=~^]*)?\d+(\.\d+)?(\.\d+)?(-[a-zA-Z0-9.]+)?$/,
    "Must be valid semver range"
  )

const authorObjectSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  url: z.string().url().optional(),
})

const authorSchema = z.union([z.string().min(1), authorObjectSchema])

const enginesSchema = z.object({
  "claude-code": semverRangeSchema.optional(),
})

const hookTypeSchema = z.enum(["command", "prompt", "agent"])

const hookDefinitionSchema = z.object({
  type: hookTypeSchema,
  command: z.string().optional(),
  prompt: z.string().optional(),
  agent: z.string().optional(),
  timeout: z.number().positive().optional(),
})

const hookEntrySchema = z.object({
  matcher: z.string().optional(),
  hooks: z.array(hookDefinitionSchema),
})

const hookEventSchema = z.enum([
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "PermissionRequest",
  "UserPromptSubmit",
  "Notification",
  "Stop",
  "SubagentStart",
  "SubagentStop",
  "Setup",
  "SessionStart",
  "SessionEnd",
  "PreCompact",
])

const hooksConfigSchema = z.object({
  description: z.string().optional(),
  hooks: z.record(hookEventSchema, z.array(hookEntrySchema)).optional(),
})

const mcpServerConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
})

const mcpServersConfigSchema = z.record(z.string(), mcpServerConfigSchema)

const lspTransportSchema = z.enum(["stdio", "socket"])

const lspServerConfigSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  extensionToLanguage: z.record(z.string(), z.string()),
  transport: lspTransportSchema.default("stdio").optional(),
  env: z.record(z.string()).optional(),
  initializationOptions: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
  workspaceFolder: z.string().optional(),
  startupTimeout: z.number().positive().optional(),
  shutdownTimeout: z.number().positive().optional(),
  restartOnCrash: z.boolean().optional(),
  maxRestarts: z.number().int().nonnegative().optional(),
})

const lspServersConfigSchema = z.record(z.string(), lspServerConfigSchema)

export const claudeCodePluginSchema = z.object({
  $schema: z.string().optional(),

  name: kebabCaseSchema,
  version: semverSchema.optional(),
  displayName: z.string().max(100).optional(),
  description: z.string().max(500).optional(),

  author: authorSchema.optional(),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  license: z.string().max(50).optional(),
  keywords: z.array(z.string().max(50)).max(20).optional(),
  engines: enginesSchema.optional(),

  commands: z.union([relativePathSchema, z.array(relativePathSchema)]).optional(),
  agents: z.union([relativePathSchema, z.array(relativePathSchema)]).optional(),
  skills: z.union([relativePathSchema, z.array(relativePathSchema)]).optional(),
  outputStyles: z
    .union([relativePathSchema, z.array(relativePathSchema)])
    .optional(),

  hooks: z.union([relativePathSchema, hooksConfigSchema]).optional(),
  mcpServers: z.union([relativePathSchema, mcpServersConfigSchema]).optional(),
  lspServers: z.union([relativePathSchema, lspServersConfigSchema]).optional(),
})

export const claudeCodePluginStrictSchema = claudeCodePluginSchema.extend({
  name: kebabCaseSchema,
  version: semverSchema,
})

export interface ClaudeCodePluginValidationResult {
  valid: boolean
  errors: ClaudeCodePluginValidationError[]
  warnings: ClaudeCodePluginValidationWarning[]
  manifest?: ClaudeCodePlugin
}

export interface ClaudeCodePluginValidationError {
  path: string
  message: string
  code: string
}

export interface ClaudeCodePluginValidationWarning {
  path: string
  message: string
  code: string
}

export function validateClaudeCodePlugin(
  data: unknown,
  options: { strict?: boolean } = {}
): ClaudeCodePluginValidationResult {
  const schema = options.strict
    ? claudeCodePluginStrictSchema
    : claudeCodePluginSchema
  const result = schema.safeParse(data)
  const warnings: ClaudeCodePluginValidationWarning[] = []

  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      })),
      warnings: [],
    }
  }

  const manifest = result.data

  if (!manifest.version) {
    warnings.push({
      path: "version",
      message: "Version is recommended for better compatibility tracking",
      code: "MISSING_VERSION",
    })
  }

  if (!manifest.description) {
    warnings.push({
      path: "description",
      message: "Description is recommended for marketplace discoverability",
      code: "MISSING_DESCRIPTION",
    })
  }

  if (!manifest.author) {
    warnings.push({
      path: "author",
      message: "Author information is recommended",
      code: "MISSING_AUTHOR",
    })
  }

  if (!manifest.license) {
    warnings.push({
      path: "license",
      message: "License is recommended for open source clarity",
      code: "MISSING_LICENSE",
    })
  }

  const hasComponents =
    manifest.commands ||
    manifest.agents ||
    manifest.skills ||
    manifest.hooks ||
    manifest.mcpServers ||
    manifest.lspServers ||
    manifest.outputStyles

  if (!hasComponents) {
    warnings.push({
      path: "",
      message:
        "Plugin has no components defined. Consider adding commands, skills, hooks, or other components.",
      code: "NO_COMPONENTS",
    })
  }

  return {
    valid: true,
    errors: [],
    warnings,
    manifest: manifest as ClaudeCodePlugin,
  }
}

export function safeValidateClaudeCodePlugin(
  data: unknown,
  options: { strict?: boolean } = {}
): ClaudeCodePluginValidationResult {
  try {
    return validateClaudeCodePlugin(data, options)
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          path: "",
          message: error instanceof Error ? error.message : "Unknown error",
          code: "VALIDATION_ERROR",
        },
      ],
      warnings: [],
    }
  }
}

export type ClaudeCodePlugin = z.infer<typeof claudeCodePluginSchema>
export type ClaudeCodePluginStrict = z.infer<typeof claudeCodePluginStrictSchema>
export type HookEvent = z.infer<typeof hookEventSchema>
export type HookType = z.infer<typeof hookTypeSchema>
export type HookDefinition = z.infer<typeof hookDefinitionSchema>
export type HookEntry = z.infer<typeof hookEntrySchema>
export type HooksConfig = z.infer<typeof hooksConfigSchema>
export type McpServerConfig = z.infer<typeof mcpServerConfigSchema>
export type LspServerConfig = z.infer<typeof lspServerConfigSchema>
export type AuthorObject = z.infer<typeof authorObjectSchema>

export {
  claudeCodePluginSchema as schema,
  claudeCodePluginStrictSchema as strictSchema,
  hookEventSchema,
  hookTypeSchema,
  hookDefinitionSchema,
  hookEntrySchema,
  hooksConfigSchema,
  mcpServerConfigSchema,
  mcpServersConfigSchema,
  lspServerConfigSchema,
  lspServersConfigSchema,
  authorSchema,
  authorObjectSchema,
  enginesSchema,
  kebabCaseSchema,
  semverSchema,
  semverRangeSchema,
  relativePathSchema,
}
