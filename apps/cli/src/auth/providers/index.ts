import { OAuthConfig, OAuthTokens } from "../oauth.js"
import { StoredCredentials } from "../credentials.js"

export interface UserInfo {
  id: string
  username: string
  email?: string
  avatarUrl?: string
}

export interface AuthProvider {
  name: string
  displayName: string
  getOAuthConfig(): OAuthConfig
  validateToken(accessToken: string): Promise<boolean>
  getUserInfo(accessToken: string): Promise<UserInfo>
  toStoredCredentials(tokens: OAuthTokens): StoredCredentials
}

const providers = new Map<string, AuthProvider>()

export function registerProvider(provider: AuthProvider): void {
  providers.set(provider.name, provider)
}

export function getProvider(name: string): AuthProvider | undefined {
  return providers.get(name)
}

export function listProviders(): AuthProvider[] {
  return Array.from(providers.values())
}
