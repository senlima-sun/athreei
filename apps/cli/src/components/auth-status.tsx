import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import Spinner from "ink-spinner"
import { getAuthManager } from "../auth/manager"

interface ProviderStatus {
  name: string
  displayName: string
  authenticated: boolean
  username?: string
}

export function AuthStatus() {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    async function loadStatus() {
      const manager = getAuthManager()
      const status = await manager.getStatus()
      setProviders(status.providers)
      setAuthenticated(status.authenticated)
      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    loadStatus()
  }, [exit])

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Loading authentication status...</Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Authentication Status
        </Text>
      </Box>

      {!authenticated && (
        <Box marginBottom={1}>
          <Text dimColor>Not authenticated with any provider</Text>
        </Box>
      )}

      {providers.map((provider) => (
        <Box key={provider.name}>
          <Text color={provider.authenticated ? "green" : "gray"}>
            {provider.authenticated ? "✓" : "○"}
          </Text>
          <Text> {provider.displayName}: </Text>
          {provider.authenticated ? (
            <Text color="cyan">{provider.username}</Text>
          ) : (
            <Text dimColor>not authenticated</Text>
          )}
        </Box>
      ))}

      {!authenticated && (
        <Box marginTop={1}>
          <Text dimColor>Run </Text>
          <Text color="yellow">athreei auth login {"<provider>"}</Text>
          <Text dimColor> to authenticate</Text>
        </Box>
      )}
    </Box>
  )
}
