"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { organization } from "@/lib/auth-client"
import { Mail, Plus, Loader2, X, Users } from "lucide-react"

interface PendingInvite {
  email: string
  role: "admin" | "member"
}

interface InviteTeamStepProps {
  organizationId: string
  organizationName: string
}

/**
 * InviteTeamStep - Second step of onboarding: invite team members (optional).
 */
export function InviteTeamStep({
  organizationId,
  organizationName,
}: InviteTeamStepProps) {
  const router = useRouter()
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "member">("member")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addInvite = () => {
    const trimmedEmail = email.trim().toLowerCase()

    // Validate email format
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address")
      return
    }

    // Check for duplicates
    if (invites.some((inv) => inv.email === trimmedEmail)) {
      setError("This email is already in the list")
      return
    }

    setInvites([...invites, { email: trimmedEmail, role }])
    setEmail("")
    setRole("member")
    setError(null)
  }

  const removeInvite = (emailToRemove: string) => {
    setInvites(invites.filter((inv) => inv.email !== emailToRemove))
  }

  const handleSkip = () => {
    router.push("/dashboard")
  }

  const handleComplete = async () => {
    setError(null)
    setIsSubmitting(true)

    try {
      // Send all invitations
      const results = await Promise.allSettled(
        invites.map((invite) =>
          organization.inviteMember({
            organizationId,
            email: invite.email,
            role: invite.role,
          })
        )
      )

      // Check for any failures
      const failures = results.filter(
        (r) =>
          r.status === "rejected" || (r.status === "fulfilled" && r.value.error)
      )

      if (failures.length > 0) {
        console.error("Some invitations failed:", failures)
        // Continue anyway - partial success is okay for onboarding
      }

      router.push("/dashboard")
    } catch {
      setError("Failed to send invitations. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addInvite()
    }
  }

  return (
    <div className="rounded-lg bg-white p-8 shadow">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold text-gray-900">
          Invite your team
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Add team members to{" "}
          <span className="font-medium">{organizationName}</span>
        </p>
      </div>

      <div className="space-y-6">
        {/* Add invite form */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email address
          </label>
          <div className="mt-1 flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="colleague@company.com"
                className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "member")}
              className="rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="button"
              onClick={addInvite}
              disabled={!email.trim()}
              className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>

        {/* Pending invites list */}
        {invites.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Pending invitations ({invites.length})
            </label>
            <ul className="mt-2 divide-y divide-gray-100 rounded-md border border-gray-200">
              {invites.map((invite) => (
                <li
                  key={invite.email}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-900">
                      {invite.email}
                    </span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      {invite.role}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeInvite(invite.email)}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty state */}
        {invites.length === 0 && (
          <div className="rounded-md border border-dashed border-gray-300 p-6 text-center">
            <Users className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">
              Add team members above or skip for now
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="flex-1 rounded-md border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={handleComplete}
            disabled={isSubmitting || invites.length === 0}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {invites.length > 0
              ? `Send ${invites.length} invitation${invites.length > 1 ? "s" : ""}`
              : "Complete setup"}
          </button>
        </div>
      </div>
    </div>
  )
}
