"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { PageHeader } from "@/components/dashboard/page-header"
import {
  NamespaceServerList,
  ServerPickerModal,
  NamespaceSkillList,
  NamespaceRuleList,
  SkillPickerModal,
  RulePickerModal,
  type NamespaceServer,
  type McpServer,
  type NamespaceSkill,
  type NamespaceRule,
  type PickerSkill,
  type PickerRule,
} from "@/components/namespaces"
import { useActiveOrganization } from "@/lib/auth-client"
import {
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  BookOpen,
  Scale,
} from "lucide-react"
import { API_URL } from "@/constants"
import type { RuleScope } from "@/types"

interface NamespaceDetails {
  id: string
  name: string
  slug: string
  description?: string | null
  isDefault: boolean
  createdAt: string
  serverCount: number
}

interface ApiServer {
  id: string
  name: string
  description?: string | null
  status: string
  transport: string
  mappingId: string
  addedAt: string
  enabled?: boolean
}

interface ApiSkill {
  id: string
  name: string
  description?: string | null
  tags: string[]
  isEnabled: boolean
  mappingId: string
  enabled?: boolean
}

interface ApiRule {
  id: string
  name: string
  description?: string | null
  scope: RuleScope
  priority: number
  isEnabled: boolean
  mappingId: string
  enabled?: boolean
}

