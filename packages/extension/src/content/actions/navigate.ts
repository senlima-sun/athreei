/**
 * Navigate action executor
 */

import type { AiiiNavigateArgs } from "@athreei/shared"

export interface NavigateResult {
  navigated: boolean
  url: string
  previousUrl: string
}

/**
 * Executes a navigation action
 */
export async function executeNavigate(
  args: AiiiNavigateArgs
): Promise<NavigateResult> {
  const previousUrl = window.location.href

  // Validate URL
  let targetUrl: URL
  try {
    targetUrl = new URL(args.url, window.location.origin)
  } catch {
    throw new Error(`Invalid URL: ${args.url}`)
  }

  // Navigate
  window.location.href = targetUrl.href

  // Note: The page will reload, so this return may not be reached
  // The result is mainly useful for same-page hash navigations
  return {
    navigated: true,
    url: targetUrl.href,
    previousUrl,
  }
}
