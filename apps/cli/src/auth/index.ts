export { AuthManager, getAuthManager } from "./manager"
export type { AuthSession } from "./manager"
export type {
  CredentialStore,
  StoredCredentials,
  ProfileState,
} from "./credentials"
export { createCredentialStore } from "./credentials"
export { performOAuthFlow } from "./oauth"
export type { OAuthConfig, OAuthTokens } from "./oauth"
export { getProvider, listProviders, registerProvider } from "./providers/index"
export type { AuthProvider, UserInfo } from "./providers/index"
export { GitHubProvider } from "./providers/github"
