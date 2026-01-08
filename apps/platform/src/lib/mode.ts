/**
 * Mode detection utilities for local vs cloud operation
 */

/**
 * Check if the platform is running in local mode
 * Local mode disables authentication and uses local gateway
 */
export const isLocalMode = () =>
  process.env.NEXT_PUBLIC_ATHREEI_MODE === "local"

/**
 * Get the API URL based on current mode
 * Local mode uses localhost:3001, cloud mode uses configured API URL
 */
export const getApiUrl = () =>
  isLocalMode()
    ? "http://localhost:3001"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
