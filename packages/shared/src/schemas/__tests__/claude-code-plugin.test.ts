import { describe, expect, it } from "vitest"
import {
  claudeCodePluginSchema,
  claudeCodePluginStrictSchema,
  validateClaudeCodePlugin,
  safeValidateClaudeCodePlugin,
} from "../claude-code-plugin"

describe("claudeCodePluginSchema", () => {
  describe("valid manifests", () => {
    it("should accept minimal valid manifest", () => {
      const manifest = {
        name: "my-plugin",
      }

      const result = claudeCodePluginSchema.safeParse(manifest)
      expect(result.success).toBe(true)
    })

    it("should accept full manifest with all fields", () => {
      const manifest = {
        $schema: "https://code.claude.com/schemas/plugin.json",
        name: "my-awesome-plugin",
        version: "1.2.3",
        displayName: "My Awesome Plugin",
        description: "A plugin that does awesome things",
        author: {
          name: "Developer",
          email: "dev@example.com",
          url: "https://example.com",
        },
        homepage: "https://docs.example.com/my-plugin",
        repository: "https://github.com/user/my-plugin",
        license: "MIT",
        keywords: ["utility", "automation"],
        engines: {
          "claude-code": ">=1.0.0",
        },
        commands: "./commands/",
        agents: ["./agents/", "./custom-agents/special.md"],
        skills: "./skills/",
        hooks: "./hooks/hooks.json",
        mcpServers: {
          "my-server": {
            command: "node",
            args: ["./server.js"],
            env: { DEBUG: "true" },
          },
        },
        lspServers: {
          typescript: {
            command: "typescript-language-server",
            args: ["--stdio"],
            extensionToLanguage: {
              ".ts": "typescript",
              ".tsx": "typescript",
            },
          },
        },
        outputStyles: "./styles/",
      }

      const result = claudeCodePluginSchema.safeParse(manifest)
      expect(result.success).toBe(true)
    })

    it("should accept author as string", () => {
      const manifest = {
        name: "my-plugin",
        author: "John Doe",
      }

      const result = claudeCodePluginSchema.safeParse(manifest)
      expect(result.success).toBe(true)
    })

    it("should accept inline hooks config", () => {
      const manifest = {
        name: "my-plugin",
        hooks: {
          description: "My hooks",
          hooks: {
            PostToolUse: [
              {
                matcher: "Bash",
                hooks: [
                  {
                    type: "command",
                    command: "./scripts/post-bash.sh",
                    timeout: 30,
                  },
                ],
              },
            ],
          },
        },
      }

      const result = claudeCodePluginSchema.safeParse(manifest)
      expect(result.success).toBe(true)
    })
  })

  describe("invalid manifests", () => {
    it("should reject missing name", () => {
      const manifest = {
        version: "1.0.0",
        description: "A plugin without a name",
      }

      const result = claudeCodePluginSchema.safeParse(manifest)
      expect(result.success).toBe(false)
    })

    it("should reject invalid name format", () => {
      const manifest = {
        name: "My Plugin With Spaces",
      }

      const result = claudeCodePluginSchema.safeParse(manifest)
      expect(result.success).toBe(false)
    })

    it("should reject uppercase in name", () => {
      const manifest = {
        name: "MyPlugin",
      }

      const result = claudeCodePluginSchema.safeParse(manifest)
      expect(result.success).toBe(false)
    })

    it("should reject invalid version format", () => {
      const manifest = {
        name: "my-plugin",
        version: "v1.0",
      }

      const result = claudeCodePluginSchema.safeParse(manifest)
      expect(result.success).toBe(false)
    })

    it("should reject invalid homepage URL", () => {
      const manifest = {
        name: "my-plugin",
        homepage: "not-a-url",
      }

      const result = claudeCodePluginSchema.safeParse(manifest)
      expect(result.success).toBe(false)
    })

    it("should reject paths not starting with ./", () => {
      const manifest = {
        name: "my-plugin",
        commands: "commands/",
      }

      const result = claudeCodePluginSchema.safeParse(manifest)
      expect(result.success).toBe(false)
    })

    it("should reject invalid hook event type", () => {
      const manifest = {
        name: "my-plugin",
        hooks: {
          hooks: {
            InvalidEvent: [
              {
                hooks: [{ type: "command", command: "./test.sh" }],
              },
            ],
          },
        },
      }

      const result = claudeCodePluginSchema.safeParse(manifest)
      expect(result.success).toBe(false)
    })
  })
})

