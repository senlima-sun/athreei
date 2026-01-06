export interface OAuthProvider {
  name: string
  displayName: string
  authUrl: string
  docsUrl: string
  envVarNames: string[]
  instructions: string[]
}

export const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
  figma: {
    name: "figma",
    displayName: "Figma",
    authUrl: "https://www.figma.com/settings",
    docsUrl: "https://www.figma.com/developers/api#access-tokens",
    envVarNames: [
      "FIGMA_ACCESS_TOKEN",
      "FIGMA_TOKEN",
      "FIGMA_API_TOKEN",
      "FIGMA_PERSONAL_ACCESS_TOKEN",
    ],
    instructions: [
      "Go to Figma Settings > Personal access tokens",
      "Click 'Create new token' and give it a descriptive name",
      "Copy the token immediately (it won't be shown again)",
      "Paste the token below",
    ],
  },
  sentry: {
    name: "sentry",
    displayName: "Sentry",
    authUrl: "https://sentry.io/settings/account/api/auth-tokens/",
    docsUrl: "https://docs.sentry.io/api/auth/",
    envVarNames: [
      "SENTRY_AUTH_TOKEN",
      "SENTRY_TOKEN",
      "SENTRY_API_TOKEN",
      "SENTRY_ACCESS_TOKEN",
    ],
    instructions: [
      "Go to Sentry Settings > Auth Tokens",
      "Click 'Create New Token'",
      "Select the required scopes for your use case",
      "Copy the generated token and paste it below",
    ],
  },
  linear: {
    name: "linear",
    displayName: "Linear",
    authUrl: "https://linear.app/settings/api",
    docsUrl:
      "https://developers.linear.app/docs/graphql/working-with-the-graphql-api#personal-api-keys",
    envVarNames: [
      "LINEAR_API_KEY",
      "LINEAR_TOKEN",
      "LINEAR_ACCESS_TOKEN",
      "LINEAR_PERSONAL_API_KEY",
    ],
    instructions: [
      "Go to Linear Settings > API",
      "Click 'Create new API key'",
      "Give it a label and copy the generated key",
      "Paste the API key below",
    ],
  },
  github: {
    name: "github",
    displayName: "GitHub",
    authUrl: "https://github.com/settings/tokens",
    docsUrl:
      "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens",
    envVarNames: [
      "GITHUB_TOKEN",
      "GITHUB_ACCESS_TOKEN",
      "GITHUB_PERSONAL_ACCESS_TOKEN",
      "GH_TOKEN",
      "GITHUB_API_TOKEN",
    ],
    instructions: [
      "Go to GitHub Settings > Developer settings > Personal access tokens",
      "Click 'Generate new token' (classic or fine-grained)",
      "Select the required scopes for your use case",
      "Copy the token and paste it below",
    ],
  },
  notion: {
    name: "notion",
    displayName: "Notion",
    authUrl: "https://www.notion.so/my-integrations",
    docsUrl: "https://developers.notion.com/docs/create-a-notion-integration",
    envVarNames: [
      "NOTION_API_KEY",
      "NOTION_TOKEN",
      "NOTION_INTEGRATION_TOKEN",
      "NOTION_ACCESS_TOKEN",
    ],
    instructions: [
      "Go to Notion > My Integrations",
      "Click 'New integration' and configure it",
      "Copy the 'Internal Integration Secret'",
      "Share your pages/databases with the integration, then paste the token below",
    ],
  },
}

/**
 * Detect OAuth provider from environment variable names
 */
export function detectOAuthProvider(
  envVarNames: string[]
): OAuthProvider | null {
  const normalizedNames = envVarNames.map((name) => name.toUpperCase())

  for (const provider of Object.values(OAUTH_PROVIDERS)) {
    const match = provider.envVarNames.some((envVarName) =>
      normalizedNames.includes(envVarName.toUpperCase())
    )
    if (match) {
      return provider
    }
  }

  return null
}

/**
 * Detect OAuth provider from MCP server name
 */
export function detectOAuthProviderByName(
  serverName: string
): OAuthProvider | null {
  const normalizedName = serverName.toLowerCase()

  for (const provider of Object.values(OAUTH_PROVIDERS)) {
    if (normalizedName.includes(provider.name)) {
      return provider
    }
  }

  return null
}
