"use client"

import { createAuthClient } from "better-auth/react"
import { organizationClient, adminClient } from "better-auth/client/plugins"
import { API_URL } from "@/constants"
import { isLocalMode } from "./mode"

/**
 * Auth client instance for the platform
 * Base URL should point to the API server
 */

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [organizationClient(), adminClient()],
})

/**
 * Re-export commonly used hooks and methods from the auth client
 */
export const { useSession, signIn, signOut, signUp } = authClient

/**
 * Organization-related exports from the auth client
 * These are provided by the organizationClient plugin
 */
export const { useActiveOrganization, useListOrganizations, organization } =
  authClient

/**
 * Safe organization hook that works in both local and cloud modes
 * Returns a mock organization in local mode
 * Uses isPending for consistency with better-auth hooks
 */
export function useActiveOrganizationSafe() {
  const cloudOrg = useActiveOrganization()

  if (isLocalMode()) {
    return {
      data: { id: "local", name: "Local", slug: "local" },
      isPending: false,
    }
  }

  return cloudOrg
}
