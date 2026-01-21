"use client"

import { useState } from "react"
import {
  Key,
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Shield,
} from "lucide-react"
import type { EncryptionKey } from "@/hooks/use-encryption-keys"

interface EncryptionKeyListProps {
  encryptionKeys: EncryptionKey[]
  onRevoke: (keyId: string) => Promise<void>
  onRotate: (keyId: string) => Promise<void>
  isRevoking: boolean
  isRotating: boolean
}

export function EncryptionKeyList({
  encryptionKeys,
  onRevoke,
  onRotate,
  isRevoking,
  isRotating,
}: EncryptionKeyListProps) {
  const [showConfirmRevokeId, setShowConfirmRevokeId] = useState<string | null>(
    null
  )
  const [showConfirmRotateId, setShowConfirmRotateId] = useState<string | null>(
    null
  )
  const [actionKeyId, setActionKeyId] = useState<string | null>(null)

  const handleRevoke = async (keyId: string) => {
    setActionKeyId(keyId)
    try {
      await onRevoke(keyId)
    } finally {
      setActionKeyId(null)
      setShowConfirmRevokeId(null)
    }
  }

  const handleRotate = async (keyId: string) => {
    setActionKeyId(keyId)
    try {
      await onRotate(keyId)
    } finally {
      setActionKeyId(null)
      setShowConfirmRotateId(null)
    }
  }

  const maskKey = (prefix: string) => {
    return `${prefix}${"*".repeat(32)}`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never"
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: EncryptionKey["status"]) => {
    switch (status) {
      case "active":
        return (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Active
          </span>
        )
      case "rotated":
        return (
          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
            Rotated
          </span>
        )
      case "revoked":
        return (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Revoked
          </span>
        )
    }
  }

  if (encryptionKeys.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-200 p-8 text-center">
        <Shield className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No encryption keys yet
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Create an encryption key to enable secure trace synchronization from
          your Gateway.
        </p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
      {encryptionKeys.map((key) => (
        <div key={key.id} className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  key.status === "active"
                    ? "bg-green-100"
                    : key.status === "rotated"
                      ? "bg-yellow-100"
                      : "bg-gray-100"
                }`}
              >
                <Key
                  className={`h-5 w-5 ${
                    key.status === "active"
                      ? "text-green-600"
                      : key.status === "rotated"
                        ? "text-yellow-600"
                        : "text-gray-400"
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{key.name}</p>
                  {getStatusBadge(key.status)}
                  <span className="text-xs text-gray-400">v{key.version}</span>
                </div>
                <code className="font-mono text-sm text-gray-500">
                  {maskKey(key.keyPrefix)}
                </code>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <p className="text-gray-500">
                  Created {formatDate(key.createdAt)}
                </p>
                {key.rotatedAt && (
                  <p className="text-gray-400">
                    Rotated {formatDate(key.rotatedAt)}
                  </p>
                )}
                {key.revokedAt && (
                  <p className="text-gray-400">
                    Revoked {formatDate(key.revokedAt)}
                  </p>
                )}
              </div>

              {key.status === "active" && (
                <>
                  {showConfirmRotateId === key.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRotate(key.id)}
                        disabled={isRotating && actionKeyId === key.id}
                        className="inline-flex items-center gap-1 rounded-md bg-yellow-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-700 disabled:opacity-50"
                      >
                        {isRotating && actionKeyId === key.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirmRotateId(null)}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : showConfirmRevokeId === key.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRevoke(key.id)}
                        disabled={isRevoking && actionKeyId === key.id}
                        className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {isRevoking && actionKeyId === key.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirmRevokeId(null)}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowConfirmRotateId(key.id)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-yellow-600"
                        title="Rotate key"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirmRevokeId(key.id)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                        title="Revoke key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
