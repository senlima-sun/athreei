/**
 * Device Authorization Grant (RFC 8628)
 *
 * Fallback OAuth flow for environments where browser redirect is not possible.
 * User visits a URL and enters a code to authorize the device.
 */

import { discoverOAuthMetadata } from "@modelcontextprotocol/sdk/client/auth.js"
import type { OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js"
import type {
  DeviceAuthorizationResponse,
  DeviceAuthErrorCode,
  ExtendedOAuthMetadata,
  StoredTokenData,
} from "./types.js"
import type { EncryptedTokenStore } from "./token-store.js"
import { log } from "../logger.js"

/** Default polling interval in seconds per RFC 8628 */
const DEFAULT_POLLING_INTERVAL = 5

/** Default device code timeout (5 minutes) */
const DEFAULT_DEVICE_CODE_TIMEOUT = 300_000

/** Max polling timeout (5 minutes) */
const MAX_POLLING_TIMEOUT = 300_000

/**
 * Device Authorization Error
 */
export class DeviceAuthError extends Error {
  code: DeviceAuthErrorCode | string

  constructor(code: DeviceAuthErrorCode | string, message?: string) {
    super(message ?? code)
    this.name = "DeviceAuthError"
    this.code = code
  }
}

/**
 * Check if the OAuth server supports Device Authorization Grant
 */
export async function supportsDeviceAuth(serverUrl: string): Promise<boolean> {
  try {
    const metadata = (await discoverOAuthMetadata(serverUrl)) as
      | ExtendedOAuthMetadata
      | undefined
    return !!metadata?.device_authorization_endpoint
  } catch {
    return false
  }
}

/**
 * Request a device code from the authorization server
 */
export async function requestDeviceCode(
  serverUrl: string,
  clientId: string,
  scope?: string
): Promise<DeviceAuthorizationResponse> {
  const metadata = (await discoverOAuthMetadata(serverUrl)) as
    | ExtendedOAuthMetadata
    | undefined

  if (!metadata?.device_authorization_endpoint) {
    throw new DeviceAuthError(
      "unsupported",
      "Server does not support device authorization"
    )
  }

  const params = new URLSearchParams({
    client_id: clientId,
  })

  if (scope) {
    params.set("scope", scope)
  }

  log.debug(
    `Requesting device code from ${metadata.device_authorization_endpoint}`
  )

  const response = await fetch(metadata.device_authorization_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new DeviceAuthError(
      errorData.error ?? "request_failed",
      errorData.error_description ?? `HTTP ${response.status}`
    )
  }

  const data = await response.json()

  // Validate required fields
  if (!data.device_code || !data.user_code || !data.verification_uri) {
    throw new DeviceAuthError(
      "invalid_response",
      "Missing required fields in device authorization response"
    )
  }

  return {
    device_code: data.device_code,
    user_code: data.user_code,
    verification_uri: data.verification_uri,
    verification_uri_complete: data.verification_uri_complete,
    expires_in: data.expires_in ?? DEFAULT_DEVICE_CODE_TIMEOUT / 1000,
    interval: data.interval ?? DEFAULT_POLLING_INTERVAL,
  }
}

/**
 * Poll the token endpoint for authorization completion
 */
export async function pollForToken(
  serverUrl: string,
  deviceCode: string,
  clientId: string,
  interval: number = DEFAULT_POLLING_INTERVAL,
  timeout: number = MAX_POLLING_TIMEOUT
): Promise<OAuthTokens> {
  const metadata = await discoverOAuthMetadata(serverUrl)

  if (!metadata?.token_endpoint) {
    throw new DeviceAuthError("invalid_server", "No token endpoint found")
  }

  const startTime = Date.now()
  let currentInterval = interval * 1000 // Convert to milliseconds

  log.debug("Starting device authorization polling...")

  while (Date.now() - startTime < timeout) {
    // Wait for the specified interval
    await sleep(currentInterval)

    try {
      const tokens = await attemptTokenExchange(
        metadata.token_endpoint,
        deviceCode,
        clientId
      )
      if (tokens) {
        log.info("Device authorization completed successfully")
        return tokens
      }
    } catch (error) {
      if (error instanceof DeviceAuthError) {
        switch (error.code as DeviceAuthErrorCode) {
          case "authorization_pending":
            // User hasn't completed authorization yet, continue polling
            log.debug("Authorization pending, continuing to poll...")
            continue

          case "slow_down":
            // Increase polling interval by 5 seconds per RFC 8628
            currentInterval += 5000
            log.debug(
              `Slowing down polling to ${currentInterval / 1000} seconds`
            )
            continue

          case "expired_token":
            throw new DeviceAuthError(
              "expired_token",
              "Device code has expired. Please restart the authorization flow."
            )

          case "access_denied":
            throw new DeviceAuthError(
              "access_denied",
              "User denied the authorization request."
            )

          default:
            throw error
        }
      }
      throw error
    }
  }

  throw new DeviceAuthError(
    "timeout",
    "Device authorization timed out. Please try again."
  )
}

/**
 * Attempt to exchange device code for tokens
 */
async function attemptTokenExchange(
  tokenEndpoint: string,
  deviceCode: string,
  clientId: string
): Promise<OAuthTokens | null> {
  const params = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    device_code: deviceCode,
    client_id: clientId,
  })

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  })

  const data = await response.json()

  if (!response.ok) {
    // Handle expected pending/error states
    if (data.error) {
      throw new DeviceAuthError(data.error, data.error_description)
    }
    throw new DeviceAuthError("token_error", `HTTP ${response.status}`)
  }

  // Successful token response
  return {
    access_token: data.access_token,
    token_type: data.token_type ?? "Bearer",
    expires_in: data.expires_in,
    refresh_token: data.refresh_token,
    scope: data.scope,
  }
}

