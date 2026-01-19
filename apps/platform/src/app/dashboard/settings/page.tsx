"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { useSession } from "@/lib/auth-client"
import { fetchApi } from "@/lib/api"
import {
  User,
  Shield,
  Bell,
  Loader2,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  X,
} from "lucide-react"

type SettingsTab = "profile" | "security" | "notifications"

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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name)
    }
  }, [session?.user?.name])

  if (isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const user = session?.user

  const handleSave = async () => {
    setIsSaving(true)
    setError(null)
    try {
      await fetchApi("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      await refetch()
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile")
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

        {/* Error message */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

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
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const handlePasswordChange = async () => {
    setPasswordError(null)

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters")
      return
    }

    setIsChangingPassword(true)
    try {
      await fetchApi("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      setPasswordSuccess(true)
      setShowPasswordForm(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err) {
      setPasswordError(
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
    setPasswordError(null)
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

        {passwordSuccess && (
          <div className="mt-4 flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            <Check className="h-4 w-4" />
            Password changed successfully
          </div>
        )}

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

            {passwordError && (
              <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" />
                {passwordError}
              </div>
            )}

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
  const [error, setError] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const fetchSessions = async () => {
    try {
      setError(null)
      const response = await fetchApi<{ sessions: AuthSession[] }>(
        "/api/sessions"
      )
      setSessions(response.sessions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingId(sessionId)
    setError(null)
    try {
      await fetchApi(`/api/sessions/${sessionId}`, { method: "DELETE" })
      await fetchSessions()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke session")
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

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

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

function NotificationSettings() {
  const [emailNotifications, setEmailNotifications] = useState(true)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
        <p className="mt-1 text-sm text-gray-500">
          Configure how you receive notifications.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Email notifications</h4>
            <p className="mt-1 text-sm text-gray-500">
              Receive important updates via email.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={emailNotifications}
            onClick={() => setEmailNotifications(!emailNotifications)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 ${
              emailNotifications ? "bg-gray-900" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                emailNotifications ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
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
        </div>
      </div>
    </div>
  )
}
