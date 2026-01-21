import { describe, it, expect, vi, beforeEach } from "vitest"
import { HookExecutor, createHookExecutor } from "../hook-executor"
import type {
  HookConfig,
  SkillConfig,
  RuleConfig,
  PreToolUseContext,
  PostToolUseContext,
} from "../types"

vi.mock("../logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

function createPreToolUseContext(
  overrides: Partial<PreToolUseContext> = {}
): PreToolUseContext {
  return {
    traceId: "trace-123",
    toolName: "browser__screenshot",
    serverName: "browser",
    arguments: { url: "https://example.com" },
    timestamp: Date.now(),
    ...overrides,
  }
}

function createPostToolUseContext(
  overrides: Partial<PostToolUseContext> = {}
): PostToolUseContext {
  return {
    traceId: "trace-123",
    toolName: "browser__screenshot",
    serverName: "browser",
    arguments: { url: "https://example.com" },
    result: { content: [{ type: "text", text: "Screenshot taken" }] },
    durationMs: 150,
    timestamp: Date.now(),
    ...overrides,
  }
}

function createHook(overrides: Partial<HookConfig> = {}): HookConfig {
  return {
    id: "hook-1",
    event: "PreToolUse",
    handler: { type: "rule", action: "allow" },
    ...overrides,
  }
}

function createSkill(overrides: Partial<SkillConfig> = {}): SkillConfig {
  return {
    id: "skill-1",
    name: "Test Skill",
    content: "This is a test skill",
    ...overrides,
  }
}

function createRule(overrides: Partial<RuleConfig> = {}): RuleConfig {
  return {
    id: "rule-1",
    name: "Test Rule",
    content: "This is a test rule",
    priority: 100,
    scope: "global",
    ...overrides,
  }
}

describe("HookExecutor", () => {
  let executor: HookExecutor

  beforeEach(() => {
    vi.clearAllMocks()
    executor = createHookExecutor()
  })

  describe("createHookExecutor", () => {
    it("creates a new HookExecutor instance", () => {
      const instance = createHookExecutor()
      expect(instance).toBeInstanceOf(HookExecutor)
    })
  })

  describe("setHooks", () => {
    it("filters out disabled hooks", () => {
      const hooks = [
        createHook({ id: "hook-1", isEnabled: true }),
        createHook({ id: "hook-2", isEnabled: false }),
        createHook({ id: "hook-3" }),
      ]

      executor.setHooks(hooks)

      const context = createPreToolUseContext({ toolName: "any_tool" })
      expect(executor.evaluatePreToolUse(context)).resolves.toEqual({
        action: "allow",
        modifiedArgs: context.arguments,
      })
    })

    it("sorts hooks by priority (higher first)", async () => {
      const hooks: HookConfig[] = [
        {
          id: "low-priority",
          event: "PreToolUse",
          priority: 50,
          handler: { type: "rule", action: "allow" },
        },
        {
          id: "high-priority",
          event: "PreToolUse",
          priority: 200,
          handler: { type: "rule", action: "block", message: "Blocked" },
        },
        {
          id: "default-priority",
          event: "PreToolUse",
          handler: { type: "rule", action: "allow" },
        },
      ]

      executor.setHooks(hooks)
      const context = createPreToolUseContext()

      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("block")
      expect(decision.reason).toBe("Blocked")
    })
  })

  describe("setSkills", () => {
    it("loads skills into internal map", () => {
      const skills = [
        createSkill({ id: "skill-1" }),
        createSkill({ id: "skill-2" }),
      ]

      executor.setSkills(skills)

      const hook = createHook({
        handler: { type: "skill", skillRef: "skill-1" },
      })
      executor.setHooks([hook])

      expect(executor.evaluatePreToolUse(createPreToolUseContext())).resolves
        .toBeDefined
    })
  })

  describe("setRules", () => {
    it("loads rules into internal map", () => {
      const rules = [createRule({ id: "rule-1" }), createRule({ id: "rule-2" })]

      executor.setRules(rules)
    })
  })

  describe("evaluatePreToolUse", () => {
    it("should allow tool call when no hooks match", async () => {
      executor.setHooks([])

      const context = createPreToolUseContext()
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("allow")
    })

    it("should allow tool call when hooks exist but none match the tool name", async () => {
      const hooks = [
        createHook({
          event: "PreToolUse",
          toolNamePattern: "^github__",
          handler: { type: "rule", action: "block", message: "Blocked" },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPreToolUseContext({
        toolName: "browser__screenshot",
      })
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("allow")
    })

    it("should block tool call when rule hook says block", async () => {
      const hooks = [
        createHook({
          event: "PreToolUse",
          toolNamePattern: "browser__",
          handler: {
            type: "rule",
            action: "block",
            message: "Tool blocked by rule",
          },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPreToolUseContext({
        toolName: "browser__screenshot",
      })
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("block")
      expect(decision.reason).toBe("Tool blocked by rule")
    })

    it("should evaluate hooks in priority order", async () => {
      const hooks = [
        createHook({
          id: "allow-hook",
          event: "PreToolUse",
          priority: 50,
          handler: { type: "rule", action: "allow" },
        }),
        createHook({
          id: "block-hook",
          event: "PreToolUse",
          priority: 200,
          handler: {
            type: "rule",
            action: "block",
            message: "High priority block",
          },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPreToolUseContext()
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("block")
      expect(decision.reason).toBe("High priority block")
    })

    it("should return modified args when hook modifies them", async () => {
      const skill = createSkill({
        id: "modify-skill",
        name: "Modifier Skill",
        content: "Allow all tools but modify arguments",
      })
      executor.setSkills([skill])

      const hooks = [
        createHook({
          event: "PreToolUse",
          handler: { type: "skill", skillRef: "modify-skill" },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPreToolUseContext({
        arguments: { url: "https://example.com" },
      })
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("allow")
      expect(decision.modifiedArgs).toBeDefined()
    })

    it("should only filter PreToolUse event hooks", async () => {
      const hooks = [
        createHook({
          id: "pre-hook",
          event: "PreToolUse",
          handler: { type: "rule", action: "block", message: "Pre blocked" },
        }),
        createHook({
          id: "post-hook",
          event: "PostToolUse",
          handler: { type: "rule", action: "allow" },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPreToolUseContext()
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("block")
      expect(decision.reason).toBe("Pre blocked")
    })

    it("should treat ask action as allow in rule handlers", async () => {
      const hooks = [
        createHook({
          event: "PreToolUse",
          handler: { type: "rule", action: "ask", message: "Ask user" },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPreToolUseContext()
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("allow")
    })

    it("should allow when skill reference is unknown", async () => {
      const hooks = [
        createHook({
          event: "PreToolUse",
          handler: { type: "skill", skillRef: "nonexistent-skill" },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPreToolUseContext()
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("allow")
    })

    it("should allow for script handlers (disabled for security)", async () => {
      const hooks = [
        createHook({
          event: "PreToolUse",
          handler: { type: "script", command: "echo", args: ["test"] },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPreToolUseContext()
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("allow")
    })

    it("should allow for unknown handler types", async () => {
      const hooks = [
        createHook({
          event: "PreToolUse",
          handler: { type: "unknown" } as unknown as HookConfig["handler"],
        }),
      ]
      executor.setHooks(hooks)

      const context = createPreToolUseContext()
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("allow")
    })
  })

  describe("evaluatePostToolUse", () => {
    it("should run all matching hooks without blocking", async () => {
      const hooks = [
        createHook({
          id: "post-hook-1",
          event: "PostToolUse",
          handler: { type: "rule", action: "allow" },
        }),
        createHook({
          id: "post-hook-2",
          event: "PostToolUse",
          handler: { type: "rule", action: "allow" },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPostToolUseContext()

      await expect(
        executor.evaluatePostToolUse(context)
      ).resolves.toBeUndefined()
    })

    it("should return early when no hooks match", async () => {
      executor.setHooks([])

      const context = createPostToolUseContext()

      await expect(
        executor.evaluatePostToolUse(context)
      ).resolves.toBeUndefined()
    })

    it("should only run PostToolUse event hooks", async () => {
      const hooks = [
        createHook({
          id: "pre-hook",
          event: "PreToolUse",
          handler: { type: "rule", action: "block", message: "Should not run" },
        }),
        createHook({
          id: "post-hook",
          event: "PostToolUse",
          handler: { type: "rule", action: "allow" },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPostToolUseContext()

      await expect(
        executor.evaluatePostToolUse(context)
      ).resolves.toBeUndefined()
    })

    it("should handle hook failures gracefully", async () => {
      const skill = createSkill({
        id: "error-skill",
        name: "Error Skill",
        content: "",
      })
      executor.setSkills([skill])

      const hooks = [
        createHook({
          id: "failing-hook",
          event: "PostToolUse",
          handler: { type: "skill", skillRef: "error-skill" },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPostToolUseContext()

      await expect(
        executor.evaluatePostToolUse(context)
      ).resolves.toBeUndefined()
    })

    it("should filter PostToolUse hooks by tool name pattern", async () => {
      const hooks = [
        createHook({
          id: "github-hook",
          event: "PostToolUse",
          toolNamePattern: "^github__",
          handler: { type: "rule", action: "allow" },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPostToolUseContext({
        toolName: "browser__screenshot",
      })

      await expect(
        executor.evaluatePostToolUse(context)
      ).resolves.toBeUndefined()
    })
  })

  describe("matchesPattern", () => {
    it("should match tool names against regex patterns", async () => {
      const hooks = [
        createHook({
          event: "PreToolUse",
          toolNamePattern: "^browser__",
          handler: { type: "rule", action: "block", message: "Matched" },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPreToolUseContext({
        toolName: "browser__screenshot",
      })
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("block")
    })

    it("should return true when pattern is not provided", async () => {
      const hooks = [
        createHook({
          event: "PreToolUse",
          handler: { type: "rule", action: "block", message: "No pattern" },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPreToolUseContext({ toolName: "any_tool" })
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("block")
    })

    it("should not match when tool name does not match pattern", async () => {
      const hooks = [
        createHook({
          event: "PreToolUse",
          toolNamePattern: "^github__",
          handler: {
            type: "rule",
            action: "block",
            message: "Should not match",
          },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPreToolUseContext({
        toolName: "browser__screenshot",
      })
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("allow")
    })

    it("should handle invalid regex patterns gracefully", async () => {
      const hooks = [
        createHook({
          event: "PreToolUse",
          toolNamePattern: "[invalid(regex",
          handler: {
            type: "rule",
            action: "block",
            message: "Invalid pattern",
          },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPreToolUseContext()
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("allow")
    })

    it("should reject patterns that are too long", async () => {
      const longPattern = "a".repeat(250)
      const hooks = [
        createHook({
          event: "PreToolUse",
          toolNamePattern: longPattern,
          handler: { type: "rule", action: "block", message: "Long pattern" },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPreToolUseContext()
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("allow")
    })

    it("should match exact tool names", async () => {
      const hooks = [
        createHook({
          event: "PreToolUse",
          toolNamePattern: "^browser__screenshot$",
          handler: { type: "rule", action: "block", message: "Exact match" },
        }),
      ]
      executor.setHooks(hooks)

      const exactContext = createPreToolUseContext({
        toolName: "browser__screenshot",
      })
      const partialContext = createPreToolUseContext({
        toolName: "browser__screenshot_full",
      })

      const exactDecision = await executor.evaluatePreToolUse(exactContext)
      const partialDecision = await executor.evaluatePreToolUse(partialContext)

      expect(exactDecision.action).toBe("block")
      expect(partialDecision.action).toBe("allow")
    })
  })

  describe("skill-based hook evaluation", () => {
    it("should block when skill content contains block pattern with tool name", async () => {
      const skill = createSkill({
        id: "blocker-skill",
        name: "Blocker Skill",
        content: "Block if tool is screenshot. Deny screenshot usage.",
      })
      executor.setSkills([skill])

      const hooks = [
        createHook({
          event: "PreToolUse",
          handler: { type: "skill", skillRef: "blocker-skill" },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPreToolUseContext({
        toolName: "browser__screenshot",
      })
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("block")
      expect(decision.reason).toBe("Blocked by skill: Blocker Skill")
    })

    it("should block when skill content has block and tool name together", async () => {
      const skill = createSkill({
        id: "blocker-skill",
        name: "Blocker Skill",
        content: "block browser__screenshot tool calls",
      })
      executor.setSkills([skill])

      const hooks = [
        createHook({
          event: "PreToolUse",
          handler: { type: "skill", skillRef: "blocker-skill" },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPreToolUseContext({
        toolName: "browser__screenshot",
      })
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("block")
    })

    it("should allow when skill content does not block the tool", async () => {
      const skill = createSkill({
        id: "allow-skill",
        name: "Allow Skill",
        content: "Allow all browser tools for testing",
      })
      executor.setSkills([skill])

      const hooks = [
        createHook({
          event: "PreToolUse",
          handler: { type: "skill", skillRef: "allow-skill" },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPreToolUseContext({
        toolName: "browser__screenshot",
      })
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("allow")
    })

    it("should be case-insensitive for skill content matching", async () => {
      const skill = createSkill({
        id: "case-skill",
        name: "Case Skill",
        content: "BLOCK BROWSER__SCREENSHOT TOOL",
      })
      executor.setSkills([skill])

      const hooks = [
        createHook({
          event: "PreToolUse",
          handler: { type: "skill", skillRef: "case-skill" },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPreToolUseContext({
        toolName: "BROWSER__SCREENSHOT",
      })
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("block")
    })

    it("should match block patterns with deny/reject/prevent keywords", async () => {
      const skill = createSkill({
        id: "deny-skill",
        name: "Deny Skill",
        content: "Prevent delete operations",
      })
      executor.setSkills([skill])

      const hooks = [
        createHook({
          event: "PreToolUse",
          handler: { type: "skill", skillRef: "deny-skill" },
        }),
      ]
      executor.setHooks(hooks)

      const context = createPreToolUseContext({
        toolName: "filesystem__delete",
      })
      const decision = await executor.evaluatePreToolUse(context)

      expect(decision.action).toBe("block")
      expect(decision.reason).toBe("Blocked by skill: Deny Skill")
    })
  })
})
