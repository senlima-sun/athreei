"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  PageHeader,
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/dashboard"
import { SkillCardGrid } from "@/components/skills"
import { useActiveOrganization } from "@/lib/auth-client"
import { Plus, BookOpen } from "lucide-react"
import { API_URL } from "@/constants"
import type { Skill } from "@/types"

export default function SkillsPage() {
  const { data: activeOrg, isPending: isOrgPending } = useActiveOrganization()
  const [skills, setSkills] = useState<Skill[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSkills = async () => {
    if (!activeOrg?.id) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `${API_URL}/api/skills?organizationId=${activeOrg.id}`,
        { credentials: "include" }
      )

      if (!response.ok) {
        throw new Error("Failed to fetch skills")
      }

      const data = await response.json()
      setSkills(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load skills")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isOrgPending) {
      loadSkills()
    }
  }, [activeOrg?.id, isOrgPending])

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      const response = await fetch(
        `${API_URL}/api/skills/${id}?organizationId=${activeOrg?.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isEnabled: enabled }),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to update skill")
      }

      setSkills((prev) =>
        prev.map((skill) =>
          skill.id === id ? { ...skill, isEnabled: enabled } : skill
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update skill")
    }
  }

  if (isOrgPending || isLoading) {
    return (
      <div>
        <PageHeader
          title="Skills"
          description="Manage AI skill definitions that enhance capabilities"
        />
        <LoadingState />
      </div>
    )
  }

  if (!activeOrg) {
    return (
      <div>
        <PageHeader
          title="Skills"
          description="Manage AI skill definitions that enhance capabilities"
        />
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-sm text-yellow-700">
            Please select an organization to view skills.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader
          title="Skills"
          description="Manage AI skill definitions that enhance capabilities"
        />
        <ErrorState message={error} onRetry={() => loadSkills()} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Skills"
        description="Manage AI skill definitions that enhance capabilities"
        actions={
          <Link
            href="/dashboard/skills/new"
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            New Skill
          </Link>
        }
      />

      {skills.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No skills yet"
          description="Create your first skill to define AI capabilities and behaviors."
          action={{
            label: "Create Skill",
            href: "/dashboard/skills/new",
            icon: Plus,
          }}
        />
      ) : (
        <SkillCardGrid
          skills={skills}
          baseHref="/dashboard/skills"
          showActions={true}
          onToggle={handleToggle}
        />
      )}
    </div>
  )
}
