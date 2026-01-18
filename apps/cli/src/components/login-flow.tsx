import { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import Spinner from "ink-spinner"
import { getAuthManager } from "../auth/manager"
import type { AuthSession } from "../auth/manager"

interface Props {
  provider: string
  token?: string
  profile?: string
}

type Status = "idle" | "authenticating" | "success" | "error"

export function LoginFlow({ provider, token, profile: _profile }: Props) {
  const { exit } = useApp()
  const [status, setStatus] = useState<Status>("idle")
  const [session, setSession] = useState<AuthSession | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState("")

  useEffect(() => {
    async function authenticate() {
      setStatus("authenticating")
      const manager = getAuthManager()

      try {
        let result: AuthSession

        if (token) {
          setMessage("Validating token...")
          result = await manager.loginWithToken(provider, token)
        } else {
          if (provider === "athreei") {
            setMessage("Opening browser for Platform authentication...")
          } else {
            setMessage(`Opening browser for ${provider} authentication...`)
          }
          result = await manager.login(provider)
        }

        setSession(result)
        setStatus("success")
        setTimeout(() => exit(), 1000)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setStatus("error")
        setTimeout(() => exit(), 100)
      }
    }

    authenticate()
  }, [provider, token, exit])

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Athreei Authentication
        </Text>
      </Box>

      {status === "authenticating" && (
        <Box>
          <Text color="yellow">
            <Spinner type="dots" />
          </Text>
          <Text> {message}</Text>
        </Box>
      )}

      {status === "success" && session && (
        <Box flexDirection="column">
          <Box>
            <Text color="green">✓</Text>
            <Text>
              {" "}
              {session.provider === "athreei"
                ? "Successfully authenticated with Athreei Platform!"
                : "Successfully authenticated!"}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Provider: </Text>
            <Text>
              {session.provider === "athreei" ? "Athreei" : session.provider}
            </Text>
          </Box>
          <Box>
            <Text dimColor>Username: </Text>
            <Text color="cyan">{session.username}</Text>
          </Box>
        </Box>
      )}

      {status === "error" && (
        <Box>
          <Text color="red">✗ Authentication failed: {error}</Text>
        </Box>
      )}
    </Box>
  )
}
