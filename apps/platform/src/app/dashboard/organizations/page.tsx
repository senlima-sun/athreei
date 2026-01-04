"use client"

import Link from "next/link"
import { PageHeader } from "@/components/dashboard/page-header"
import { useListOrganizations, useActiveOrganization } from "@/lib/auth-client"
import { Building2, Plus, Users, Settings } from "lucide-react"

interface Organization {
  id: string
  name: string
  slug?: string | null
  logo?: string | null
  createdAt: Date
}

export default function OrganizationsPage() {
  const { data: orgList, isPending: isOrgListPending } = useListOrganizations()
  const { data: activeOrg, isPending: isActiveOrgPending } =
    useActiveOrganization()

  const isPending = isOrgListPending || isActiveOrgPending
  const organizations = (orgList ?? []) as Organization[]

  if (isPending) {
    return (
      <div>
        <PageHeader
          title="Organizations"
          description="Manage your organizations and teams"
        />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Manage your organizations and teams"
        actions={
          <Link
            href="/dashboard/organizations/new"
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            New organization
          </Link>
        }
      />

      {organizations.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-200 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No organizations yet
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Create your first organization to start collaborating with your
            team.
          </p>
          <Link
            href="/dashboard/organizations/new"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Create organization
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {organizations.map((org) => (
            <div
              key={org.id}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                    <Building2 className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{org.name}</h3>
                      {activeOrg?.id === org.id && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {org.slug || org.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/organizations/${org.id}/members`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <Users className="h-4 w-4" />
                    Members
                  </Link>
                  <Link
                    href={`/dashboard/organizations/${org.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
