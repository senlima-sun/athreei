"use client"

import { API_URL } from "@/constants"

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
    // Return defaults if config endpoint fails
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
