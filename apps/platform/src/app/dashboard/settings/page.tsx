"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { PageHeader, LoadingState } from "@/components/dashboard"
import { useSession } from "@/lib/auth-client"
import { fetchApi } from "@/lib/api"
import {
  User,
  Shield,
  Bell,
  Loader2,
  Check,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  X,
  Key,
  Plus,
  Copy,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import { useActiveOrganization } from "@/lib/auth-client"
import { API_URL } from "@/constants"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type SettingsTab = "profile" | "security" | "notifications" | "api-keys"

// Auth session type from the sessions API
interface AuthSession {
  id: string
  device: string | null
  browser: string | null
  lastActive: string
  current: boolean
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

interface TabProps {
  id: SettingsTab
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  onClick: () => void
}

function Tab({ id: _id, label, icon: Icon, active, onClick }: TabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-gray-100 text-gray-900"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

function ProfileSettings() {
  const { data: session, isPending, refetch } = useSession()
  const [name, setName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name)
    }
  }, [session?.user?.name])

  if (isPending) {
    return <LoadingState />
  }

  const user = session?.user

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await fetchApi("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      await refetch()
      setSaved(true)
      toast.success("Profile updated successfully")
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Profile</h3>
        <p className="mt-1 text-sm text-gray-500">
          Manage your personal information and preferences.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          {user?.image ? (
            <img
              src={user.image}
              alt={user.name || "User avatar"}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-xl font-medium text-gray-600">
              {user?.name?.[0]?.toUpperCase() ||
                user?.email?.[0]?.toUpperCase() ||
                "U"}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{user?.name || "User"}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        {/* Form fields */}
        <div className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Display name
            </label>
            <input
              type="text"
              id="name"
              value={name || user?.name || ""}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              placeholder="Your name"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <input
              type="email"
              id="email"
              value={user?.email || ""}
              disabled
              className="mt-1 block w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Email cannot be changed.
            </p>
          </div>
        </div>

        {/* Save button */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || name === user?.name}
            className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4" />
            ) : null}
            {saved ? "Saved" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  )
}

function SecuritySettings() {
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setIsChangingPassword(true)
    try {
      await fetchApi("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      toast.success("Password changed successfully")
      setShowPasswordForm(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to change password"
      )
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleCancelPasswordChange = () => {
    setShowPasswordForm(false)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Security</h3>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account security and authentication.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h4 className="font-medium text-gray-900">Password</h4>
        <p className="mt-1 text-sm text-gray-500">
          Change your password to keep your account secure.
        </p>

        {!showPasswordForm ? (
          <button
            type="button"
            onClick={() => setShowPasswordForm(true)}
            className="mt-4 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Change password
          </button>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Current password
              </label>
              <div className="relative mt-1">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-medium text-gray-700"
              >
                New password
              </label>
              <div className="relative mt-1">
                <input
                  type={showNewPassword ? "text" : "password"}
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirm new password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handlePasswordChange}
                disabled={
                  isChangingPassword ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
                className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isChangingPassword && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Change password
              </button>
              <button
                type="button"
                onClick={handleCancelPasswordChange}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <SessionsSection />
    </div>
  )
}

function SessionsSection() {
  const [sessions, setSessions] = useState<AuthSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const fetchSessions = async () => {
    try {
      const response = await fetchApi<{ sessions: AuthSession[] }>(
        "/api/sessions"
      )
      setSessions(response.sessions || [])
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load sessions"
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId)
    try {
      await fetchApi(`/api/sessions/${sessionId}`, { method: "DELETE" })
      toast.success("Session revoked successfully")
      await fetchSessions()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to revoke session"
      )
    } finally {
      setRevokingId(null)
    }
  }

  const formatLastActive = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getDeviceIcon = (device: string | null) => {
    if (!device) return Monitor
    const d = device.toLowerCase()
    if (d.includes("iphone") || d.includes("android") || d.includes("mobile")) {
      return Smartphone
    }
    return Monitor
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h4 className="font-medium text-gray-900">Sessions</h4>
      <p className="mt-1 text-sm text-gray-500">
        Manage your active sessions across devices.
      </p>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">
            No active sessions found
          </p>
        ) : (
          sessions.map((session) => {
            const DeviceIcon = getDeviceIcon(session.device)
            return (
              <div
                key={session.id}
                className={`flex items-center justify-between rounded-md border p-3 ${
                  session.current
                    ? "border-green-200 bg-green-50"
                    : "border-gray-100 bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <DeviceIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {session.browser || "Unknown browser"}
                        {session.device && ` on ${session.device}`}
                      </p>
                      {session.current && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatLastActive(session.lastActive)}
                      {session.ipAddress && ` • ${session.ipAddress}`}
                    </p>
                  </div>
                </div>
                {!session.current && (
                  <button
                    type="button"
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={revokingId === session.id}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                    title="Revoke session"
                  >
                    {revokingId === session.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

interface ApiKeyData {
  id: string
  name: string
  prefix: string
  endpointId: string | null
  endpointName: string | null
  lastUsedAt: string | null
  usageCount: number
  createdAt: string
  expiresAt: string | null
  scopes: string[] | null
}

interface EndpointData {
  id: string
  name: string
}

interface CreateKeyFormData {
  name: string
  endpointId: string
  scopes: string[]
  expiration: string
}

function CreateApiKeyDialog({
  open,
  onOpenChange,
  organizationId,
  endpoints,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationId: string
  endpoints: EndpointData[]
  onCreated: () => void
}) {
  const [formData, setFormData] = useState<CreateKeyFormData>({
    name: "",
    endpointId: "",
    scopes: ["read"],
    expiration: "never",
  })
  const [isCreating, setIsCreating] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("Name is required")
      return
    }

    setIsCreating(true)
    try {
      let expiresAt: string | undefined
      if (formData.expiration !== "never") {
        const now = new Date()
        const days = parseInt(formData.expiration, 10)
        now.setDate(now.getDate() + days)
        expiresAt = now.toISOString()
      }

      const response = await fetch(
        `${API_URL}/api/api-keys?organizationId=${organizationId}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name.trim(),
            endpointId: formData.endpointId || undefined,
            scopes: formData.scopes,
            expiresAt,
          }),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to create API key")
      }

      const data = await response.json()
      setCreatedKey(data.key)
      toast.success("API key created successfully")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create API key"
      )
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopy = async () => {
    if (createdKey) {
      await navigator.clipboard.writeText(createdKey)
      setCopied(true)
      toast.success("API key copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    if (createdKey) {
      onCreated()
    }
    setFormData({
      name: "",
      endpointId: "",
      scopes: ["read"],
      expiration: "never",
    })
    setCreatedKey(null)
    setCopied(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {createdKey ? "API Key Created" : "Create API Key"}
          </DialogTitle>
          <DialogDescription>
            {createdKey
              ? "Make sure to copy your API key now. You won't be able to see it again."
              : "Create a new API key for programmatic access."}
          </DialogDescription>
        </DialogHeader>

        {createdKey ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <p className="text-sm text-amber-800">
                This key will only be shown once. Store it securely.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Your API Key
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-mono break-all">
                  {createdKey}
                </code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="shrink-0 rounded-md border border-gray-300 p-2 hover:bg-gray-50"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            <DialogFooter>
              <button
                type="button"
                onClick={handleClose}
                className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Done
              </button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="keyName"
                className="block text-sm font-medium text-gray-700"
              >
                Name
              </label>
              <input
                type="text"
                id="keyName"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="My API Key"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Endpoint (optional)
              </label>
              <Select
                value={formData.endpointId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, endpointId: value ?? "" }))
                }
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No endpoint (org-wide)</SelectItem>
                  {endpoints.map((ep) => (
                    <SelectItem key={ep.id} value={ep.id}>
                      {ep.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Scope
              </label>
              <Select
                value={formData.scopes[0] || "read"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    scopes: [value ?? "read"],
                  }))
                }
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="write">Write</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Expiration
              </label>
              <Select
                value={formData.expiration}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    expiration: value ?? "never",
                  }))
                }
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <DialogClose className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </DialogClose>
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating || !formData.name.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Key
              </button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RevokeKeyDialog({
  open,
  onOpenChange,
  keyToRevoke,
  organizationId,
  onRevoked,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  keyToRevoke: ApiKeyData | null
  organizationId: string
  onRevoked: () => void
}) {
  const [isRevoking, setIsRevoking] = useState(false)

  const handleRevoke = async () => {
    if (!keyToRevoke) return

    setIsRevoking(true)
    try {
      const response = await fetch(
        `${API_URL}/api/api-keys/${keyToRevoke.id}?organizationId=${organizationId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      )

      if (!response.ok) {
        throw new Error("Failed to revoke API key")
      }

      toast.success("API key revoked successfully")
      onRevoked()
      onOpenChange(false)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to revoke API key"
      )
    } finally {
      setIsRevoking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Revoke API Key</DialogTitle>
          <DialogDescription>
            Are you sure you want to revoke this API key? This action cannot be
            undone and any applications using this key will lose access.
          </DialogDescription>
        </DialogHeader>

        {keyToRevoke && (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-900">
              {keyToRevoke.name}
            </p>
            <p className="text-xs text-gray-500">{keyToRevoke.prefix}...</p>
          </div>
        )}

        <DialogFooter>
          <DialogClose className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </DialogClose>
          <button
            type="button"
            onClick={handleRevoke}
            disabled={isRevoking}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRevoking && <Loader2 className="h-4 w-4 animate-spin" />}
            Revoke Key
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ApiKeySettings() {
  const { data: activeOrg, isPending: isOrgPending } = useActiveOrganization()
  const [keys, setKeys] = useState<ApiKeyData[]>([])
  const [endpoints, setEndpoints] = useState<EndpointData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false)
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKeyData | null>(null)

  const fetchData = async () => {
    if (!activeOrg?.id) return

    setIsLoading(true)
    try {
      const [keysResponse, endpointsResponse] = await Promise.all([
        fetch(`${API_URL}/api/api-keys?organizationId=${activeOrg.id}`, {
          credentials: "include",
        }),
        fetch(`${API_URL}/api/endpoints?organizationId=${activeOrg.id}`, {
          credentials: "include",
        }),
      ])

      if (keysResponse.ok) {
        const keysData = await keysResponse.json()
        setKeys(keysData.keys || [])
      }

      if (endpointsResponse.ok) {
        const endpointsData = await endpointsResponse.json()
        setEndpoints(endpointsData.endpoints || [])
      }
    } catch {
      toast.error("Failed to load API keys")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (activeOrg?.id) {
      fetchData()
    }
  }, [activeOrg?.id])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never"
    return new Date(dateStr).toLocaleDateString()
  }

  const formatLastUsed = (dateStr: string | null) => {
    if (!dateStr) return "Never used"
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const handleRevokeClick = (key: ApiKeyData) => {
    setKeyToRevoke(key)
    setRevokeDialogOpen(true)
  }

  if (isOrgPending || isLoading) {
    return <LoadingState />
  }

  if (!activeOrg) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">API Keys</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select an organization to manage API keys.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">API Keys</h3>
          <p className="mt-1 text-sm text-gray-500">
            Manage API keys for programmatic access to your organization.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" />
          Create Key
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white">
        {keys.length === 0 ? (
          <div className="p-8 text-center">
            <Key className="mx-auto h-12 w-12 text-gray-300" />
            <h4 className="mt-4 text-sm font-medium text-gray-900">
              No API keys
            </h4>
            <p className="mt-1 text-sm text-gray-500">
              Create an API key to get started with programmatic access.
            </p>
            <button
              type="button"
              onClick={() => setCreateDialogOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              Create Key
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {key.name}
                    </p>
                    {key.scopes && key.scopes.length > 0 && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {key.scopes[0]}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                    <span className="font-mono">{key.prefix}...</span>
                    {key.endpointName && (
                      <span>Endpoint: {key.endpointName}</span>
                    )}
                    <span>Created: {formatDate(key.createdAt)}</span>
                    <span>Last used: {formatLastUsed(key.lastUsedAt)}</span>
                    {key.expiresAt && (
                      <span>Expires: {formatDate(key.expiresAt)}</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevokeClick(key)}
                  className="ml-4 rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  title="Revoke key"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateApiKeyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        organizationId={activeOrg.id}
        endpoints={endpoints}
        onCreated={fetchData}
      />

      <RevokeKeyDialog
        open={revokeDialogOpen}
        onOpenChange={setRevokeDialogOpen}
        keyToRevoke={keyToRevoke}
        organizationId={activeOrg.id}
        onRevoked={fetchData}
      />
    </div>
  )
}

interface NotificationPreferences {
  email: boolean
  securityAlerts: boolean
  productUpdates: boolean
  usageAlerts: boolean
}

interface UserPreferences {
  notifications: NotificationPreferences
}

interface NotificationToggleProps {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

function NotificationToggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div>
        <h4 className="font-medium text-gray-900">{label}</h4>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-gray-900" : "bg-gray-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}

function NotificationSettings() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: true,
    securityAlerts: true,
    productUpdates: false,
    usageAlerts: true,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const data = await fetchApi<UserPreferences>("/api/preferences")
        setPreferences(data.notifications)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load preferences"
        )
      } finally {
        setIsLoading(false)
      }
    }
    loadPreferences()
  }, [])

  const updatePreference = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    const previousValue = preferences[key]
    setPreferences((prev) => ({ ...prev, [key]: value }))
    setIsSaving(true)

    try {
      await fetchApi<UserPreferences>("/api/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications: { [key]: value } }),
      })
      toast.success("Preferences saved")
    } catch (err) {
      setPreferences((prev) => ({ ...prev, [key]: previousValue }))
      toast.error(
        err instanceof Error ? err.message : "Failed to save preferences"
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
          <p className="mt-1 text-sm text-gray-500">
            Configure how you receive notifications.
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
        <p className="mt-1 text-sm text-gray-500">
          Configure how you receive notifications.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="divide-y divide-gray-100">
          <NotificationToggle
            label="Email notifications"
            description="Receive important updates and alerts via email."
            checked={preferences.email}
            onChange={(value) => updatePreference("email", value)}
            disabled={isSaving}
          />
          <NotificationToggle
            label="Security alerts"
            description="Get notified about login attempts and password changes."
            checked={preferences.securityAlerts}
            onChange={(value) => updatePreference("securityAlerts", value)}
            disabled={isSaving}
          />
          <NotificationToggle
            label="Product updates"
            description="Receive news about new features and improvements."
            checked={preferences.productUpdates}
            onChange={(value) => updatePreference("productUpdates", value)}
            disabled={isSaving}
          />
          <NotificationToggle
            label="Usage alerts"
            description="Get notified when approaching quota limits."
            checked={preferences.usageAlerts}
            onChange={(value) => updatePreference("usageAlerts", value)}
            disabled={isSaving}
          />
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile")

  const tabs: { id: SettingsTab; label: string; icon: typeof User }[] = [
    { id: "profile", label: "Profile", icon: User },
    { id: "security", label: "Security", icon: Shield },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "api-keys", label: "API Keys", icon: Key },
  ]

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your account settings and preferences"
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Tabs */}
        <nav className="flex gap-2 lg:w-48 lg:shrink-0 lg:flex-col">
          {tabs.map((tab) => (
            <Tab
              key={tab.id}
              id={tab.id}
              label={tab.label}
              icon={tab.icon}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1">
          {activeTab === "profile" && <ProfileSettings />}
          {activeTab === "security" && <SecuritySettings />}
          {activeTab === "notifications" && <NotificationSettings />}
          {activeTab === "api-keys" && <ApiKeySettings />}
        </div>
      </div>
    </div>
  )
}
