"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Plus, Building2, Check, Monitor } from "lucide-react"
import {
  useActiveOrganization,
  useListOrganizations,
  organization,
} from "@/lib/auth-client"
import { isLocalMode } from "@/lib/mode"

interface Organization {
  id: string
  name: string
  slug?: string | null
  logo?: string | null
  createdAt: Date
}

export function OrgSwitcher() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const localMode = isLocalMode()

  const { data: activeOrg, isPending: isActiveOrgPending } =
    useActiveOrganization()
  const { data: orgList, isPending: isOrgListPending } = useListOrganizations()

  const organizations = (orgList ?? []) as Organization[]
  const isPending = isActiveOrgPending || isOrgListPending

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSwitchOrg = async (orgId: string) => {
    await organization.setActive({ organizationId: orgId })
    setOpen(false)
    // Refresh to update the active organization state
    router.refresh()
  }

  const handleCreateOrg = () => {
    setOpen(false)
    router.push("/dashboard/organizations/new")
  }

  // In local mode, show static indicator instead of org dropdown
  if (localMode) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-600">
        <Monitor className="h-4 w-4 text-gray-500" />
        <span>Local</span>
      </div>
    )
  }

  if (isPending) {
    return <div className="h-9 w-32 animate-pulse rounded-md bg-gray-100" />
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <Building2 className="h-4 w-4 text-gray-500" />
        <span className="max-w-[120px] truncate">
          {activeOrg?.name || "Select org"}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Organizations
          </div>

          <div className="max-h-60 overflow-y-auto">
            {organizations.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                No organizations yet
              </div>
            ) : (
              organizations.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => handleSwitchOrg(org.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <span className="flex-1 truncate">{org.name}</span>
                  {activeOrg?.id === org.id && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </button>
              ))
            )}
          </div>

          <div className="border-t border-gray-100 pt-1">
            <button
              type="button"
              onClick={handleCreateOrg}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4 text-gray-400" />
              Create organization
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
