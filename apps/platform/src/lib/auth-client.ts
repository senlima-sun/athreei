"use client"

import { createAuthClient } from "better-auth/react"
import { organizationClient } from "better-auth/client/plugins"
import { API_URL } from "@/constants"

/**
 * Auth client instance for the platform
 * Base URL should point to the API server
 */

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [organizationClient()],
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
