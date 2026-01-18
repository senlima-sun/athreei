"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { UserTable } from "@/components/admin/user-table"
import { useAdminUsers } from "@/hooks/use-admin-users"

const roleOptions = [
  { value: "all", label: "All Roles" },
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderator" },
  { value: "user", label: "User" },
]

export default function AdminUsersPage() {
  const [searchValue, setSearchValue] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [page, setPage] = useState(0)
  const pageSize = 20

  const { data, isLoading, isError } = useAdminUsers({
    searchValue,
    roleFilter,
    page,
    pageSize,
  })

  if (isError) {
    return (
      <div className="p-8 text-center text-destructive">
        Failed to load users. Please try again.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Users</h1>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search by email..."
          value={searchValue}
          onChange={(e) => {
            setSearchValue(e.target.value)
            setPage(0)
          }}
          className="max-w-sm"
        />
        <Select
          value={roleFilter}
          onValueChange={(v) => {
            if (v) {
              setRoleFilter(v)
              setPage(0)
            }
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {roleOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <UserTable
        users={data?.users || []}
        isLoading={isLoading}
        pagination={{
          total: data?.total || 0,
          page,
          pageSize,
          onPageChange: setPage,
        }}
      />
    </div>
  )
}
