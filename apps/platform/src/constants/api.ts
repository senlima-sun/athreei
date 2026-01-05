/**
 * API configuration constants
 */

/**
 * Base URL for the API server.
 * Falls back to localhost in development.
 */
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
