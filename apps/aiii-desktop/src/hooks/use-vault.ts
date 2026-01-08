import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import * as api from "@/lib/api"

/**
 * Query the current vault unlock status
 */
export function useVaultStatus() {
  return useQuery({
    queryKey: ["vault", "status"],
    queryFn: api.vaultStatus,
    staleTime: 0, // Always check vault status
  })
}

/**
 * Query whether the vault has been set up
 */
export function useVaultIsSetup() {
  return useQuery({
    queryKey: ["vault", "setup"],
    queryFn: api.vaultIsSetup,
    staleTime: Infinity, // Setup status rarely changes
  })
}

/**
 * Mutation to unlock the vault with a passphrase
 */
export function useVaultUnlock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.vaultUnlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault"] })
      // Invalidate memories and other vault-dependent data
      queryClient.invalidateQueries({ queryKey: ["memories"] })
      queryClient.invalidateQueries({ queryKey: ["spaces"] })
    },
  })
}

/**
 * Mutation to lock the vault
 */
export function useVaultLock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.vaultLock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault"] })
      // Clear sensitive data from cache
      queryClient.removeQueries({ queryKey: ["memories"] })
    },
  })
}

/**
 * Mutation to set up a new vault with a passphrase
 */
export function useVaultSetup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.vaultSetup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault"] })
    },
  })
}
