"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { useSession } from "@/lib/auth-client"
import { User, Shield, Bell, Loader2, Check } from "lucide-react"

type SettingsTab = "profile" | "security" | "notifications"

interface TabProps {
  id: SettingsTab
  label: string
  icon: React.ComponentType<{ className?: string }>
  active: boolean
  onClick: () => void
}

function Tab({ id, label, icon: Icon, active, onClick }: TabProps) {
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
  const { data: session, isPending } = useSession()
  const [name, setName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Initialize name from session
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
    // TODO: Implement profile update API
    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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
            disabled={isSaving}
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
        <button
          type="button"
          className="mt-4 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Change password
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h4 className="font-medium text-gray-900">Sessions</h4>
        <p className="mt-1 text-sm text-gray-500">
          Manage your active sessions across devices.
        </p>
        <div className="mt-4 rounded-md border border-gray-100 bg-gray-50 p-3">
          <p className="text-sm text-gray-600">Current session</p>
          <p className="mt-0.5 text-xs text-gray-500">Active now</p>
        </div>
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
