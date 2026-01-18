"use client"

import { authClient } from "@/lib/auth-client"

type UserRole = "admin" | "moderator" | "user"

/**
 * Hook for checking admin permissions client-side
 * Returns boolean flags for UI visibility
 */
export function useAdminPermissions() {
  const { data: session } = authClient.useSession()
  const role = (session?.user?.role as UserRole | undefined) || "user"

  const canManageUsers = role === "admin"

  const canImpersonate = role === "admin"

  const canListUsers = role === "admin" || role === "moderator"

  const isAdmin = role === "admin"
  const isModerator = role === "moderator"
  const hasAnyAdminAccess = isAdmin || isModerator

  return {
    canManageUsers,
    canImpersonate,
    canListUsers,

    role,
    isAdmin,
    isModerator,
    hasAnyAdminAccess,
  }
}
