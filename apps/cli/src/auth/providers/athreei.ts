import * as http from "http"
import * as url from "url"
import * as crypto from "crypto"
import open from "open"
import { AuthProvider, UserInfo, registerProvider } from "./index.js"
import { OAuthConfig, OAuthTokens } from "../oauth.js"
import { StoredCredentials } from "../credentials.js"

const API_URL = process.env.ATHREEI_API_URL || "http://localhost:3001"

export class AthreeiProvider implements AuthProvider {
  name = "athreei"
  displayName = "Athreei Platform"

  // Not used - we have custom flow
  getOAuthConfig(): OAuthConfig {
    return {
      clientId: "",
      authorizationUrl: "",
      tokenUrl: "",
      redirectUri: "",
      scopes: [],
    }
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/api/auth/cli/verify`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      const data = await response.json()
      return data.valid === true
    } catch {
      return false
    }
  }

  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch(`${API_URL}/api/auth/cli/verify`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.valid) {
      throw new Error(data.error || "Invalid token")
    }

    return {
      id: data.user.id,
      username: data.user.name || data.user.email,
      email: data.user.email,
    }
  }

  toStoredCredentials(tokens: OAuthTokens): StoredCredentials {
    return {
      accessToken: tokens.accessToken,
      provider: this.name,
      expiresAt: tokens.expiresIn
        ? Date.now() + tokens.expiresIn * 1000
        : undefined,
    }
  }

  // Custom login flow for Athreei
  async performLogin(port = 19284): Promise<{
    token: string
    user: UserInfo
    organizationId: string
    expiresAt: string
  }> {
    const state = crypto.randomBytes(16).toString("hex")

    // 1. Initiate session with API
    const initResponse = await fetch(`${API_URL}/api/auth/cli/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, callbackPort: port }),
    })

    if (!initResponse.ok) {
      throw new Error("Failed to initiate authentication")
    }

    const { authUrl } = await initResponse.json()

    // 2. Start callback server
    const tokenPromise = this.startCallbackServer(port, state)

    // 3. Open browser
    await open(authUrl)

    // 4. Wait for callback
    const token = await tokenPromise

    // 5. Verify and get user info
    const verifyResponse = await fetch(`${API_URL}/api/auth/cli/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!verifyResponse.ok) {
      throw new Error("Token verification failed")
    }

    const verifyData = await verifyResponse.json()

    return {
      token,
      user: {
        id: verifyData.user.id,
        username: verifyData.user.name || verifyData.user.email,
        email: verifyData.user.email,
      },
      organizationId: verifyData.currentOrganization,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    }
  }

  private startCallbackServer(
    port: number,
    _expectedState: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const parsedUrl = url.parse(req.url || "", true)

        if (parsedUrl.pathname !== "/callback") {
          res.writeHead(404)
          res.end("Not found")
          return
        }

        const { token, error } = parsedUrl.query

        if (error) {
          res.writeHead(400)
          res.end(`Authentication failed: ${error}`)
          server.close()
          reject(new Error(`Authentication error: ${error}`))
          return
        }

        if (!token || typeof token !== "string") {
          res.writeHead(400)
          res.end("Missing token")
          server.close()
          reject(new Error("Missing token in callback"))
          return
        }

        res.writeHead(200, { "Content-Type": "text/html" })
        res.end(`
          <!DOCTYPE html>
          <html>
            <body style="font-family: system-ui; text-align: center; padding: 50px;">
              <h1>Authentication Successful</h1>
              <p>You can close this window and return to the terminal.</p>
              <script>window.close();</script>
            </body>
          </html>
        `)

        server.close()
        resolve(token)
      })

      server.on("error", (err) => {
        reject(new Error(`Server error: ${err.message}`))
      })

      server.listen(port, "127.0.0.1")

      // Timeout after 5 minutes
      setTimeout(
        () => {
          server.close()
          reject(new Error("Authentication timed out"))
        },
        5 * 60 * 1000
      )
    })
  }
}

registerProvider(new AthreeiProvider())
