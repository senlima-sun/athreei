import { AuthProvider, UserInfo, registerProvider } from "./index.js"
import { OAuthConfig, OAuthTokens } from "../oauth.js"
import { StoredCredentials } from "../credentials.js"

export class GitHubProvider implements AuthProvider {
  name = "github"
  displayName = "GitHub"

  private clientId: string
  private clientSecret?: string

  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID || "Iv1.placeholder"
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET
  }

  getOAuthConfig(): OAuthConfig {
    return {
      clientId: this.clientId,
      clientSecret: this.clientSecret,
      authorizationUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      redirectUri: "http://127.0.0.1:8585/callback",
      scopes: ["read:user", "user:email", "repo"],
    }
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "athreei-cli",
        },
      })
      return response.ok
    } catch {
      return false
    }
  }

  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "a3i-cli",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`)
    }

    const data = await response.json()
    return {
      id: String(data.id),
      username: data.login,
      email: data.email,
      avatarUrl: data.avatar_url,
    }
  }

  toStoredCredentials(tokens: OAuthTokens): StoredCredentials {
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresIn
        ? Date.now() + tokens.expiresIn * 1000
        : undefined,
      provider: this.name,
    }
  }
}

registerProvider(new GitHubProvider())
