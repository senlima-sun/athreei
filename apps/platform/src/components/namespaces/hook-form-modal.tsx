"use client"

import { useState } from "react"
import { X, Loader2 } from "lucide-react"
import type { HookEvent, HookHandler } from "./namespace-hook-list"

interface HookFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (hook: {
    event: HookEvent
    toolNamePattern?: string
    handler: HookHandler
    priority: number
  }) => Promise<void>
  availableSkills?: Array<{ id: string; name: string }>
}

const hookEvents: { value: HookEvent; label: string; description: string }[] = [
  {
    value: "PreToolUse",
    label: "Pre Tool Use",
    description: "Runs before tool execution. Can block or modify the call.",
  },
  {
    value: "PostToolUse",
    label: "Post Tool Use",
    description: "Runs after tool completes. For logging or notifications.",
  },
  {
    value: "SessionStart",
    label: "Session Start",
    description: "Runs when a new session begins.",
  },
  {
    value: "SessionEnd",
    label: "Session End",
    description: "Runs when a session ends.",
  },
  {
    value: "Stop",
    label: "Stop",
    description: "Runs when the agent stops.",
  },
]

export function HookFormModal({
  isOpen,
  onClose,
  onSubmit,
  availableSkills = [],
}: HookFormModalProps) {
  const [event, setEvent] = useState<HookEvent>("PreToolUse")
  const [toolNamePattern, setToolNamePattern] = useState("")
  const [handlerType, setHandlerType] = useState<"rule" | "skill">("rule")
  const [ruleAction, setRuleAction] = useState<"block" | "allow" | "ask">(
    "block"
  )
  const [ruleMessage, setRuleMessage] = useState("")
  const [skillRef, setSkillRef] = useState("")
  const [priority, setPriority] = useState(100)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      let handler: HookHandler

      if (handlerType === "rule") {
        handler = {
          type: "rule",
          action: ruleAction,
          message: ruleMessage || undefined,
        }
      } else {
        if (!skillRef) {
          setError("Please select a skill")
          setIsSubmitting(false)
          return
        }
        handler = {
          type: "skill",
          skillRef,
        }
      }

      await onSubmit({
        event,
        toolNamePattern: toolNamePattern || undefined,
        handler,
        priority,
      })

      setEvent("PreToolUse")
      setToolNamePattern("")
      setHandlerType("rule")
      setRuleAction("block")
      setRuleMessage("")
      setSkillRef("")
      setPriority(100)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create hook")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        role="button"
        tabIndex={-1}
      />
      <div className="relative z-10 w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Create Hook</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Event
              </label>
              <select
                value={event}
                onChange={(e) => setEvent(e.target.value as HookEvent)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              >
                {hookEvents.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {hookEvents.find((e) => e.value === event)?.description}
              </p>
            </div>

            {(event === "PreToolUse" || event === "PostToolUse") && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tool Name Pattern (optional)
                </label>
                <input
                  type="text"
                  value={toolNamePattern}
                  onChange={(e) => setToolNamePattern(e.target.value)}
                  placeholder="^bash__.*|^write_file__.*"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Regex pattern to match tool names. Leave empty to match all
                  tools.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Handler Type
              </label>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="handlerType"
                    value="rule"
                    checked={handlerType === "rule"}
                    onChange={() => setHandlerType("rule")}
                    className="h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-500"
                  />
                  <span className="text-sm text-gray-700">Simple Rule</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="handlerType"
                    value="skill"
                    checked={handlerType === "skill"}
                    onChange={() => setHandlerType("skill")}
                    className="h-4 w-4 border-gray-300 text-gray-900 focus:ring-gray-500"
                  />
                  <span className="text-sm text-gray-700">Skill-based</span>
                </label>
              </div>
            </div>

            {handlerType === "rule" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Action
                  </label>
                  <select
                    value={ruleAction}
                    onChange={(e) =>
                      setRuleAction(e.target.value as "block" | "allow" | "ask")
                    }
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  >
                    <option value="block">Block</option>
                    <option value="allow">Allow</option>
                    <option value="ask">Ask</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Message (optional)
                  </label>
                  <input
                    type="text"
                    value={ruleMessage}
                    onChange={(e) => setRuleMessage(e.target.value)}
                    placeholder="This action is not allowed"
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  />
                </div>
              </>
            )}

            {handlerType === "skill" && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Skill
                </label>
                {availableSkills.length === 0 ? (
                  <p className="mt-1 text-sm text-gray-500">
                    No skills available. Create a skill first.
                  </p>
                ) : (
                  <select
                    value={skillRef}
                    onChange={(e) => setSkillRef(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  >
                    <option value="">Select a skill...</option>
                    {availableSkills.map((skill) => (
                      <option key={skill.id} value={skill.id}>
                        {skill.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Priority
              </label>
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value, 10) || 0)}
                min={0}
                max={1000}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Higher priority hooks run first (0-1000).
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Hook
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
