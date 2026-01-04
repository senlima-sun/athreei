import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { api } from "../lib/api"
import { LegacyCard as Card } from "../components/ui/Card"
import { Button } from "../components/ui/Button"
import { Spinner } from "../components/ui/Spinner"
import { EmptyState, SearchIcon } from "../components/ui/EmptyState"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog"
import { Input } from "../components/ui/input"
import { cn } from "@/lib/utils"
import type { TraceEntry } from "./Traces"

/**
 * Decrypted trace payload
 */
interface TracePayload {
  request?: {
    arguments: Record<string, unknown>
    meta?: Record<string, unknown>
  }
  response?: {
    result: unknown
    meta?: Record<string, unknown>
  }
}

/**
 * Decryption key stored in session memory
 */
interface DecryptionSession {
  key: Uint8Array
  salt: Uint8Array
  expiresAt: number
}

// Session storage for decryption key (in-memory only, never persisted)
let decryptionSession: DecryptionSession | null = null

export function TraceDetail() {
  const { uuid } = useParams<{ uuid: string }>()
  const navigate = useNavigate()

  const [trace, setTrace] = useState<TraceEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Decryption state
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [password, setPassword] = useState("")
  const [decrypting, setDecrypting] = useState(false)
  const [decryptionError, setDecryptionError] = useState<string | null>(null)
  const [decryptedPayload, setDecryptedPayload] = useState<TracePayload | null>(
    null
  )
  const [hasDecryptionKey, setHasDecryptionKey] = useState(false)

  // Check for existing decryption session
  useEffect(() => {
    if (decryptionSession && decryptionSession.expiresAt > Date.now()) {
      setHasDecryptionKey(true)
    } else {
      decryptionSession = null
      setHasDecryptionKey(false)
    }
  }, [])

  // Fetch trace from API
  useEffect(() => {
    const fetchTrace = async () => {
      if (!uuid) return

      try {
        setLoading(true)
        setError(null)

        const response = await api.get<{ data: TraceEntry }>(
          `/api/traces/${uuid}`
        )
        setTrace(response.data)

        // Check if trace has encrypted payload
        if (response.data.encryptedPayload && hasDecryptionKey) {
          await decryptTracePayload(response.data)
        }
      } catch (err) {
        setTrace(null)
        setError(
          err instanceof Error ? err.message : "Failed to load trace details"
        )
      } finally {
        setLoading(false)
      }
    }

    fetchTrace()
  }, [uuid, hasDecryptionKey])

  // Decrypt trace payload using stored key
  const decryptTracePayload = useCallback(async (traceData: TraceEntry) => {
    if (!traceData.encryptedPayload || !decryptionSession) {
      return
    }

    try {
      // Dynamic import of crypto functions from @athreei/shared
      const cryptoModule = await import("@athreei/shared")
      const { decryptTrace } = cryptoModule

      // Parse the encrypted payload (base64-encoded JSON with nonce, ciphertext, etc.)
      // The nonce is embedded inside the JSON payload, not a separate field
      const encryptedPayloadJson = JSON.parse(atob(traceData.encryptedPayload))

      const decrypted = decryptTrace(
        encryptedPayloadJson,
        decryptionSession.key
      ) as TracePayload

      setDecryptedPayload(decrypted)
      setDecryptionError(null)
    } catch (err) {
      setDecryptionError(
        "Failed to decrypt payload. The encryption key may be incorrect."
      )
      setDecryptedPayload(null)
    }
  }, [])

  // Handle password submission for decryption
  const handleDecrypt = async () => {
    if (!password.trim() || !trace) return

    try {
      setDecrypting(true)
      setDecryptionError(null)

      // Dynamic import of crypto functions from @athreei/shared
      const cryptoModule = await import("@athreei/shared")
      const { deriveKey, decryptTrace } = cryptoModule

      // Step 1: Try to get existing salt from account
      let salt: Uint8Array | undefined
      try {
        const saltResponse = await api.get<{ salt: string | null }>(
          "/api/account/encryption-salt"
        )
        if (saltResponse.salt) {
          salt = new Uint8Array(
            atob(saltResponse.salt)
              .split("")
              .map((c) => c.charCodeAt(0))
          )
        }
      } catch {
        // Salt endpoint not available, will generate new salt
      }

      // Step 2: Derive key from password (with existing salt or generate new one)
      const derived = await deriveKey(password, salt)

      // Step 3: If no salt existed, save the new salt to the server
      if (!salt) {
        try {
          const saltBase64 = btoa(String.fromCharCode(...derived.salt))
          await api.post("/api/account/encryption-salt", { salt: saltBase64 })
        } catch {
          // Failed to save salt, but continue with decryption
          console.warn("Failed to save encryption salt to server")
        }
      }

      // Step 4: Try to decrypt the payload
      if (trace.encryptedPayload) {
        // Parse the encrypted payload (base64-encoded JSON with nonce, ciphertext, etc.)
        const encryptedPayloadJson = JSON.parse(atob(trace.encryptedPayload))

        const decrypted = decryptTrace(
          encryptedPayloadJson,
          derived.key
        ) as TracePayload

        setDecryptedPayload(decrypted)

        // Store session for 30 minutes
        decryptionSession = {
          key: derived.key,
          salt: derived.salt,
          expiresAt: Date.now() + 30 * 60 * 1000,
        }
        setHasDecryptionKey(true)
      }

      setShowPasswordDialog(false)
      setPassword("")
    } catch (err) {
      setDecryptionError(
        err instanceof Error
          ? err.message
          : "Decryption failed. Please check your password."
      )
    } finally {
      setDecrypting(false)
    }
  }

  // Clear decryption session
  const clearDecryptionSession = () => {
    decryptionSession = null
    setHasDecryptionKey(false)
    setDecryptedPayload(null)
  }

  // Format duration for display
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  // Format timestamp for display
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Spinner size="lg" />
        <p className="text-muted-foreground">Loading trace details...</p>
      </div>
    )
  }

  if (!trace) {
    return (
      <EmptyState
        icon={<SearchIcon />}
        title={error ? "Unable to load trace" : "Trace not found"}
        description={
          error ||
          "The requested trace could not be found. It may have been deleted or the ID is incorrect."
        }
        action={{
          label: "Back to Traces",
          onClick: () => navigate("/traces"),
        }}
        className="h-64"
      />
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/traces")}
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </Button>
          </div>
          <h2 className="text-2xl font-semibold mb-1">Trace Details</h2>
          <p className="text-muted-foreground font-mono text-sm">
            {trace.traceId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasDecryptionKey ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={clearDecryptionSession}
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Lock Payload
            </Button>
          ) : trace.encryptedPayload ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowPasswordDialog(true)}
            >
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
                />
              </svg>
              Decrypt Payload
            </Button>
          ) : null}
        </div>
      </div>

      {/* Metadata */}
      <Card className="mb-6">
        <h3 className="text-lg font-medium mb-4">Metadata</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Tool
            </label>
            <p className="mt-1">
              <code className="bg-muted px-2 py-1 rounded text-sm">
                {trace.toolName}
              </code>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Server
            </label>
            <p className="mt-1 text-sm">{trace.serverName}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Status
            </label>
            <p className="mt-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                  trace.status === "success"
                    ? "bg-success/10 text-success"
                    : "bg-error/10 text-error"
                )}
              >
                {trace.status === "success" ? (
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
                {trace.status === "success" ? "Success" : "Error"}
              </span>
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Duration
            </label>
            <p className="mt-1 font-mono text-sm">
              {formatDuration(trace.durationMs)}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Start Time
            </label>
            <p className="mt-1 text-sm">{formatTimestamp(trace.startTime)}</p>
          </div>
          {trace.endTime && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                End Time
              </label>
              <p className="mt-1 text-sm">{formatTimestamp(trace.endTime)}</p>
            </div>
          )}
          {trace.endpointId && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Endpoint
              </label>
              <p className="mt-1 text-sm">{trace.endpointId}</p>
            </div>
          )}
          {trace.keyVersion && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Key Version
              </label>
              <p className="mt-1 text-sm">v{trace.keyVersion}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Error Message (if failed) */}
      {trace.status === "error" && trace.errorMessage && (
        <Card className="mb-6">
          <h3 className="text-lg font-medium mb-4 text-error">Error Details</h3>
          <pre className="bg-error/5 border border-error/20 rounded-md p-4 text-sm overflow-x-auto text-error">
            {trace.errorMessage}
          </pre>
        </Card>
      )}

      {/* Request/Response Payload */}
      <Card>
        <h3 className="text-lg font-medium mb-4">Payload</h3>

        {!trace.encryptedPayload ? (
          <div className="text-muted-foreground text-center py-8">
            No encrypted payload available for this trace.
          </div>
        ) : !hasDecryptionKey ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
              <svg
                className="w-6 h-6 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <p className="text-muted-foreground mb-4">
              Payload is encrypted. Enter your decryption password to view.
            </p>
            <Button
              variant="primary"
              onClick={() => setShowPasswordDialog(true)}
            >
              Enter Password
            </Button>
          </div>
        ) : decryptionError ? (
          <div className="text-center py-8">
            <div className="text-error mb-4">{decryptionError}</div>
            <Button
              variant="secondary"
              onClick={() => setShowPasswordDialog(true)}
            >
              Try Again
            </Button>
          </div>
        ) : decryptedPayload ? (
          <div className="space-y-6">
            {/* Request */}
            {decryptedPayload.request && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Request
                </h4>
                <pre className="bg-muted rounded-md p-4 text-sm overflow-x-auto">
                  {JSON.stringify(decryptedPayload.request, null, 2)}
                </pre>
              </div>
            )}

            {/* Response */}
            {decryptedPayload.response && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  Response
                </h4>
                <pre className="bg-muted rounded-md p-4 text-sm overflow-x-auto">
                  {JSON.stringify(decryptedPayload.response, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground text-center py-8">
            Decrypting payload...
          </div>
        )}
      </Card>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Decryption Password</DialogTitle>
            <DialogDescription>
              Your encryption password is required to decrypt the trace payload.
              The key will be stored in memory for 30 minutes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                Password
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your encryption password"
                className="mt-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleDecrypt()
                }}
              />
            </div>

            {decryptionError && (
              <div className="text-error text-sm">{decryptionError}</div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowPasswordDialog(false)
                  setPassword("")
                  setDecryptionError(null)
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDecrypt}
                loading={decrypting}
                disabled={!password.trim()}
              >
                Decrypt
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
