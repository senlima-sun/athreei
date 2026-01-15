"use client"

import Link from "next/link"
import { BookOpen, Settings, Tag, ToggleLeft, ToggleRight } from "lucide-react"
import type { Skill } from "@/types"

interface SkillCardProps {
  skill: Skill
  href?: string
  showActions?: boolean
  onToggle?: (id: string, enabled: boolean) => void
}

export function SkillCard({
  skill,
  href,
  showActions = true,
  onToggle,
}: SkillCardProps) {
  const CardContent = () => (
    <>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <BookOpen className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{skill.name}</h3>
            {skill.description && (
              <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">
                {skill.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Enabled badge */}
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              skill.isEnabled
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                skill.isEnabled ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            {skill.isEnabled ? "Enabled" : "Disabled"}
          </span>

          {/* Version badge */}
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            v{skill.version}
          </span>
        </div>
      </div>

      {/* Content preview */}
      <div className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600 line-clamp-2">
        {skill.content.substring(0, 150)}
        {skill.content.length > 150 && "..."}
      </div>

      {/* Tags */}
      {skill.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {skill.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {showActions && (
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          {onToggle && (
            <button
              type="button"
              onClick={() => onToggle(skill.id, !skill.isEnabled)}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100"
            >
              {skill.isEnabled ? (
                <ToggleRight className="h-4 w-4 text-green-600" />
              ) : (
                <ToggleLeft className="h-4 w-4 text-gray-400" />
              )}
              {skill.isEnabled ? "Disable" : "Enable"}
            </button>
          )}
          {href && (
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              <Settings className="h-4 w-4" />
              Edit
            </Link>
          )}
        </div>
      )}
    </>
  )

  if (href && !showActions) {
    return (
      <Link
        href={href}
        className="block rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 hover:bg-gray-50"
      >
        <CardContent />
      </Link>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <CardContent />
    </div>
  )
}

interface SkillCardGridProps {
  skills: Skill[]
  baseHref?: string
  showActions?: boolean
  onToggle?: (id: string, enabled: boolean) => void
}

export function SkillCardGrid({
  skills,
  baseHref,
  showActions = true,
  onToggle,
}: SkillCardGridProps) {
  return (
    <div className="space-y-4">
      {skills.map((skill) => (
        <SkillCard
          key={skill.id}
          skill={skill}
          href={baseHref ? `${baseHref}/${skill.id}` : undefined}
          showActions={showActions}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}
