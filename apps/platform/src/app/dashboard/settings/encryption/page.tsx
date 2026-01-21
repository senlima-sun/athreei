"use client"

import { useState } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import {
  useEncryptionKeys,
  useCreateEncryptionKey,
  useRotateEncryptionKey,
  useRevokeEncryptionKey,
} from "@/hooks/use-encryption-keys"
import { EncryptionKeyList } from "@/components/settings/encryption-key-list"
import { EncryptionKeyCreatedModal } from "@/components/settings/encryption-key-created-modal"
import {
  Loader2,
  Plus,
  AlertCircle,
  Shield,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react"

export default function EncryptionSettingsPage() {
  const [isCreating, setIsCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [createdKey, setCreatedKey] = useState<{
    key: string
    name: string
    isRotation: boolean
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)

  const { data, isPending, error: fetchError } = useEncryptionKeys()
  const createMutation = useCreateEncryptionKey()
  const rotateMutation = useRotateEncryptionKey()
  const revokeMutation = useRevokeEncryptionKey()

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      setError("Key name is required")
      return
    }

    setError(null)
    try {
      const result = await createMutation.mutateAsync({ name: newKeyName })
      setCreatedKey({
        key: result.rawKey,
        name: result.encryptionKey.name,
        isRotation: false,
      })
      setShowModal(true)
      setNewKeyName("")
      setIsCreating(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key")
    }
  }

  const handleRotate = async (keyId: string) => {
    setError(null)
    try {
      const result = await rotateMutation.mutateAsync(keyId)
      setCreatedKey({
        key: result.rawKey,
        name: result.encryptionKey.name,
        isRotation: true,
      })
      setShowModal(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rotate key")
    }
  }

  const handleRevoke = async (keyId: string) => {
    setError(null)
    try {
      await revokeMutation.mutateAsync(keyId)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke key")
    }
  }

  const encryptionKeys = data?.encryptionKeys ?? []

  return (
    <div>
      <PageHeader
        title="Encryption Keys"
        description="Manage encryption keys for secure trace synchronization from your Gateway"
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {fetchError && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          Failed to load encryption keys
        </div>
      )}

      <div className="space-y-6">
        {/* Info Card */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
            <div className="text-sm text-blue-700">
              <p className="font-medium">What are encryption keys?</p>
              <p className="mt-1">
                Encryption keys are used to securely encrypt trace data sent
                from your local Gateway to the athreei cloud. This ensures your
                tool call data remains private and secure during transmission
                and storage.
              </p>
            </div>
          </div>
        </div>

        {/* Create Key Form */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <Shield className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Create Encryption Key</h3>
              <p className="text-sm text-gray-500">
                Generate a new 256-bit encryption key for your Gateway
              </p>
            </div>
          </div>

          {isCreating ? (
            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="keyName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Key Name
                </label>
                <input
                  type="text"
                  id="keyName"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  placeholder="e.g., Production Gateway Key"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {createMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Create Key
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false)
                    setNewKeyName("")
                    setError(null)
                  }}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              Create New Key
            </button>
          )}
        </div>

        {/* Key List */}
        <div>
          <h3 className="mb-4 text-lg font-medium text-gray-900">Your Keys</h3>
          {isPending ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <EncryptionKeyList
              encryptionKeys={encryptionKeys}
              onRevoke={handleRevoke}
              onRotate={handleRotate}
              isRevoking={revokeMutation.isPending}
              isRotating={rotateMutation.isPending}
            />
          )}
        </div>

        {/* Usage Instructions */}
        <div className="rounded-lg border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setShowInstructions(!showInstructions)}
            className="flex w-full items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <Info className="h-5 w-5 text-gray-400" />
              <span className="font-medium text-gray-900">
                How to use encryption keys
              </span>
            </div>
            {showInstructions ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {showInstructions && (
            <div className="border-t border-gray-200 p-4">
              <div className="space-y-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900">
                    1. Environment Variable
                  </h4>
                  <pre className="mt-2 overflow-x-auto rounded-md bg-gray-100 p-3 text-xs">
                    {`export ATHREEI_ENCRYPTION_KEY="your-encryption-key-here"`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">
                    2. Configuration File
                  </h4>
                  <pre className="mt-2 overflow-x-auto rounded-md bg-gray-100 p-3 text-xs">
                    {`// athreei.config.json
{
  "trace": {
    "enabled": true,
    "endpoint": "https://api.athreei.com/api/gateway/traces",
    "encryptionKey": "your-encryption-key-here"
  }
}`}
                  </pre>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900">Best Practices</h4>
                  <ul className="mt-2 list-disc space-y-1 pl-4">
                    <li>Never commit encryption keys to version control</li>
                    <li>Use environment variables in production</li>
                    <li>Rotate keys periodically for enhanced security</li>
                    <li>Revoke keys immediately if they are compromised</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Key Created Modal */}
      {createdKey && (
        <EncryptionKeyCreatedModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false)
            setCreatedKey(null)
          }}
          encryptionKey={createdKey.key}
          keyName={createdKey.name}
          isRotation={createdKey.isRotation}
        />
      )}
    </div>
  )
}
