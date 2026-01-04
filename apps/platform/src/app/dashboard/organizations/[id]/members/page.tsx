"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { PageHeader } from "@/components/dashboard/page-header"
import {
  useListOrganizations,
  organization,
  useSession,
} from "@/lib/auth-client"
import {
  Users,
  Plus,
  Mail,
  Crown,
  Shield,
  User,
  Loader2,
  X,
  Trash2,
} from "lucide-react"
import Link from "next/link"

interface Member {
  id: string
  userId: string
  role: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

interface Organization {
  id: string
  name: string
  slug?: string | null
  logo?: string | null
  createdAt: Date
}

export default function OrganizationMembersPage() {
  const params = useParams()
  const orgId = params.id as string

  const { data: session } = useSession()
  const { data: orgList, isPending: isOrgListPending } = useListOrganizations()
  const currentOrg = (orgList as Organization[] | undefined)?.find(
    (o: Organization) => o.id === orgId
  )

  const [members, setMembers] = useState<Member[]>([])
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("member")
  const [isInviting, setIsInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load members
  useEffect(() => {
    async function loadMembers() {
      if (!orgId) return

      try {
        const result = await organization.listMembers({
          query: { organizationId: orgId },
        })

        if (result.data && "members" in result.data) {
          setMembers(result.data.members as Member[])
        }
      } catch (err) {
        console.error("Failed to load members:", err)
      } finally {
        setIsLoadingMembers(false)
      }
    }

    loadMembers()
  }, [orgId])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsInviting(true)

    try {
      const result = await organization.inviteMember({
        organizationId: orgId,
        email: inviteEmail.trim(),
        role: inviteRole as "admin" | "member",
      })

      if (result.error) {
        setError(result.error.message || "Failed to send invitation")
        return
      }

      // Refresh members list
      const membersResult = await organization.listMembers({
        query: { organizationId: orgId },
      })
      if (membersResult.data && "members" in membersResult.data) {
        setMembers(membersResult.data.members as Member[])
      }

      setShowInviteModal(false)
      setInviteEmail("")
      setInviteRole("member")
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return

    try {
      await organization.removeMember({
        organizationId: orgId,
        memberIdOrEmail: memberId,
      })

      setMembers(members.filter((m) => m.id !== memberId))
    } catch (err) {
      console.error("Failed to remove member:", err)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-amber-500" />
      case "admin":
        return <Shield className="h-4 w-4 text-blue-500" />
      default:
        return <User className="h-4 w-4 text-gray-400" />
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner":
        return "Owner"
      case "admin":
        return "Admin"
      default:
        return "Member"
    }
  }

  if (isOrgListPending) {
    return (
      <div>
        <PageHeader title="Team Members" />
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600" />
        </div>
      </div>
    )
  }

  if (!currentOrg) {
    return (
      <div>
        <PageHeader title="Organization not found" />
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            This organization doesn&apos;t exist or you don&apos;t have access
            to it.
          </p>
          <Link
            href="/dashboard/organizations"
            className="mt-4 inline-block text-sm font-medium text-gray-900 hover:underline"
          >
            Back to organizations
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={`${currentOrg.name} - Team Members`}
        description="Manage who has access to this organization"
        actions={
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Invite member
          </button>
        }
      />

      {/* Members list */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {isLoadingMembers ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-600" />
          </div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No members yet
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Invite team members to collaborate on this organization.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  {member.user.image ? (
                    <img
                      src={member.user.image}
                      alt={member.user.name || "Member"}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
                      {(member.user.name || member.user.email)[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">
                      {member.user.name || member.user.email}
                      {member.userId === session?.user?.id && (
                        <span className="ml-2 text-xs text-gray-500">
                          (you)
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">{member.user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    {getRoleIcon(member.role)}
                    <span className="text-sm text-gray-600">
                      {getRoleLabel(member.role)}
                    </span>
                  </div>

                  {member.role !== "owner" &&
                    member.userId !== session?.user?.id && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Invite team member
              </h2>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email address
                </label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    required
                    className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="role"
                  className="block text-sm font-medium text-gray-700"
                >
                  Role
                </label>
                <select
                  id="role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Admins can manage members and settings.
                </p>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting || !inviteEmail.trim()}
                  className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isInviting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
