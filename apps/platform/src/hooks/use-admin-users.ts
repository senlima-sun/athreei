"use client"

import { useQuery } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"

interface UseAdminUsersParams {
  searchValue: string
  roleFilter: string
  page: number
  pageSize: number
}

export interface AdminUser {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
  banned: boolean
  banReason: string | null
  banExpires: string | null
  createdAt: string
}

interface AdminUsersResponse {
  users: AdminUser[]
  total: number
}

export function useAdminUsers({
  searchValue,
  roleFilter,
  page,
  pageSize,
}: UseAdminUsersParams) {
  return useQuery<AdminUsersResponse>({
    queryKey: ["admin", "users", searchValue, roleFilter, page, pageSize],
    queryFn: async () => {
      const response = await authClient.admin.listUsers({
        query: {
          searchValue: searchValue || undefined,
          searchField: "email",
          searchOperator: "contains",
          limit: pageSize,
          offset: page * pageSize,
          sortBy: "createdAt",
          sortDirection: "desc",
          ...(roleFilter !== "all" && {
            filterField: "role",
            filterValue: roleFilter,
          }),
        },
      })

      if (response.error) {
        throw new Error(response.error.message || "Failed to fetch users")
      }

      return {
        users: (response.data?.users || []) as AdminUser[],
        total: response.data?.total || 0,
      }
    },
  })
}
