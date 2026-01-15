"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, Scale, Globe, Boxes, Server } from "lucide-react"
import type { Rule, RuleFormData, RuleScope } from "@/types"

const SCOPE_OPTIONS: {
  value: RuleScope
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  {
    value: "global",
    label: "Global",
    description: "Applies to all namespaces and endpoints",
    icon: Globe,
  },
  {
    value: "namespace",
    label: "Namespace",
    description: "Applies when assigned to a namespace",
    icon: Boxes,
  },
  {
    value: "endpoint",
    label: "Endpoint",
    description: "Applies when assigned to an endpoint",
    icon: Server,
  },
]

interface RuleFormProps {
  rule?: Rule
  onSubmit: (data: RuleFormData) => Promise<void>
  cancelHref: string
  submitLabel?: string
}

export function RuleForm({
  rule,
  onSubmit,
  cancelHref,
  submitLabel = "Create Rule",
}: RuleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState(rule?.name || "")
  const [description, setDescription] = useState(rule?.description || "")
  const [content, setContent] = useState(rule?.content || "")
  const [priority, setPriority] = useState(rule?.priority ?? 100)
  const [scope, setScope] = useState<RuleScope>(rule?.scope || "namespace")
  const [isEnabled, setIsEnabled] = useState(rule?.isEnabled ?? true)

  const isValid = Boolean(name.trim() && content.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const formData: RuleFormData = {
        name: name.trim(),
        description: description.trim(),
        content: content.trim(),
        priority,
        scope,
        isEnabled,
      }

      await onSubmit(formData)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-purple-100">
          <Scale className="h-10 w-10 text-purple-600" />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Basic Information</h3>

        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Code Style Guidelines"
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
            <span className="ml-1 text-gray-400">(optional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A brief description of what this rule enforces..."
            rows={2}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Rule Content</h3>

        <div>
          <label
            htmlFor="content"
            className="block text-sm font-medium text-gray-700"
          >
            Content (Markdown)
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="# Rule Guidelines&#10;&#10;Define behavior constraints and guidelines..."
            rows={12}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Define behavior guidelines and constraints using markdown
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Scope</h3>
        <p className="text-sm text-gray-500">
          Determine where this rule applies
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          {SCOPE_OPTIONS.map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setScope(option.value)}
                className={`flex flex-col items-start rounded-lg border p-4 text-left transition-colors ${
                  scope === option.value
                    ? "border-purple-500 bg-purple-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    scope === option.value ? "text-purple-600" : "text-gray-400"
                  }`}
                />
                <span
                  className={`mt-2 font-medium ${
                    scope === option.value ? "text-purple-900" : "text-gray-900"
                  }`}
                >
                  {option.label}
                </span>
                <span
                  className={`mt-1 text-xs ${
                    scope === option.value ? "text-purple-700" : "text-gray-500"
                  }`}
                >
                  {option.description}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Priority</h3>
        <p className="text-sm text-gray-500">
          Lower numbers are applied first (0-1000)
        </p>

        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="1000"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="h-2 w-full appearance-none rounded-lg bg-gray-200 accent-purple-600"
          />
          <input
            type="number"
            min="0"
            max="1000"
            value={priority}
            onChange={(e) =>
              setPriority(Math.min(1000, Math.max(0, Number(e.target.value))))
            }
            className="w-20 rounded-md border border-gray-300 px-3 py-2 text-center text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Status</h3>
        <div className="flex gap-3">
          {[true, false].map((enabled) => (
            <button
              key={String(enabled)}
              type="button"
              onClick={() => setIsEnabled(enabled)}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                isEnabled === enabled
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {enabled ? "Enabled" : "Disabled"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
        <Link
          href={cancelHref}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting || !isValid}
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
