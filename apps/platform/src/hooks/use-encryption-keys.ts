"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { fetchApi } from "@/lib/api"
import { useActiveOrganizationSafe } from "@/lib/auth-client"

export interface EncryptionKey {
  id: string
  organizationId: string
  createdById: string
  name: string
  keyPrefix: string
  version: number
  status: "active" | "rotated" | "revoked"
  rotatedAt: string | null
  revokedAt: string | null
  createdAt: string
  updatedAt: string
}

interface EncryptionKeysResponse {
  encryptionKeys: EncryptionKey[]
}

interface CreateEncryptionKeyResponse {
  encryptionKey: EncryptionKey
  rawKey: string
}

interface RotateEncryptionKeyResponse {
  encryptionKey: EncryptionKey
  rawKey: string
  rotatedFrom: string
}

export function useEncryptionKeys(status?: "active" | "rotated" | "revoked") {
  const { data: activeOrg, isPending: isOrgPending } =
    useActiveOrganizationSafe()

  return useQuery<EncryptionKeysResponse>({
    queryKey: ["encryption-keys", activeOrg?.id, status],
    queryFn: async () => {
      if (!activeOrg?.id) {
        throw new Error("Organization is required")
      }
      let path = `/api/encryption-keys?organizationId=${activeOrg.id}`
      if (status) {
        path += `&status=${status}`
      }
      return fetchApi<EncryptionKeysResponse>(path)
    },
    enabled: !isOrgPending && !!activeOrg?.id,
  })
}

export function useCreateEncryptionKey() {
  const queryClient = useQueryClient()
  const { data: activeOrg } = useActiveOrganizationSafe()

  return useMutation<CreateEncryptionKeyResponse, Error, { name: string }>({
    mutationFn: async ({ name }) => {
      if (!activeOrg?.id) {
        throw new Error("Organization is required")
      }
      return fetchApi<CreateEncryptionKeyResponse>("/api/encryption-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: activeOrg.id,
          name,
        }),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["encryption-keys", activeOrg?.id],
      })
    },
  })
}

export function useRotateEncryptionKey() {
  const queryClient = useQueryClient()
  const { data: activeOrg } = useActiveOrganizationSafe()

  return useMutation<RotateEncryptionKeyResponse, Error, string>({
    mutationFn: async (keyId) => {
      return fetchApi<RotateEncryptionKeyResponse>(
        `/api/encryption-keys/${keyId}/rotate`,
        {
          method: "POST",
        }
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["encryption-keys", activeOrg?.id],
      })
    },
  })
}

export function useRevokeEncryptionKey() {
  const queryClient = useQueryClient()
  const { data: activeOrg } = useActiveOrganizationSafe()

  return useMutation<{ message: string }, Error, string>({
    mutationFn: async (keyId) => {
      return fetchApi<{ message: string }>(`/api/encryption-keys/${keyId}`, {
        method: "DELETE",
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["encryption-keys", activeOrg?.id],
      })
    },
  })
}
