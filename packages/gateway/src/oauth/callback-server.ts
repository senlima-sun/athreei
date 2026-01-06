/**
 * OAuth Callback Server
 *
 * Temporary localhost HTTP server to receive OAuth authorization callbacks.
 * Security features:
 * - Binds to localhost only (127.0.0.1 or localhost with fallback)
 * - Random callback path to prevent interception
 * - Short-lived (auto-closes after callback or timeout)
 * - Security headers on responses
 */

import {
  createServer,
  type Server,
  type IncomingMessage,
  type ServerResponse,
} from "http"
import type { AddressInfo } from "net"
import type { CallbackResult } from "./types.js"
import { log } from "../logger.js"

/** Hosts to try binding to, in order */
const LOCALHOST_HOSTS = ["localhost", "127.0.0.1", "[::1]"]

/** Default timeout for waiting for callback (5 minutes) */
const DEFAULT_TIMEOUT = 300_000

/** Security headers for callback responses */
const SECURITY_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
  "Cache-Control": "no-store, max-age=0",
}

/**
 * Success HTML page shown after OAuth callback
 */
function successHtml(provider: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Authorization Successful</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
    .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
    h1 { color: #22c55e; margin: 0 0 16px; }
    p { color: #666; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Authorization Successful</h1>
    <p>You have successfully connected to ${provider}.</p>
    <p style="margin-top: 16px; color: #999;">You can close this window and return to your terminal.</p>
  </div>
</body>
</html>`
}

/**
 * Error HTML page shown when OAuth fails
 */
function errorHtml(error: string, description?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Authorization Failed</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
    .card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
    h1 { color: #ef4444; margin: 0 0 16px; }
    p { color: #666; margin: 0; }
    .error { background: #fef2f2; color: #dc2626; padding: 12px; border-radius: 8px; margin-top: 16px; font-family: monospace; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Authorization Failed</h1>
    <p>There was a problem completing the authorization.</p>
    <div class="error">${error}${description ? `: ${description}` : ""}</div>
    <p style="margin-top: 16px; color: #999;">Please try again from your terminal.</p>
  </div>
</body>
</html>`
}

export interface CallbackServer {
  /** Port the server is listening on */
  port: number
  /** Host the server is bound to */
  host: string
  /** Full redirect URI for OAuth */
  redirectUri: string
  /** Wait for OAuth callback */
  waitForCallback(timeout?: number): Promise<CallbackResult>
  /** Close the server */
  close(): void
}

/**
 * Start a temporary callback server for OAuth
 */
export async function startCallbackServer(
  provider: string = "the provider"
): Promise<CallbackServer> {
  // Generate random callback path for extra security
  const callbackPath = `/callback/${crypto.randomUUID()}`

  // Try each localhost variant until one works
  for (const host of LOCALHOST_HOSTS) {
    try {
      const server = await tryCreateServer(host, callbackPath, provider)
      return server
    } catch (error) {
      log.debug(`Failed to bind to ${host}:`, error)
    }
  }

  throw new Error(
    "Could not start OAuth callback server - all localhost addresses failed"
  )
}

/**
 * Try to create a server on a specific host
 */
async function tryCreateServer(
  host: string,
  callbackPath: string,
  provider: string
): Promise<CallbackServer> {
  return new Promise((resolve, reject) => {
    let resolveCallback: ((result: CallbackResult) => void) | null = null
    let rejectCallback: ((error: Error) => void) | null = null
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let resolved = false

    const callbackPromise = new Promise<CallbackResult>((res, rej) => {
      resolveCallback = res
      rejectCallback = rej
    })

    const server: Server = createServer(
      (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url!, `http://${host}`)

        // Only accept requests to our random callback path
        if (url.pathname !== callbackPath) {
          res.writeHead(404)
          res.end("Not found")
          return
        }

        const code = url.searchParams.get("code")
        const state = url.searchParams.get("state")
        const error = url.searchParams.get("error")
        const errorDescription = url.searchParams.get("error_description")

        // Handle OAuth error
        if (error) {
          res.writeHead(200, SECURITY_HEADERS)
          res.end(errorHtml(error, errorDescription ?? undefined))
          rejectCallback?.(
            new OAuthCallbackError(error, errorDescription ?? undefined)
          )
          cleanup()
          return
        }

        // Validate required parameters
        if (!code || !state) {
          res.writeHead(400, SECURITY_HEADERS)
          res.end(
            errorHtml("invalid_request", "Missing code or state parameter")
          )
          return
        }

        // Success!
        res.writeHead(200, SECURITY_HEADERS)
        res.end(successHtml(provider))
        resolveCallback?.({ code, state })
        cleanup()
      }
    )

    const cleanup = () => {
      if (resolved) return
      resolved = true
      if (timeoutId) clearTimeout(timeoutId)
      server.close()
    }

    server.on("error", (error) => {
      cleanup()
      reject(error)
    })

    // Bind to ephemeral port (0) on specified host
    server.listen(0, host, () => {
      const address = server.address() as AddressInfo
      const port = address.port
      const redirectUri = `http://${host}:${port}${callbackPath}`

      log.debug(`OAuth callback server listening on ${redirectUri}`)

      resolve({
        port,
        host,
        redirectUri,
        waitForCallback: async (timeout = DEFAULT_TIMEOUT) => {
          // Set timeout
          timeoutId = setTimeout(() => {
            cleanup()
            rejectCallback?.(
              new Error("OAuth callback timeout - no response received")
            )
          }, timeout)

          return callbackPromise
        },
        close: cleanup,
      })
    })

    // Auto-close after 5 minutes regardless
    setTimeout(() => {
      if (!resolved) {
        log.debug("OAuth callback server auto-closing after timeout")
        cleanup()
      }
    }, DEFAULT_TIMEOUT)
  })
}

/**
 * OAuth callback error
 */
export class OAuthCallbackError extends Error {
  code: string
  description?: string

  constructor(code: string, description?: string) {
    super(description ? `${code}: ${description}` : code)
    this.name = "OAuthCallbackError"
    this.code = code
    this.description = description
  }
}