export default function NamespaceDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const namespaceId = params.id as string
  const { data: activeOrg, isPending: isOrgPending } = useActiveOrganization()

  const [namespace, setNamespace] = useState<NamespaceDetails | null>(null)
  const [servers, setServers] = useState<NamespaceServer[]>([])
  const [skills, setSkills] = useState<NamespaceSkill[]>([])
  const [rules, setRules] = useState<NamespaceRule[]>([])
  const [availableServers, setAvailableServers] = useState<McpServer[]>([])
  const [availableSkills, setAvailableSkills] = useState<PickerSkill[]>([])
  const [availableRules, setAvailableRules] = useState<PickerRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showServerPickerModal, setShowServerPickerModal] = useState(false)
  const [showSkillPickerModal, setShowSkillPickerModal] = useState(false)
  const [showRulePickerModal, setShowRulePickerModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadNamespace = useCallback(async () => {
    if (!activeOrg?.id) return

    try {
      const response = await fetch(`${API_URL}/api/namespaces/${namespaceId}`, {
        credentials: "include",
      })

      if (!response.ok) {
        if (response.status === 404) {
          setNamespace(null)
          return
        }
        throw new Error("Failed to fetch namespace")
      }

      const data = await response.json()
      setNamespace(data.namespace)

      const transformedServers: NamespaceServer[] = (data.servers || []).map(
        (server: ApiServer) => ({
          id: server.mappingId,
          serverId: server.id,
          name: server.name,
          description: server.description,
          status: server.status === "active" ? "online" : "offline",
          enabled: server.enabled ?? true,
        })
      )
      setServers(transformedServers)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load namespace")
    } finally {
      setIsLoading(false)
    }
  }, [activeOrg?.id, namespaceId])

  const loadNamespaceSkills = useCallback(async () => {
    if (!activeOrg?.id) return

    try {
      const response = await fetch(
        `${API_URL}/api/namespaces/${namespaceId}/skills`,
        { credentials: "include" }
      )

      if (!response.ok) return

      const data = await response.json()
      const transformedSkills: NamespaceSkill[] = (data.data || []).map(
        (skill: ApiSkill) => ({
          id: skill.mappingId,
          skillId: skill.id,
          name: skill.name,
          description: skill.description,
          tags: skill.tags || [],
          enabled: skill.enabled ?? true,
        })
      )
      setSkills(transformedSkills)
    } catch {
      // Silently fail
    }
  }, [activeOrg?.id, namespaceId])

  const loadNamespaceRules = useCallback(async () => {
    if (!activeOrg?.id) return

    try {
      const response = await fetch(
        `${API_URL}/api/namespaces/${namespaceId}/rules`,
        { credentials: "include" }
      )

      if (!response.ok) return

      const data = await response.json()
      const transformedRules: NamespaceRule[] = (data.data || []).map(
        (rule: ApiRule) => ({
          id: rule.mappingId,
          ruleId: rule.id,
          name: rule.name,
          description: rule.description,
          scope: rule.scope,
          priority: rule.priority,
          enabled: rule.enabled ?? true,
        })
      )
      setRules(transformedRules)
    } catch {
      // Silently fail
    }
  }, [activeOrg?.id, namespaceId])

  const loadAvailableServers = useCallback(async () => {
    if (!activeOrg?.id) return

    try {
      const response = await fetch(
        `${API_URL}/api/mcp-servers?organizationId=${activeOrg.id}`,
        { credentials: "include" }
      )

      if (!response.ok) return

      const data = await response.json()
      const allServers: McpServer[] = (data.data || []).map(
        (server: {
          id: string
          name: string
          description?: string | null
          status: string
        }) => ({
          id: server.id,
          name: server.name,
          description: server.description,
          status: server.status === "active" ? "online" : "offline",
        })
      )
      setAvailableServers(allServers)
    } catch {
      // Silently fail
    }
  }, [activeOrg?.id])

  const loadAvailableSkills = useCallback(async () => {
    if (!activeOrg?.id) return

    try {
      const response = await fetch(
        `${API_URL}/api/skills?organizationId=${activeOrg.id}`,
        { credentials: "include" }
      )

      if (!response.ok) return

      const data = await response.json()
      const allSkills: PickerSkill[] = (data.data || []).map(
        (skill: {
          id: string
          name: string
          description?: string | null
          tags: string[]
          isEnabled: boolean
        }) => ({
          id: skill.id,
          name: skill.name,
          description: skill.description,
          tags: skill.tags || [],
          isEnabled: skill.isEnabled,
        })
      )
      setAvailableSkills(allSkills)
    } catch {
      // Silently fail
    }
  }, [activeOrg?.id])

  const loadAvailableRules = useCallback(async () => {
    if (!activeOrg?.id) return

    try {
      const response = await fetch(
        `${API_URL}/api/rules?organizationId=${activeOrg.id}`,
        { credentials: "include" }
      )

      if (!response.ok) return

      const data = await response.json()
      const allRules: PickerRule[] = (data.data || []).map(
        (rule: {
          id: string
          name: string
          description?: string | null
          scope: RuleScope
          priority: number
          isEnabled: boolean
        }) => ({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          scope: rule.scope,
          priority: rule.priority,
          isEnabled: rule.isEnabled,
        })
      )
      setAvailableRules(allRules)
    } catch {
      // Silently fail
    }
  }, [activeOrg?.id])

  useEffect(() => {
    if (!isOrgPending && activeOrg?.id) {
      loadNamespace()
      loadNamespaceSkills()
      loadNamespaceRules()
      loadAvailableServers()
      loadAvailableSkills()
      loadAvailableRules()
    }
  }, [
    isOrgPending,
    activeOrg?.id,
    loadNamespace,
    loadNamespaceSkills,
    loadNamespaceRules,
    loadAvailableServers,
    loadAvailableSkills,
    loadAvailableRules,
  ])

  const handleAddServer = async (serverId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/namespaces/${namespaceId}/servers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ serverId }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.message || "Failed to add server")
      }

      const data = await response.json()
      const newServer: NamespaceServer = {
        id: data.mapping.id,
        serverId: data.server.id,
        name: data.server.name,
        description: data.server.description,
        status: data.server.status === "active" ? "online" : "offline",
        enabled: true,
      }
      setServers((prev) => [...prev, newServer])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add server")
    }
  }

  const handleRemoveServer = async (serverId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/namespaces/${namespaceId}/servers/${serverId}`,
        { method: "DELETE", credentials: "include" }
      )

      if (!response.ok) throw new Error("Failed to remove server")
      setServers((prev) => prev.filter((s) => s.serverId !== serverId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove server")
    }
  }

  const handleToggleServer = async (serverId: string, enabled: boolean) => {
    try {
      const response = await fetch(
        `${API_URL}/api/namespaces/${namespaceId}/servers/${serverId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ enabled }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.message || "Failed to update server status")
      }

      setServers((prev) =>
        prev.map((s) => (s.serverId === serverId ? { ...s, enabled } : s))
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update server status"
      )
    }
  }

  const handleAddSkill = async (skillId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/namespaces/${namespaceId}/skills`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ skillId }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.message || "Failed to add skill")
      }

      const data = await response.json()
      const newSkill: NamespaceSkill = {
        id: data.mapping.id,
        skillId: data.skill.id,
        name: data.skill.name,
        description: data.skill.description,
        tags: data.skill.tags || [],
        enabled: true,
      }
      setSkills((prev) => [...prev, newSkill])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add skill")
    }
  }

  const handleRemoveSkill = async (skillId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/namespaces/${namespaceId}/skills/${skillId}`,
        { method: "DELETE", credentials: "include" }
      )

      if (!response.ok) throw new Error("Failed to remove skill")
      setSkills((prev) => prev.filter((s) => s.skillId !== skillId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove skill")
    }
  }

  const handleToggleSkill = async (skillId: string, enabled: boolean) => {
    try {
      const response = await fetch(
        `${API_URL}/api/namespaces/${namespaceId}/skills/${skillId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ enabled }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.message || "Failed to update skill status")
      }

      setSkills((prev) =>
        prev.map((s) => (s.skillId === skillId ? { ...s, enabled } : s))
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update skill status"
      )
    }
  }

  const handleAddRule = async (ruleId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/namespaces/${namespaceId}/rules`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ ruleId }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.message || "Failed to add rule")
      }

      const data = await response.json()
      const newRule: NamespaceRule = {
        id: data.mapping.id,
        ruleId: data.rule.id,
        name: data.rule.name,
        description: data.rule.description,
        scope: data.rule.scope,
        priority: data.rule.priority,
        enabled: true,
      }
      setRules((prev) => [...prev, newRule])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add rule")
    }
  }

  const handleRemoveRule = async (ruleId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/namespaces/${namespaceId}/rules/${ruleId}`,
        { method: "DELETE", credentials: "include" }
      )

      if (!response.ok) throw new Error("Failed to remove rule")
      setRules((prev) => prev.filter((r) => r.ruleId !== ruleId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove rule")
    }
  }

  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch(
        `${API_URL}/api/namespaces/${namespaceId}/rules/${ruleId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ enabled }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.message || "Failed to update rule status")
      }

      setRules((prev) =>
        prev.map((r) => (r.ruleId === ruleId ? { ...r, enabled } : r))
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update rule status"
      )
    }
  }

  const handleDeleteNamespace = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/api/namespaces/${namespaceId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.message || "Failed to delete namespace")
      }

      router.push("/dashboard/namespaces")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete namespace"
      )
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isOrgPending || isLoading) {
    return (
      <div>
        <PageHeader title="Namespace Details" />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  if (!activeOrg) {
    return (
      <div>
        <PageHeader title="Namespace Details" />
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-center">
          <p className="text-sm text-yellow-700">
            Please select an organization to view namespace details.
          </p>
        </div>
      </div>
    )
  }

  if (!namespace) {
    return (
      <div>
        <PageHeader title="Namespace not found" />
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            This namespace doesn&apos;t exist or you don&apos;t have access to
            it.
          </p>
          <Link
            href="/dashboard/namespaces"
            className="mt-4 inline-block text-sm font-medium text-gray-900 hover:underline"
          >
            Back to namespaces
          </Link>
        </div>
      </div>
    )
  }

  const existingServerIds = servers.map((s) => s.serverId)
  const existingSkillIds = skills.map((s) => s.skillId)
  const existingRuleIds = rules.map((r) => r.ruleId)

  const serversToShow = availableServers.filter(
    (s) => !existingServerIds.includes(s.id)
  )
  const skillsToShow = availableSkills.filter(
    (s) => !existingSkillIds.includes(s.id)
  )
  const rulesToShow = availableRules.filter(
    (r) => !existingRuleIds.includes(r.id)
  )

  return (
    <div>
      <PageHeader
        title={namespace.name}
        description={
          namespace.description || "Manage servers, skills, and rules"
        }
      />

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 font-medium hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-8">
        {/* Servers */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              Servers ({servers.length})
            </h2>
            <button
              type="button"
              onClick={() => setShowServerPickerModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              Add server
            </button>
          </div>
          <NamespaceServerList
            servers={servers}
            onRemove={handleRemoveServer}
            onToggleEnabled={handleToggleServer}
          />
        </div>

        {/* Skills */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-medium text-gray-900">
                Skills ({skills.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowSkillPickerModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              Add skill
            </button>
          </div>
          <NamespaceSkillList
            skills={skills}
            onRemove={handleRemoveSkill}
            onToggleEnabled={handleToggleSkill}
          />
        </div>

        {/* Rules */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-medium text-gray-900">
                Rules ({rules.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowRulePickerModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Plus className="h-4 w-4" />
              Add rule
            </button>
          </div>
          <NamespaceRuleList
            rules={rules}
            onRemove={handleRemoveRule}
            onToggleEnabled={handleToggleRule}
          />
        </div>

        {/* Settings */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-medium text-gray-900">Settings</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage this namespace&apos;s settings.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <p className="mt-1 text-sm text-gray-900">{namespace.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Slug
              </label>
              <p className="mt-1 font-mono text-sm text-gray-500">
                {namespace.slug}
              </p>
            </div>

            {namespace.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <p className="mt-1 text-sm text-gray-900">
                  {namespace.description}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Default namespace
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {namespace.isDefault ? "Yes" : "No"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Created
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(namespace.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div className="rounded-lg border border-red-200 bg-white p-6">
          <h2 className="text-lg font-medium text-red-600">Danger zone</h2>
          <p className="mt-1 text-sm text-gray-500">
            Irreversible actions that affect this namespace.
          </p>

          <div className="mt-6">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={namespace.isDefault}
                className="inline-flex items-center gap-2 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete namespace
              </button>
            ) : (
              <div className="rounded-md border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Are you sure you want to delete this namespace?
                    </p>
                    <p className="mt-1 text-sm text-red-600">
                      This action cannot be undone. All server, skill, and rule
                      associations will be removed.
                    </p>
                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={handleDeleteNamespace}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeleting && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        Yes, delete namespace
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {namespace.isDefault && (
              <p className="mt-2 text-sm text-gray-500">
                Cannot delete the default namespace. Set another namespace as
                default first.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ServerPickerModal
        isOpen={showServerPickerModal}
        onClose={() => setShowServerPickerModal(false)}
        onSelect={handleAddServer}
        availableServers={serversToShow}
        excludeServerIds={existingServerIds}
      />

      <SkillPickerModal
        isOpen={showSkillPickerModal}
        onClose={() => setShowSkillPickerModal(false)}
        onSelect={handleAddSkill}
        availableSkills={skillsToShow}
        excludeSkillIds={existingSkillIds}
      />

      <RulePickerModal
        isOpen={showRulePickerModal}
        onClose={() => setShowRulePickerModal(false)}
        onSelect={handleAddRule}
        availableRules={rulesToShow}
        excludeRuleIds={existingRuleIds}
      />
    </div>
  )
}
