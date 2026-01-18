"use client"

import { useState } from "react"
import { X, Loader2, Key } from "lucide-react"

interface CreateApiKeyModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (name: string) => Promise<{ key?: string; error?: string }>
}

export function CreateApiKeyModal({
  isOpen,
  onClose,
  onCreate,
}: CreateApiKeyModalProps) {
  const [name, setName] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsCreating(true)

    try {
      const result = await onCreate(name.trim())
      if (result.error) {
        setError(result.error)
        return
      }
      // Success - the parent component will show the key created modal
      setName("")
      onClose()
    } catch (_err) {
      setError("An unexpected error occurred")
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    if (!isCreating) {
      setName("")
      setError(null)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <Key className="h-5 w-5 text-gray-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Create API Key
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isCreating}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="keyName"
              className="block text-sm font-medium text-gray-700"
            >
              Key name
            </label>
            <input
              type="text"
              id="keyName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production Key, Development Key"
              required
              disabled={isCreating}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 disabled:bg-gray-50"
            />
            <p className="mt-1 text-xs text-gray-500">
              Give your key a descriptive name to identify it later.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
            <p className="font-medium">Important</p>
            <p className="mt-1">
              The API key will only be shown once after creation. Make sure to
              copy and store it securely.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !name.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
              Create API Key
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
