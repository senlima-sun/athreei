/**
 * Navigate action executor with enhanced features
 */

import type { AiiiNavigateArgs } from "@athreei/shared"

export interface NavigateResult {
  navigated: boolean
  url: string
  previousUrl: string
  title?: string
}

/**
 * Executes a navigation action
 * Supports forward navigation, back, forward, and reload
 */
export async function executeNavigate(
  args: AiiiNavigateArgs
): Promise<NavigateResult> {
  const previousUrl = window.location.href

  // Handle special navigation actions
  if (args.url === "back") {
    window.history.back()
    // Wait for navigation to complete
    await waitForNavigationComplete()
    return {
      navigated: true,
      url: window.location.href,
      previousUrl,
      title: document.title,
    }
  }

  if (args.url === "forward") {
    window.history.forward()
    // Wait for navigation to complete
    await waitForNavigationComplete()
    return {
      navigated: true,
      url: window.location.href,
      previousUrl,
      title: document.title,
    }
  }

  if (args.url === "reload") {
    window.location.reload()
    return {
      navigated: true,
      url: window.location.href,
      previousUrl,
      title: document.title,
    }
  }

  // Validate URL
  let targetUrl: URL
  try {
    targetUrl = new URL(args.url, window.location.origin)
  } catch {
    throw new Error(`Invalid URL: ${args.url}`)
  }

  // Check if same-page navigation (hash change)
  const isSamePage =
    targetUrl.origin === window.location.origin &&
    targetUrl.pathname === window.location.pathname &&
    targetUrl.search === window.location.search

  if (isSamePage) {
    // Same-page navigation, just change hash
    window.location.hash = targetUrl.hash
    return {
      navigated: true,
      url: targetUrl.href,
      previousUrl,
      title: document.title,
    }
  }

  // Regular navigation
  if (args.waitUntil) {
    // Use history.pushState for better control
    // Note: This won't work for cross-origin navigation
    try {
      // Setup listener for page load
      const loadPromise = waitForPageLoad(args.waitUntil)

      // Navigate
      window.location.href = targetUrl.href

      // Wait for load
      await loadPromise
    } catch {
      // If waitUntil not supported, just navigate
      window.location.href = targetUrl.href
    }
  } else {
    // Navigate without waiting
    window.location.href = targetUrl.href
  }

  // Note: The page will reload, so this return may not be reached
  // The result is mainly useful for same-page hash navigations
  return {
    navigated: true,
    url: targetUrl.href,
    previousUrl,
    title: document.title,
  }
}

/**
 * Wait for navigation to complete (for back/forward)
 */
function waitForNavigationComplete(): Promise<void> {
  return new Promise((resolve) => {
    // Wait for next tick to let history navigation happen
    setTimeout(() => {
      // Wait for page to be interactive
      if (document.readyState === "complete") {
        resolve()
      } else {
        window.addEventListener("load", () => resolve(), { once: true })
      }
    }, 100)
  })
}

/**
 * Wait for page load based on waitUntil strategy
 */
function waitForPageLoad(
  waitUntil: "load" | "domcontentloaded" | "networkidle"
): Promise<void> {
  return new Promise((resolve) => {
    switch (waitUntil) {
      case "load":
        window.addEventListener("load", () => resolve(), { once: true })
        break

      case "domcontentloaded":
        if (document.readyState === "loading") {
          window.addEventListener("DOMContentLoaded", () => resolve(), {
            once: true,
          })
        } else {
          resolve()
        }
        break

      case "networkidle":
        // Wait for load event first
        window.addEventListener(
          "load",
          () => {
            // Then wait for network to be idle (2 seconds of no activity)
            let timer: number
            const resetTimer = () => {
              clearTimeout(timer)
              timer = window.setTimeout(() => resolve(), 2000)
            }

            // Monitor fetch and XHR
            const originalFetch = window.fetch
            window.fetch = (...args) => {
              resetTimer()
              return originalFetch(...args).finally(() => resetTimer())
            }

            const originalOpen = XMLHttpRequest.prototype.open
            XMLHttpRequest.prototype.open = function (
              this: XMLHttpRequest,
              method: string,
              url: string | URL,
              async?: boolean,
              username?: string | null,
              password?: string | null
            ) {
              resetTimer()
              this.addEventListener("loadend", resetTimer)
              return originalOpen.call(
                this,
                method,
                url,
                async ?? true,
                username,
                password
              )
            }

            // Start the timer
            resetTimer()
          },
          { once: true }
        )
        break

      default:
        resolve()
    }
  })
}
