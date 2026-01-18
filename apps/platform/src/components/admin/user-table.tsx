"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { UserAdminActions } from "./user-admin-actions"
import type { AdminUser } from "@/hooks/use-admin-users"

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

interface UserTableProps {
  users: AdminUser[]
  isLoading: boolean
  pagination: {
    total: number
    page: number
    pageSize: number
    onPageChange: (page: number) => void
  }
}

export function UserTable({ users, isLoading, pagination }: UserTableProps) {
  const { total, page, pageSize, onPageChange } = pagination
  const totalPages = Math.ceil(total / pageSize)

  if (isLoading) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        Loading users...
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        No users found
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-3 font-medium">User</th>
              <th className="text-left p-3 font-medium">Role</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Joined</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      {user.name?.[0] ?? user.email[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <div className="font-medium">{user.name || "—"}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-3">
                  <Badge
                    variant={user.role === "admin" ? "default" : "secondary"}
                  >
                    {user.role}
                  </Badge>
                </td>
                <td className="p-3">
                  {user.banned ? (
                    <Badge variant="destructive">Banned</Badge>
                  ) : (
                    <Badge variant="outline">Active</Badge>
                  )}
                </td>
                <td className="p-3 text-muted-foreground">
                  {formatRelativeDate(new Date(user.createdAt))}
                </td>
                <td className="p-3 text-right">
                  <UserAdminActions user={user} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1} to{" "}
            {Math.min((page + 1) * pageSize, total)} of {total} users
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