describe("claudeCodePluginStrictSchema", () => {
  it("should require version for strict validation", () => {
    const manifest = {
      name: "my-plugin",
    }

    const result = claudeCodePluginStrictSchema.safeParse(manifest)
    expect(result.success).toBe(false)
  })

  it("should accept manifest with name and version", () => {
    const manifest = {
      name: "my-plugin",
      version: "1.0.0",
    }

    const result = claudeCodePluginStrictSchema.safeParse(manifest)
    expect(result.success).toBe(true)
  })
})

describe("validateClaudeCodePlugin", () => {
  it("should return valid result for valid manifest", () => {
    const manifest = {
      name: "my-plugin",
      version: "1.0.0",
      description: "A test plugin",
      author: { name: "Developer" },
      license: "MIT",
      commands: "./commands/",
    }

    const result = validateClaudeCodePlugin(manifest)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
    expect(result.manifest).toBeDefined()
  })

  it("should return warnings for missing recommended fields", () => {
    const manifest = {
      name: "my-plugin",
    }

    const result = validateClaudeCodePlugin(manifest)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings.length).toBeGreaterThan(0)

    const warningCodes = result.warnings.map((w) => w.code)
    expect(warningCodes).toContain("MISSING_VERSION")
    expect(warningCodes).toContain("MISSING_DESCRIPTION")
    expect(warningCodes).toContain("MISSING_AUTHOR")
    expect(warningCodes).toContain("MISSING_LICENSE")
  })

  it("should warn about no components", () => {
    const manifest = {
      name: "my-plugin",
      version: "1.0.0",
    }

    const result = validateClaudeCodePlugin(manifest)

    expect(result.valid).toBe(true)
    const warningCodes = result.warnings.map((w) => w.code)
    expect(warningCodes).toContain("NO_COMPONENTS")
  })

  it("should return errors for invalid manifest", () => {
    const manifest = {
      name: "Invalid Name With Spaces",
    }

    const result = validateClaudeCodePlugin(manifest)

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.manifest).toBeUndefined()
  })

  it("should use strict mode when specified", () => {
    const manifest = {
      name: "my-plugin",
    }

    const result = validateClaudeCodePlugin(manifest, { strict: true })

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })
})

describe("safeValidateClaudeCodePlugin", () => {
  it("should catch and return errors for thrown exceptions", () => {
    const result = safeValidateClaudeCodePlugin(null)

    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it("should work the same as validateClaudeCodePlugin for valid input", () => {
    const manifest = {
      name: "my-plugin",
      version: "1.0.0",
    }

    const safeResult = safeValidateClaudeCodePlugin(manifest)
    const normalResult = validateClaudeCodePlugin(manifest)

    expect(safeResult.valid).toBe(normalResult.valid)
    expect(safeResult.errors.length).toBe(normalResult.errors.length)
  })
})

describe("semver validation", () => {
  const validVersions = [
    "0.0.1",
    "1.0.0",
    "1.2.3",
    "10.20.30",
    "1.0.0-alpha",
    "1.0.0-alpha.1",
    "1.0.0-beta.2",
    "1.0.0-rc.1",
  ]

  const invalidVersions = ["1", "1.0", "v1.0.0", "1.0.0.0", "version-1.0.0"]

  validVersions.forEach((version) => {
    it(`should accept valid version: ${version}`, () => {
      const manifest = { name: "my-plugin", version }
      const result = claudeCodePluginSchema.safeParse(manifest)
      expect(result.success).toBe(true)
    })
  })

  invalidVersions.forEach((version) => {
    it(`should reject invalid version: ${version}`, () => {
      const manifest = { name: "my-plugin", version }
      const result = claudeCodePluginSchema.safeParse(manifest)
      expect(result.success).toBe(false)
    })
  })
})

describe("hook events", () => {
  const validEvents = [
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
  ]

  validEvents.forEach((event) => {
    it(`should accept valid hook event: ${event}`, () => {
      const manifest = {
        name: "my-plugin",
        hooks: {
          hooks: {
            [event]: [
              {
                hooks: [{ type: "command", command: "./test.sh" }],
              },
            ],
          },
        },
      }
      const result = claudeCodePluginSchema.safeParse(manifest)
      expect(result.success).toBe(true)
    })
  })
})
