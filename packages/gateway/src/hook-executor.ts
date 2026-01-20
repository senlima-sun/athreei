import type {
  HookConfig,
  PreToolUseContext,
  PostToolUseContext,
  HookDecision,
  SkillConfig,
  RuleConfig,
} from "./types"
import { log } from "./logger"

export class HookExecutor {
  private hooks: HookConfig[] = []
  private skills: Map<string, SkillConfig> = new Map()
  private rules: Map<string, RuleConfig> = new Map()

  setHooks(hooks: HookConfig[]): void {
    this.hooks = hooks
      .filter((h) => h.isEnabled !== false)
      .sort((a, b) => (b.priority ?? 100) - (a.priority ?? 100))
    log.debug(`HookExecutor: loaded ${this.hooks.length} hooks`)
  }

  setSkills(skills: SkillConfig[]): void {
    this.skills = new Map(skills.map((s) => [s.id, s]))
    log.debug(`HookExecutor: loaded ${this.skills.size} skills`)
  }

  setRules(rules: RuleConfig[]): void {
    this.rules = new Map(rules.map((r) => [r.id, r]))
    log.debug(`HookExecutor: loaded ${this.rules.size} rules`)
  }

  async evaluatePreToolUse(context: PreToolUseContext): Promise<HookDecision> {
    const relevantHooks = this.hooks.filter(
      (h) =>
        h.event === "PreToolUse" &&
        this.matchesPattern(context.toolName, h.toolNamePattern)
    )

    if (relevantHooks.length === 0) {
      return { action: "allow" }
    }

    let currentArgs = context.arguments

    for (const hook of relevantHooks) {
      const decision = await this.executeHookHandler(hook, {
        ...context,
        arguments: currentArgs,
      })

      if (decision.action === "block") {
        log.info(`PreToolUse blocked by hook ${hook.id}: ${decision.reason}`)
        return decision
      }

      if (decision.action === "modify" && decision.modifiedArgs) {
        currentArgs = decision.modifiedArgs
      }
    }

    return {
      action: "allow",
      modifiedArgs: currentArgs,
    }
  }

  async evaluatePostToolUse(context: PostToolUseContext): Promise<void> {
    const relevantHooks = this.hooks.filter(
      (h) =>
        h.event === "PostToolUse" &&
        this.matchesPattern(context.toolName, h.toolNamePattern)
    )

    if (relevantHooks.length === 0) {
      return
    }

    const results = await Promise.allSettled(
      relevantHooks.map((hook) => this.executeHookHandler(hook, context))
    )

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result && result.status === "rejected") {
        const hook = relevantHooks[i]
        log.error(
          `PostToolUse hook ${hook?.id ?? "unknown"} failed:`,
          result.reason
        )
      }
    }
  }

  private matchesPattern(toolName: string, pattern?: string): boolean {
    if (!pattern) return true

    if (pattern.length > 200) {
      log.warn(`Hook pattern too long (${pattern.length} chars), skipping`)
      return false
    }

    try {
      const regex = new RegExp(pattern)
      const startTime = Date.now()
      const result = regex.test(toolName)
      const elapsed = Date.now() - startTime

      if (elapsed > 50) {
        log.warn(
          `Regex pattern took ${elapsed}ms (potential ReDoS): ${pattern.substring(0, 50)}...`
        )
      }

      return result
    } catch {
      log.warn(`Invalid hook pattern: ${pattern}`)
      return false
    }
  }

  private async executeHookHandler(
    hook: HookConfig,
    context: PreToolUseContext | PostToolUseContext
  ): Promise<HookDecision> {
    const handler = hook.handler

    switch (handler.type) {
      case "rule":
        return {
          action: handler.action === "ask" ? "allow" : handler.action,
          reason: handler.message,
        }

      case "skill": {
        const skill = this.skills.get(handler.skillRef)
        if (!skill) {
          log.warn(`Hook references unknown skill: ${handler.skillRef}`)
          return { action: "allow" }
        }
        return this.evaluateSkillBasedHook(skill, context)
      }

      case "script":
        return this.executeScriptHandler(handler, context)

      default:
        return { action: "allow" }
    }
  }

  private async evaluateSkillBasedHook(
    skill: SkillConfig,
    context: PreToolUseContext | PostToolUseContext
  ): Promise<HookDecision> {
    const content = skill.content.toLowerCase()
    const toolName = context.toolName.toLowerCase()

    const blockPatterns = [
      /block\s+(?:if|when).*?(?:tool|command).*?([\w_]+)/gi,
      /(?:deny|reject|prevent).*?([\w_]+)/gi,
    ]

    for (const pattern of blockPatterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        const blockedTool = match[1]?.toLowerCase()
        if (blockedTool && toolName.includes(blockedTool)) {
          return {
            action: "block",
            reason: `Blocked by skill: ${skill.name}`,
          }
        }
      }
    }

    if (content.includes("block") && content.includes(toolName)) {
      return {
        action: "block",
        reason: `Blocked by skill: ${skill.name}`,
      }
    }

    return { action: "allow" }
  }

  private async executeScriptHandler(
    _handler: { command: string; args?: string[] },
    _context: PreToolUseContext | PostToolUseContext
  ): Promise<HookDecision> {
    log.warn(
      "Script hook handlers are disabled for security reasons. Use skill or rule handlers instead."
    )
    return { action: "allow" }
  }
}

export function createHookExecutor(): HookExecutor {
  return new HookExecutor()
}
