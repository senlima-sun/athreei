import { useState, useEffect, useRef } from "react"
import { X, Key, Loader2, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useVaultChangePassphrase } from "@/hooks"

interface ChangePassphraseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MIN_PASSPHRASE_LENGTH = 8

export function ChangePassphraseDialog({
  open,
  onOpenChange,
}: ChangePassphraseDialogProps): React.ReactElement | null {
  const oldPassphraseRef = useRef<HTMLInputElement>(null)
  const [oldPassphrase, setOldPassphrase] = useState("")
  const [newPassphrase, setNewPassphrase] = useState("")
  const [confirmPassphrase, setConfirmPassphrase] = useState("")
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const changePassphrase = useVaultChangePassphrase()

  // Focus old passphrase input when dialog opens
  useEffect(() => {
    if (open) {
      setOldPassphrase("")
      setNewPassphrase("")
      setConfirmPassphrase("")
      setSuccessMessage(null)
      changePassphrase.reset()
      setTimeout(() => oldPassphraseRef.current?.focus(), 0)
    }
  }, [open])

  // Close on escape
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault()
        handleClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open])

  const handleClose = (): void => {
    if (!changePassphrase.isPending) {
      onOpenChange(false)
    }
  }

  const validatePassphrase = (): string | null => {
    if (!oldPassphrase) return "Current passphrase is required"
    if (newPassphrase.length < MIN_PASSPHRASE_LENGTH) {
      return `New passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters`
    }
    if (newPassphrase !== confirmPassphrase) {
      return "New passphrases do not match"
    }
    if (oldPassphrase === newPassphrase) {
      return "New passphrase must be different from current"
    }
    return null
  }

  const validationError = validatePassphrase()

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    if (validationError) return

    try {
      const result = await changePassphrase.mutateAsync({
        oldPassphrase,
        newPassphrase,
      })

      setSuccessMessage(
        `Passphrase changed successfully. ${result.memories_re_encrypted} of ${result.total_memories} memories re-encrypted.`
      )

      if (result.errors.length > 0) {
        setSuccessMessage(
          (prev) => `${prev} Warning: ${result.errors.length} errors occurred.`
        )
      }

      // Close dialog after success after a short delay
      setTimeout(() => {
        onOpenChange(false)
      }, 3000)
    } catch (error) {
      // Error is handled by mutation state
      console.error("Failed to change passphrase:", error)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-[15%] w-full max-w-md -translate-x-1/2 px-4">
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Change Passphrase</h2>
            </div>
            <button
              onClick={handleClose}
              className="rounded-md p-1 hover:bg-accent"
              aria-label="Close"
              disabled={changePassphrase.isPending}
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Warning */}
            <div className="flex gap-2 rounded-lg bg-amber-500/10 p-3 text-sm">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <div className="text-amber-600">
                <p className="font-medium">Important</p>
                <p className="text-xs">
                  This will re-encrypt all your memories. This may take a while
                  if you have many memories. Do not close the app during this process.
                </p>
              </div>
            </div>

            {/* Current passphrase */}
            <div className="space-y-2">
              <label
                htmlFor="old-passphrase"
                className="text-sm font-medium text-muted-foreground"
              >
                Current Passphrase
              </label>
              <Input
                id="old-passphrase"
                ref={oldPassphraseRef}
                type="password"
                value={oldPassphrase}
                onChange={(e) => setOldPassphrase(e.target.value)}
                placeholder="Enter current passphrase"
                disabled={changePassphrase.isPending}
              />
            </div>

            {/* New passphrase */}
            <div className="space-y-2">
              <label
                htmlFor="new-passphrase"
                className="text-sm font-medium text-muted-foreground"
              >
                New Passphrase
              </label>
              <Input
                id="new-passphrase"
                type="password"
                value={newPassphrase}
                onChange={(e) => setNewPassphrase(e.target.value)}
                placeholder="Enter new passphrase (min 8 characters)"
                disabled={changePassphrase.isPending}
              />
              {newPassphrase.length > 0 && newPassphrase.length < MIN_PASSPHRASE_LENGTH && (
                <p className="text-xs text-destructive">
                  {MIN_PASSPHRASE_LENGTH - newPassphrase.length} more characters needed
                </p>
              )}
            </div>

            {/* Confirm passphrase */}
            <div className="space-y-2">
              <label
                htmlFor="confirm-passphrase"
                className="text-sm font-medium text-muted-foreground"
              >
                Confirm New Passphrase
              </label>
              <Input
                id="confirm-passphrase"
                type="password"
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
                placeholder="Confirm new passphrase"
                disabled={changePassphrase.isPending}
              />
              {confirmPassphrase.length > 0 &&
                newPassphrase !== confirmPassphrase && (
                  <p className="text-xs text-destructive">Passphrases do not match</p>
                )}
            </div>

            {/* Error */}
            {changePassphrase.error && (
              <div className="flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <p>
                  {changePassphrase.error instanceof Error
                    ? changePassphrase.error.message
                    : "Failed to change passphrase"}
                </p>
              </div>
            )}

            {/* Success */}
            {successMessage && (
              <div className="flex gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-600">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <p>{successMessage}</p>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={changePassphrase.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!!validationError || changePassphrase.isPending || !!successMessage}
            >
              {changePassphrase.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Re-encrypting...
                </>
              ) : (
                "Change Passphrase"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
