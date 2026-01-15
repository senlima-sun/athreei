"use client"

import { useState } from "react"
import { X, BookOpen, Search, Plus, Check, Tag } from "lucide-react"

export interface PickerSkill {
  id: string
  name: string
  description?: string | null
  tags: string[]
  isEnabled: boolean
}

interface SkillPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (skillId: string) => Promise<void>
  availableSkills: PickerSkill[]
  excludeSkillIds?: string[]
}

export function SkillPickerModal({
  isOpen,
  onClose,
  onSelect,
  availableSkills,
  excludeSkillIds = [],
}: SkillPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdding, setIsAdding] = useState<string | null>(null)

  if (!isOpen) return null

  const filteredSkills = availableSkills.filter(
    (skill) =>
      !excludeSkillIds.includes(skill.id) &&
      (skill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        ))
  )

  const handleSelect = async (skillId: string) => {
    setIsAdding(skillId)
    try {
      await onSelect(skillId)
    } finally {
      setIsAdding(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900">Add Skill</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills by name, description, or tag..."
              className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {filteredSkills.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-sm font-medium text-gray-900">
                {searchQuery
                  ? "No skills match your search"
                  : "No skills available"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery
                  ? "Try a different search term"
                  : "All skills are already in this namespace"}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredSkills.map((skill) => (
                <li
                  key={skill.id}
                  className="flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{skill.name}</p>
                      {skill.description && (
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {skill.description}
                        </p>
                      )}
                      {skill.tags.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {skill.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700"
                            >
                              <Tag className="h-2.5 w-2.5" />
                              {tag}
                            </span>
                          ))}
                          {skill.tags.length > 3 && (
                            <span className="text-xs text-gray-400">
                              +{skill.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelect(skill.id)}
                    disabled={isAdding === skill.id}
                    className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAdding === skill.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-gray-200 p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
