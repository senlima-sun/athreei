"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import { useAdminPermissions } from "@/hooks/use-admin-permissions"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AdminUser } from "@/hooks/use-admin-users"

export function UserAdminActions({ user }: { user: AdminUser }) {
  const { canImpersonate, canManageUsers } = useAdminPermissions()
  const { data: session } = authClient.useSession()
  const queryClient = useQueryClient()

  const isCurrentUser = session?.user?.id === user.id

  const setRole = useMutation({
    mutationFn: async (role: string) => {
      const response = await authClient.admin.setRole({
        userId: user.id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: role as any,
      })
      if (response.error) {
        throw new Error(response.error.message || "Failed to update role")
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
    },
  })

  const banUser = useMutation({
    mutationFn: async () => {
      const response = await authClient.admin.banUser({
        userId: user.id,
        banReason: "Violation of terms of service",
      })
      if (response.error) {
        throw new Error(response.error.message || "Failed to ban user")
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
    },
  })

  const unbanUser = useMutation({
    mutationFn: async () => {
      const response = await authClient.admin.unbanUser({
        userId: user.id,
      })
      if (response.error) {
        throw new Error(response.error.message || "Failed to unban user")
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
    },
  })

  const impersonate = useMutation({
    mutationFn: async () => {
      const response = await authClient.admin.impersonateUser({
        userId: user.id,
      })
      if (response.error) {
        throw new Error(response.error.message || "Failed to impersonate user")
      }
      return response.data
    },
    onSuccess: () => {
      window.location.href = "/dashboard"
    },
  })

  const revokeSessions = useMutation({
    mutationFn: async () => {
      const response = await authClient.admin.revokeUserSessions({
        userId: user.id,
      })
      if (response.error) {
        throw new Error(
          response.error.message || "Failed to revoke user sessions"
        )
      }
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] })
    },
  })

  if (!canManageUsers) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost" size="sm">
          •••
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Change Role</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => setRole.mutate("admin")}
          disabled={isCurrentUser || user.role === "admin"}
        >
          Set as Admin
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setRole.mutate("moderator")}
          disabled={isCurrentUser || user.role === "moderator"}
        >
          Set as Moderator
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setRole.mutate("user")}
          disabled={isCurrentUser || user.role === "user"}
        >
          Set as User
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {canImpersonate && !isCurrentUser && !user.banned && (
          <DropdownMenuItem onClick={() => impersonate.mutate()}>
            Impersonate User
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={() => revokeSessions.mutate()}>
          Revoke All Sessions
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {user.banned ? (
          <DropdownMenuItem onClick={() => unbanUser.mutate()}>
            Unban User
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => banUser.mutate()}
            variant="destructive"
            disabled={isCurrentUser}
          >
            Ban User
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
