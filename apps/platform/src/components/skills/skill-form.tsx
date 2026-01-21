"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Loader2, BookOpen, Plus, X, Tag } from "lucide-react"
import type { Skill, SkillFormData } from "@/types"
import { MarkdownEditorWithPreview } from "@/components/ui/markdown-editor-with-preview"

interface SkillFormProps {
  skill?: Skill
  onSubmit: (data: SkillFormData) => Promise<void>
  cancelHref: string
  submitLabel?: string
}

export function SkillForm({
  skill,
  onSubmit,
  cancelHref,
  submitLabel = "Create Skill",
}: SkillFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [name, setName] = useState(skill?.name || "")
  const [description, setDescription] = useState(skill?.description || "")
  const [content, setContent] = useState(skill?.content || "")
  const [tags, setTags] = useState<string[]>(skill?.tags || [])
  const [newTag, setNewTag] = useState("")
  const [isEnabled, setIsEnabled] = useState(skill?.isEnabled ?? true)

  const isValid = Boolean(name.trim() && content.trim())

  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setNewTag("")
    }
  }

  const handleRemoveTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData: SkillFormData = {
        name: name.trim(),
        description: description.trim(),
        content: content.trim(),
        tags,
        isEnabled,
      }

      await onSubmit(formData)
      toast.success(
        skill ? "Skill updated successfully" : "Skill created successfully"
      )
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "An unexpected error occurred"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-blue-100">
          <BookOpen className="h-10 w-10 text-blue-600" />
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
            placeholder="Code Review Expert"
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
            placeholder="A brief description of what this skill provides..."
            rows={2}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-900">Skill Content</h3>

        <div>
          <label
            htmlFor="content"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Content (Markdown)
          </label>
          <MarkdownEditorWithPreview
            id="content"
            value={content}
            onChange={setContent}
            placeholder="# Skill Instructions&#10;&#10;Write the AI instructions in markdown format..."
            minHeight="300px"
          />
          <p className="mt-1 text-xs text-gray-500">
            Define the AI&apos;s capabilities and instructions using markdown
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900">Tags</h3>
          <span className="text-sm text-gray-400">(optional)</span>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-sm text-blue-700"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(index)}
                  className="ml-1 rounded-sm p-0.5 text-blue-400 hover:bg-blue-100 hover:text-blue-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g., development, testing"
            className="block flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
          <button
            type="button"
            onClick={handleAddTag}
            disabled={!newTag.trim()}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
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
