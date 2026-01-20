"use client"

import { useState } from "react"
import {
  Zap,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Shield,
  ShieldOff,
  Sparkles,
  Ban,
} from "lucide-react"

export type HookEvent =
  | "PreToolUse"
  | "PostToolUse"
  | "SessionStart"
  | "SessionEnd"
  | "Stop"

export type HookHandler =
  | { type: "skill"; skillRef: string }
  | { type: "script"; command: string; args?: string[] }
  | { type: "rule"; action: "block" | "allow" | "ask"; message?: string }

export interface NamespaceHook {
  id: string
  event: HookEvent
  toolNamePattern?: string | null
  handler: HookHandler
  priority: number
  isEnabled: boolean
  sourcePluginId?: string | null
  createdAt: string
  updatedAt: string
}

interface NamespaceHookListProps {
  hooks: NamespaceHook[]
  onRemove: (hookId: string) => Promise<void>
  onToggleEnabled: (hookId: string, enabled: boolean) => Promise<void>
}

const eventLabels: Record<HookEvent, string> = {
  PreToolUse: "Pre Tool Use",
  PostToolUse: "Post Tool Use",
  SessionStart: "Session Start",
  SessionEnd: "Session End",
  Stop: "Stop",
}

const eventColors: Record<HookEvent, { bg: string; text: string }> = {
  PreToolUse: { bg: "bg-orange-100", text: "text-orange-700" },
  PostToolUse: { bg: "bg-blue-100", text: "text-blue-700" },
  SessionStart: { bg: "bg-green-100", text: "text-green-700" },
  SessionEnd: { bg: "bg-red-100", text: "text-red-700" },
  Stop: { bg: "bg-gray-100", text: "text-gray-700" },
}

function getHandlerIcon(handler: HookHandler) {
  switch (handler.type) {
    case "rule":
      if (handler.action === "block") return <Ban className="h-4 w-4" />
      if (handler.action === "allow") return <Shield className="h-4 w-4" />
      return <ShieldOff className="h-4 w-4" />
    case "skill":
      return <Sparkles className="h-4 w-4" />
    case "script":
      return <Zap className="h-4 w-4" />
  }
}

function getHandlerLabel(handler: HookHandler): string {
  switch (handler.type) {
    case "rule":
      return `${handler.action}${handler.message ? `: ${handler.message}` : ""}`
    case "skill":
      return `Skill: ${handler.skillRef}`
    case "script":
      return `Script: ${handler.command}`
  }
}

export function NamespaceHookList({
  hooks,
  onRemove,
  onToggleEnabled,
}: NamespaceHookListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const handleRemove = async (hookId: string) => {
    setRemovingId(hookId)
    try {
      await onRemove(hookId)
    } finally {
      setRemovingId(null)
      setConfirmRemoveId(null)
    }
  }

  const handleToggle = async (hookId: string, currentEnabled: boolean) => {
    setTogglingId(hookId)
    try {
      await onToggleEnabled(hookId, !currentEnabled)
    } finally {
      setTogglingId(null)
    }
  }

  if (hooks.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
        <Zap className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No hooks in this namespace
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Add hooks to intercept and control tool calls.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <ul className="divide-y divide-gray-200">
        {hooks.map((hook) => {
          const eventColor = eventColors[hook.event]
          const isPluginHook = !!hook.sourcePluginId

          return (
            <li key={hook.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                    <Zap className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${eventColor.bg} ${eventColor.text}`}
                      >
                        {eventLabels[hook.event]}
                      </span>
                      {!hook.isEnabled && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          Disabled
                        </span>
                      )}
                      {isPluginHook && (
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                          Plugin
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        {getHandlerIcon(hook.handler)}
                        {getHandlerLabel(hook.handler)}
                      </span>
                      {hook.toolNamePattern && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">
                          {hook.toolNamePattern}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        Priority: {hook.priority}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(hook.id, hook.isEnabled)}
                    disabled={togglingId === hook.id}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                    title={hook.isEnabled ? "Disable hook" : "Enable hook"}
                  >
                    {togglingId === hook.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : hook.isEnabled ? (
                      <ToggleRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                  </button>

                  {isPluginHook ? (
                    <span
                      className="cursor-not-allowed rounded p-1.5 text-gray-300"
                      title="Cannot delete plugin hooks"
                    >
                      <Trash2 className="h-5 w-5" />
                    </span>
                  ) : confirmRemoveId === hook.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleRemove(hook.id)}
                        disabled={removingId === hook.id}
                        className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {removingId === hook.id ? "..." : "Confirm"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveId(null)}
                        className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveId(hook.id)}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                      title="Remove hook"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
