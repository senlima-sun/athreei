"use client"

import { useState } from "react"
import { Key, Trash2, Loader2, AlertTriangle } from "lucide-react"

export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  createdAt: Date
  lastUsedAt: Date | null
}

interface ApiKeyListProps {
  apiKeys: ApiKey[]
  onRevoke: (keyId: string) => Promise<void>
}

export function ApiKeyList({ apiKeys, onRevoke }: ApiKeyListProps) {
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [showConfirmId, setShowConfirmId] = useState<string | null>(null)

  const handleRevoke = async (keyId: string) => {
    setRevokingId(keyId)
    try {
      await onRevoke(keyId)
    } finally {
      setRevokingId(null)
      setShowConfirmId(null)
    }
  }

  const maskKey = (prefix: string) => {
    return `${prefix}${"*".repeat(32)}`
  }

  const formatDate = (date: Date | null) => {
    if (!date) return "Never"
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (apiKeys.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
        <Key className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No API keys yet
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Create an API key to authenticate requests to this endpoint.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
      {apiKeys.map((apiKey) => (
        <div key={apiKey.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                <Key className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{apiKey.name}</p>
                <code className="text-sm text-gray-500 font-mono">
                  {maskKey(apiKey.keyPrefix)}
                </code>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <p className="text-gray-500">
                  Created {formatDate(apiKey.createdAt)}
                </p>
                <p className="text-gray-400">
                  Last used {formatDate(apiKey.lastUsedAt)}
                </p>
              </div>

              {showConfirmId === apiKey.id ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRevoke(apiKey.id)}
                    disabled={revokingId === apiKey.id}
                    className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {revokingId === apiKey.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmId(null)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowConfirmId(apiKey.id)}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                  title="Revoke API key"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
