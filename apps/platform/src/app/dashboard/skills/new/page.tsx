"use client"

import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/dashboard/page-header"
import { SkillForm } from "@/components/skills"
import { useActiveOrganization } from "@/lib/auth-client"
import { API_URL } from "@/constants"
import type { SkillFormData } from "@/types"

export default function NewSkillPage() {
  const router = useRouter()
  const { data: activeOrg } = useActiveOrganization()

  const handleSubmit = async (data: SkillFormData) => {
    if (!activeOrg?.id) {
      throw new Error("Please select an organization first")
    }

    const response = await fetch(
      `${API_URL}/api/skills?organizationId=${activeOrg.id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to create skill")
    }

    const result = await response.json()
    router.push(`/dashboard/skills/${result.data.id}`)
  }

  if (!activeOrg) {
    return (
      <div>
        <PageHeader
          title="Create Skill"
          description="Define AI capabilities with markdown instructions"
        />
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-sm text-yellow-700">
            Please select an organization to create a skill.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Create Skill"
        description="Define AI capabilities with markdown instructions"
      />

      <div className="mx-auto max-w-lg">
        <SkillForm
          onSubmit={handleSubmit}
          cancelHref="/dashboard/skills"
          submitLabel="Create Skill"
        />
      </div>
    </div>
  )
}
