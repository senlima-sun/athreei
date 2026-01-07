// apps/cli/src/commands/org.tsx
import React, { useState, useEffect } from "react"
import { Box, Text, useApp } from "ink"
import Spinner from "ink-spinner"
import { getAuthManager } from "../auth/manager.js"
import { createCredentialStore } from "../auth/credentials.js"

const API_URL = process.env.ATHREEI_API_URL || "http://localhost:3001"

interface Organization {
  id: string
  name: string
  slug: string
  role: string
}

export function OrgList() {
  const { exit } = useApp()
  const [loading, setLoading] = useState(true)
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [currentOrg, setCurrentOrg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const manager = getAuthManager()
      const session = await manager.getSession("athreei")

      if (!session) {
        setError("Not authenticated. Run: athreei auth login")
        setLoading(false)
        setTimeout(() => exit(), 100)
        return
      }

      try {
        const res = await fetch(`${API_URL}/api/auth/cli/verify`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        const data = await res.json()

        if (!data.valid) {
          setError("Session expired. Run: athreei auth login")
        } else {
          setOrgs(data.organizations)
          setCurrentOrg(data.currentOrganization)
        }
      } catch {
        setError("Failed to fetch organizations")
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
    return (
      <Box padding={1}>
        <Text color="red">Error: {error}</Text>
      </Box>
    )
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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function switchOrg() {
      const manager = getAuthManager()
      const store = createCredentialStore()
      const session = await manager.getSession("athreei")

      if (!session) {
        setError("Not authenticated")
        setStatus("error")
        setTimeout(() => exit(), 100)
        return
      }

      try {
        const res = await fetch(`${API_URL}/api/auth/cli/verify`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        const data = await res.json()

        const org = data.organizations.find(
          (o: Organization) =>
            o.name.toLowerCase() === orgName.toLowerCase() ||
            o.slug.toLowerCase() === orgName.toLowerCase()
        )

        if (!org) {
          setError(`Organization "${orgName}" not found`)
          setStatus("error")
        } else {
          await store.setActiveOrg(org.id)
          setStatus("success")
        }
      } catch {
        setError("Failed to switch organization")
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

  if (status === "error") {
    return (
      <Box padding={1}>
        <Text color="red">Error: {error}</Text>
      </Box>
    )
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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const manager = getAuthManager()
      const store = createCredentialStore()
      const session = await manager.getSession("athreei")

      if (!session) {
        setError("Not authenticated")
        setLoading(false)
        setTimeout(() => exit(), 100)
        return
      }

      try {
        const currentOrgId = await store.getActiveOrg()
        const res = await fetch(`${API_URL}/api/auth/cli/verify`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        const data = await res.json()

        const org = data.organizations.find(
          (o: Organization) => o.id === currentOrgId
        )
        setOrgName(org?.name || data.organizations[0]?.name || "None")
      } catch {
        setError("Failed to get current organization")
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
    return (
      <Box padding={1}>
        <Text color="red">{error}</Text>
      </Box>
    )
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
