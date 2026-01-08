import * as http from "http"
import * as crypto from "crypto"
import * as url from "url"
import open from "open"

export interface OAuthConfig {
  clientId: string
  clientSecret?: string
  authorizationUrl: string
  tokenUrl: string
  redirectUri: string
  scopes: string[]
}

export interface OAuthTokens {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  tokenType: string
}

export interface PKCEChallenge {
  codeVerifier: string
  codeChallenge: string
  codeChallengeMethod: "S256"
}

export function generatePKCE(): PKCEChallenge {
  const codeVerifier = crypto.randomBytes(32).toString("base64url")
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64url")

  return { codeVerifier, codeChallenge, codeChallengeMethod: "S256" }
}

export function generateState(): string {
  return crypto.randomBytes(16).toString("hex")
}

export function buildAuthorizationUrl(
  config: OAuthConfig,
  state: string,
  pkce: PKCEChallenge
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    state,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: pkce.codeChallengeMethod,
  })

  return `${config.authorizationUrl}?${params.toString()}`
}

export async function exchangeCodeForTokens(
  config: OAuthConfig,
  code: string,
  codeVerifier: string
): Promise<OAuthTokens> {
  const params = new URLSearchParams({
    client_id: config.clientId,
    code,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
    code_verifier: codeVerifier,
  })

  if (config.clientSecret) {
    params.append("client_secret", config.clientSecret)
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  })

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${await response.text()}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  }
}

export async function refreshAccessToken(
  config: OAuthConfig,
  refreshToken: string
): Promise<OAuthTokens> {
  const params = new URLSearchParams({
    client_id: config.clientId,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  })

  if (config.clientSecret) {
    params.append("client_secret", config.clientSecret)
  }

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
  })

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${await response.text()}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
  }
}

export function startCallbackServer(
  port: number,
  expectedState: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url || "", true)

      if (parsedUrl.pathname !== "/callback") {
        res.writeHead(404)
        res.end("Not found")
        return
      }

      const { code, state, error, error_description } = parsedUrl.query

      if (error) {
        res.writeHead(400)
        res.end(`Authentication failed: ${error_description || error}`)
        server.close()
        reject(new Error(`OAuth error: ${error_description || error}`))
        return
      }

      if (state !== expectedState) {
        res.writeHead(400)
        res.end("Invalid state parameter")
        server.close()
        reject(new Error("Invalid state parameter"))
        return
      }

      if (!code || typeof code !== "string") {
        res.writeHead(400)
        res.end("Missing authorization code")
        server.close()
        reject(new Error("Missing authorization code"))
        return
      }

      res.writeHead(200, { "Content-Type": "text/html" })
      res.end(`
        <!DOCTYPE html>
        <html>
          <body style="font-family: system-ui; text-align: center; padding: 50px;">
            <h1>✓ Authentication Successful</h1>
            <p>You can close this window and return to the terminal.</p>
            <script>window.close();</script>
          </body>
        </html>
      `)

      server.close()
      resolve(code)
    })

    server.on("error", reject)
    server.listen(port, "127.0.0.1")

    setTimeout(
      () => {
        server.close()
        reject(new Error("Authentication timed out"))
      },
      5 * 60 * 1000
    )
  })
}

export async function performOAuthFlow(
  config: OAuthConfig,
  port = 8585
): Promise<OAuthTokens> {
  const state = generateState()
  const pkce = generatePKCE()

  const redirectConfig = {
    ...config,
    redirectUri: `http://127.0.0.1:${port}/callback`,
  }

  const authUrl = buildAuthorizationUrl(redirectConfig, state, pkce)
  const codePromise = startCallbackServer(port, state)

  await open(authUrl)
  const code = await codePromise

  return exchangeCodeForTokens(redirectConfig, code, pkce.codeVerifier)
}
