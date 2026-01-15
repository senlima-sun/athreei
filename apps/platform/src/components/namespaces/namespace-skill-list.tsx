"use client"

import { useState } from "react"
import {
  BookOpen,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from "lucide-react"

export interface NamespaceSkill {
  id: string
  skillId: string
  name: string
  description?: string | null
  tags: string[]
  enabled: boolean
}

interface NamespaceSkillListProps {
  skills: NamespaceSkill[]
  onRemove: (skillId: string) => Promise<void>
  onToggleEnabled: (skillId: string, enabled: boolean) => Promise<void>
}

export function NamespaceSkillList({
  skills,
  onRemove,
  onToggleEnabled,
}: NamespaceSkillListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null)

  const handleRemove = async (skillId: string) => {
    setRemovingId(skillId)
    try {
      await onRemove(skillId)
    } finally {
      setRemovingId(null)
      setConfirmRemoveId(null)
    }
  }

  const handleToggle = async (skillId: string, currentEnabled: boolean) => {
    setTogglingId(skillId)
    try {
      await onToggleEnabled(skillId, !currentEnabled)
    } finally {
      setTogglingId(null)
    }
  }

  if (skills.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
        <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No skills in this namespace
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Add skills to this namespace to define AI capabilities.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <ul className="divide-y divide-gray-200">
        {skills.map((skill) => (
          <li key={skill.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{skill.name}</p>
                    {!skill.enabled && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {skill.description && (
                      <span className="line-clamp-1">{skill.description}</span>
                    )}
                    {skill.tags.length > 0 && (
                      <span className="flex gap-1">
                        {skill.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                          >
                            {tag}
                          </span>
                        ))}
                        {skill.tags.length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{skill.tags.length - 3}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(skill.skillId, skill.enabled)}
                  disabled={togglingId === skill.skillId}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                  title={skill.enabled ? "Disable skill" : "Enable skill"}
                >
                  {togglingId === skill.skillId ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : skill.enabled ? (
                    <ToggleRight className="h-5 w-5 text-green-600" />
                  ) : (
                    <ToggleLeft className="h-5 w-5" />
                  )}
                </button>

                {confirmRemoveId === skill.skillId ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleRemove(skill.skillId)}
                      disabled={removingId === skill.skillId}
                      className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {removingId === skill.skillId ? "..." : "Confirm"}
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
                    onClick={() => setConfirmRemoveId(skill.skillId)}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                    title="Remove from namespace"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
