"use client"

import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/dashboard/page-header"
import { RuleForm } from "@/components/rules"
import { useActiveOrganization } from "@/lib/auth-client"
import { API_URL } from "@/constants"
import type { RuleFormData } from "@/types"

export default function NewRulePage() {
  const router = useRouter()
  const { data: activeOrg } = useActiveOrganization()

  const handleSubmit = async (data: RuleFormData) => {
    if (!activeOrg?.id) {
      throw new Error("Please select an organization first")
    }

    const response = await fetch(
      `${API_URL}/api/rules?organizationId=${activeOrg.id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to create rule")
    }

    const result = await response.json()
    router.push(`/dashboard/rules/${result.data.id}`)
  }

  if (!activeOrg) {
    return (
      <div>
        <PageHeader
          title="Create Rule"
          description="Define AI behavior guidelines and constraints"
        />
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-sm text-yellow-700">
            Please select an organization to create a rule.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Create Rule"
        description="Define AI behavior guidelines and constraints"
      />

      <div className="mx-auto max-w-lg">
        <RuleForm
          onSubmit={handleSubmit}
          cancelHref="/dashboard/rules"
          submitLabel="Create Rule"
        />
      </div>
    </div>
  )
}
