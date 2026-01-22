"use client"

import { X, Key, AlertTriangle, Check } from "lucide-react"
import { CopyButton } from "../endpoints/copy-button"
import { useState } from "react"

interface EncryptionKeyCreatedModalProps {
  isOpen: boolean
  onClose: () => void
  encryptionKey: string
  keyName: string
  isRotation?: boolean
}

export function EncryptionKeyCreatedModal({
  isOpen,
  onClose,
  encryptionKey,
  keyName,
  isRotation = false,
}: EncryptionKeyCreatedModalProps) {
  const [hasCopied, setHasCopied] = useState(false)

  if (!isOpen) return null

  const handleCopySuccess = () => {
    setHasCopied(true)
  }

  const handleClose = () => {
    setHasCopied(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <Key className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {isRotation ? "Encryption Key Rotated" : "Encryption Key Created"}
              </h2>
              <p className="text-sm text-gray-500">{keyName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Copy your encryption key now</p>
                <p className="mt-1">
                  This is the only time the full encryption key will be shown.
                  Store it securely - you will not be able to see it again.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Your Encryption Key
            </label>
            <div className="mt-1 flex items-center gap-2">
              <code className="flex-1 break-all rounded-md bg-gray-100 px-3 py-2 font-mono text-sm text-gray-900">
                {encryptionKey}
              </code>
              <div onClick={handleCopySuccess}>
                <CopyButton text={encryptionKey} label="Copy" />
              </div>
            </div>
          </div>

          {hasCopied && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Check className="h-4 w-4" />
                <span>Encryption key copied to clipboard</span>
              </div>
            </div>
          )}

          <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-600">
            <p className="font-medium">Usage in Gateway configuration:</p>
            <pre className="mt-2 overflow-x-auto text-xs">
              {`# In your gateway config file or environment
ATHREEI_ENCRYPTION_KEY="${encryptionKey.substring(0, 8)}..."

# Or in athreei.config.json
{
  "trace": {
    "enabled": true,
    "encryptionKey": "${encryptionKey.substring(0, 8)}..."
  }
}`}
            </pre>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
