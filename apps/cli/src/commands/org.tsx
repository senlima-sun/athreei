// apps/cli/src/commands/org.tsx
import React, { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import Spinner from "ink-spinner"
import { getApiClient, ApiError, AuthError } from "../lib/api.js"
import { createCredentialStore } from "../auth/credentials.js"
import { ErrorDisplay } from "../components/error.js"

// Extended Organization type with role from verify response
interface OrganizationWithRole {
  id: string
  name: string
  slug: string
  role: string
}

interface VerifyResponse {
  valid: boolean
  user?: {
    id: string
    email: string
    name: string | null
  }
  currentOrganization?: string
  organizations?: OrganizationWithRole[]
  error?: string
}

export function OrgList() {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [orgs, setOrgs] = useState<OrganizationWithRole[]>([])
  const [currentOrg, setCurrentOrg] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const api = getApiClient()
        const data = await api.get<VerifyResponse>("/api/auth/cli/verify")

        if (!data.valid) {
          throw new AuthError(data.error ?? "Session expired")
        }

        setOrgs(data.organizations ?? [])
        setCurrentOrg(data.currentOrganization ?? null)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      }

      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    load()
  }, [exit])

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Loading organizations...</Text>
      </Box>
    )
  }

  if (error) {
    return <ErrorDisplay error={error} context="loading organizations" />
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          Organizations
        </Text>
      </Box>

      {orgs.map((org) => (
        <Box key={org.id}>
          <Text color={org.id === currentOrg ? "green" : "white"}>
            {org.id === currentOrg ? "● " : "○ "}
          </Text>
          <Text>{org.name}</Text>
          <Text dimColor> ({org.role})</Text>
        </Box>
      ))}
    </Box>
  )
}

export function OrgSwitch({ orgName }: { orgName: string }) {
  const { exit } = useApp()
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  )
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function switchOrg() {
      try {
        const api = getApiClient()
        const store = createCredentialStore()

        const data = await api.get<VerifyResponse>("/api/auth/cli/verify")

        if (!data.valid) {
          throw new AuthError(data.error ?? "Session expired")
        }

        const org = data.organizations?.find(
          (o) =>
            o.name.toLowerCase() === orgName.toLowerCase() ||
            o.slug.toLowerCase() === orgName.toLowerCase()
        )

        if (!org) {
          throw new ApiError(404, `Organization "${orgName}" not found`)
        }

        await store.setActiveOrg(org.id)
        setStatus("success")
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        setStatus("error")
      }

      setTimeout(() => exit(), 100)
    }

    switchOrg()
  }, [orgName, exit])

  if (status === "loading") {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
        <Text> Switching organization...</Text>
      </Box>
    )
  }

  if (status === "error" && error) {
    return <ErrorDisplay error={error} context="switching organization" />
  }

  return (
    <Box padding={1}>
      <Text color="green">✓ Switched to {orgName}</Text>
    </Box>
  )
}

export function OrgCurrent() {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const api = getApiClient()
        const store = createCredentialStore()

        const currentOrgId = await store.getActiveOrg()
        const data = await api.get<VerifyResponse>("/api/auth/cli/verify")

        if (!data.valid) {
          throw new AuthError(data.error ?? "Session expired")
        }

        const org = data.organizations?.find((o) => o.id === currentOrgId)
        setOrgName(org?.name || data.organizations?.[0]?.name || "None")
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      }

      setLoading(false)
      setTimeout(() => exit(), 100)
    }

    load()
  }, [exit])

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="yellow">
          <Spinner type="dots" />
        </Text>
      </Box>
    )
  }

  if (error) {
    return <ErrorDisplay error={error} context="getting current organization" />
  }

  return (
    <Box padding={1}>
      <Text>Current organization: </Text>
      <Text color="cyan" bold>
        {orgName}
      </Text>
    </Box>
  )
}
