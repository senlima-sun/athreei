import {
  createCredentialStore,
  CredentialStore,
  StoredCredentials,
} from "./credentials.js"
import { performOAuthFlow, refreshAccessToken } from "./oauth.js"
import { getProvider, listProviders } from "./providers/index.js"

import "./providers/github.js"
import "./providers/athreei.js"

export interface AuthSession {
  provider: string
  accessToken: string
  userId?: string
  username?: string
  expiresAt?: number
}

export class AuthManager {
  private store: CredentialStore
  private currentSession: AuthSession | null = null

  constructor(store?: CredentialStore) {
    this.store = store || createCredentialStore()
  }

  async login(providerName: string): Promise<AuthSession> {
    const provider = getProvider(providerName)
    if (!provider) {
      throw new Error(`Unknown provider: ${providerName}`)
    }

    const config = provider.getOAuthConfig()
    const tokens = await performOAuthFlow(config)
    const credentials = provider.toStoredCredentials(tokens)

    const userInfo = await provider.getUserInfo(tokens.accessToken)
    credentials.userId = userInfo.id

    await this.store.set(`auth:${providerName}`, credentials)

    this.currentSession = {
      provider: providerName,
      accessToken: tokens.accessToken,
      userId: userInfo.id,
      username: userInfo.username,
      expiresAt: credentials.expiresAt,
    }

    return this.currentSession
  }

  async loginWithToken(
    providerName: string,
    token: string
  ): Promise<AuthSession> {
    const provider = getProvider(providerName)
    if (!provider) {
      throw new Error(`Unknown provider: ${providerName}`)
    }

    const isValid = await provider.validateToken(token)
    if (!isValid) {
      throw new Error("Invalid or expired token")
    }

    const userInfo = await provider.getUserInfo(token)

    const credentials: StoredCredentials = {
      accessToken: token,
      provider: providerName,
      userId: userInfo.id,
    }

    await this.store.set(`auth:${providerName}`, credentials)

    this.currentSession = {
      provider: providerName,
      accessToken: token,
      userId: userInfo.id,
      username: userInfo.username,
    }

    return this.currentSession
  }

  async getSession(providerName?: string): Promise<AuthSession | null> {
    const providers = providerName
      ? [providerName]
      : await this.getAuthenticatedProviders()

    for (const name of providers) {
      const credentials = await this.store.get(`auth:${name}`)
      if (!credentials) continue

      if (credentials.expiresAt && Date.now() > credentials.expiresAt) {
        const refreshed = await this.tryRefreshToken(name, credentials)
        if (refreshed) return refreshed
        continue
      }

      const provider = getProvider(name)
      if (provider) {
        try {
          const userInfo = await provider.getUserInfo(credentials.accessToken)
          return {
            provider: name,
            accessToken: credentials.accessToken,
            userId: credentials.userId,
            username: userInfo.username,
            expiresAt: credentials.expiresAt,
          }
        } catch {
          continue
        }
      }
    }

    return null
  }

  async logout(providerName?: string): Promise<void> {
    if (providerName) {
      await this.store.delete(`auth:${providerName}`)
    } else {
      const providers = await this.getAuthenticatedProviders()
      for (const name of providers) {
        await this.store.delete(`auth:${name}`)
      }
    }
    this.currentSession = null
  }

  async getAuthenticatedProviders(): Promise<string[]> {
    const keys = await this.store.list()
    return keys
      .filter((k) => k.startsWith("auth:"))
      .map((k) => k.replace("auth:", ""))
  }

  async getStatus(): Promise<{
    authenticated: boolean
    providers: Array<{
      name: string
      displayName: string
      authenticated: boolean
      username?: string
    }>
  }> {
    const allProviders = listProviders()
    const authenticatedProviders = await this.getAuthenticatedProviders()

    const providerStatus = await Promise.all(
      allProviders.map(async (provider) => {
        const isAuthenticated = authenticatedProviders.includes(provider.name)
        let username: string | undefined

        if (isAuthenticated) {
          const session = await this.getSession(provider.name)
          username = session?.username
        }

        return {
          name: provider.name,
          displayName: provider.displayName,
          authenticated: isAuthenticated,
          username,
        }
      })
    )

    return {
      authenticated: authenticatedProviders.length > 0,
      providers: providerStatus,
    }
  }

  private async tryRefreshToken(
    providerName: string,
    credentials: StoredCredentials
  ): Promise<AuthSession | null> {
    if (!credentials.refreshToken) return null

    const provider = getProvider(providerName)
    if (!provider) return null

    try {
      const config = provider.getOAuthConfig()
      const tokens = await refreshAccessToken(config, credentials.refreshToken)
      const newCredentials = provider.toStoredCredentials(tokens)
      newCredentials.userId = credentials.userId

      await this.store.set(`auth:${providerName}`, newCredentials)

      const userInfo = await provider.getUserInfo(tokens.accessToken)

      return {
        provider: providerName,
        accessToken: tokens.accessToken,
        userId: credentials.userId,
        username: userInfo.username,
        expiresAt: newCredentials.expiresAt,
      }
    } catch {
      return null
    }
  }
}

let authManager: AuthManager | null = null

export function getAuthManager(): AuthManager {
  if (!authManager) {
    authManager = new AuthManager()
  }
  return authManager
}