/**
 * Complete device authorization flow
 *
 * 1. Request device code
 * 2. Display instructions to user
 * 3. Poll for token completion
 * 4. Store tokens
 */
export async function deviceAuthFlow(
  serverUrl: string,
  tokenStore: EncryptedTokenStore,
  options?: {
    clientId?: string
    scope?: string
    provider?: string
    onUserPrompt?: (userCode: string, verificationUri: string) => void
  }
): Promise<StoredTokenData> {
  const clientId = options?.clientId ?? "athreei-gateway"
  const provider = options?.provider ?? "MCP Server"

  log.info(`Starting device authorization flow for ${provider}`)

  // Step 1: Request device code
  const deviceAuth = await requestDeviceCode(
    serverUrl,
    clientId,
    options?.scope
  )

  // Step 2: Display instructions to user
  const verificationDisplay =
    deviceAuth.verification_uri_complete ?? deviceAuth.verification_uri

  if (options?.onUserPrompt) {
    options.onUserPrompt(deviceAuth.user_code, verificationDisplay)
  } else {
    // Default console output
    log.info("\n" + "=".repeat(50))
    log.info("Device Authorization Required")
    log.info("=".repeat(50))
    log.info(`\nVisit: ${verificationDisplay}`)
    log.info(`Enter code: ${deviceAuth.user_code}`)
    log.info(`\nCode expires in ${deviceAuth.expires_in} seconds`)
    log.info("=".repeat(50) + "\n")
  }

  // Step 3: Poll for token
  const tokens = await pollForToken(
    serverUrl,
    deviceAuth.device_code,
    clientId,
    deviceAuth.interval,
    deviceAuth.expires_in * 1000
  )

  // Step 4: Store tokens
  const now = Date.now()
  const storedToken: StoredTokenData = {
    access_token: tokens.access_token,
    token_type: tokens.token_type,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    scope: tokens.scope,
    expiresAt: tokens.expires_in ? now + tokens.expires_in * 1000 : undefined,
    obtainedAt: now,
    provider,
    serverUrl,
  }

  await tokenStore.set(serverUrl, storedToken)
  log.info(`Device authorization complete for ${provider}`)

  return storedToken
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
