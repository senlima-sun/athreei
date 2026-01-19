"use client"

import { API_URL } from "@/constants"
import { isLocalMode, getApiUrl } from "./mode"

export interface AppConfig {
  features: {
    emailVerification: boolean
    passwordReset: boolean
  }
}

let configCache: AppConfig | null = null

/**
 * Fetch app configuration from the API
 * Results are cached for the session
 */
export async function getConfig(): Promise<AppConfig> {
  if (configCache) {
    return configCache
  }

  const response = await fetch(`${API_URL}/api/config`)
  if (!response.ok) {
    return {
      features: {
        emailVerification: false,
        passwordReset: false,
      },
    }
  }

  configCache = await response.json()
  return configCache!
}

/**
 * Check if email verification is enabled
 */
export async function isEmailVerificationEnabled(): Promise<boolean> {
  const config = await getConfig()
  return config.features.emailVerification
}

/**
 * Mode-aware API client for fetching data
 * Handles local vs cloud mode differences automatically
 */
export async function fetchApi<T>(
  path: string,
  options?: RequestInit & { organizationId?: string }
): Promise<T> {
  const base = getApiUrl()
  const url = new URL(path, base)

  if (!isLocalMode() && options?.organizationId) {
    url.searchParams.set("organizationId", options.organizationId)
  }

  const { organizationId: _, ...fetchOptions } = options ?? {}

  const res = await fetch(url.toString(), {
    ...fetchOptions,
    credentials: isLocalMode() ? "omit" : "include",
  })

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }

  return res.json()
}
