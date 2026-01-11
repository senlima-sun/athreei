import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useVaultUnlock, useVaultSetup } from "@/hooks"
import { Lock, Eye, EyeOff, Shield, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface UnlockScreenProps {
  isFirstTime: boolean
}

export function UnlockScreen({
  isFirstTime,
}: UnlockScreenProps): React.ReactElement {
  const [passphrase, setPassphrase] = useState("")
  const [confirmPassphrase, setConfirmPassphrase] = useState("")
  const [showPassphrase, setShowPassphrase] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const unlock = useVaultUnlock()
  const setup = useVaultSetup()

  const isLoading = unlock.isPending || setup.isPending
  const error = unlock.error || setup.error

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()

    if (isFirstTime) {
      if (passphrase !== confirmPassphrase) {
        return
      }
      setup.mutate(passphrase)
    } else {
      unlock.mutate(passphrase)
    }
  }

  const isValid = isFirstTime
    ? passphrase.length >= 8 && passphrase === confirmPassphrase
    : passphrase.length > 0

  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-xs">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex rounded-lg bg-card p-3">
            {isFirstTime ? (
              <Shield className="h-5 w-5 text-foreground" />
            ) : (
              <Lock className="h-5 w-5 text-foreground" />
            )}
          </div>
          <h1 className="text-sm font-medium">
            {isFirstTime ? "Set Up Vault" : "Unlock Vault"}
          </h1>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {isFirstTime
              ? "Create a passphrase to encrypt your memories"
              : "Enter passphrase to access memories"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="passphrase" className="text-xs font-medium">
              Passphrase
            </label>
            <div className="relative">
              <Input
                id="passphrase"
                type={showPassphrase ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder={
                  isFirstTime ? "Create passphrase" : "Enter passphrase"
                }
                autoFocus
                disabled={isLoading}
                className="h-8 pr-8 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassphrase ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {isFirstTime && (
            <div className="space-y-1.5">
              <label htmlFor="confirm" className="text-xs font-medium">
                Confirm
              </label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder="Confirm passphrase"
                  disabled={isLoading}
                  className="h-8 pr-8 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              {passphrase.length > 0 && confirmPassphrase.length > 0 && (
                <p
                  className={cn(
                    "text-[10px]",
                    passphrase === confirmPassphrase
                      ? "text-green-500"
                      : "text-destructive"
                  )}
                >
                  {passphrase === confirmPassphrase ? "Match" : "No match"}
                </p>
              )}
            </div>
          )}

          {isFirstTime && (
            <div className="rounded bg-card px-2 py-1.5">
              <p
                className={cn(
                  "text-[10px]",
                  passphrase.length >= 8
                    ? "text-green-500"
                    : "text-muted-foreground"
                )}
              >
                {passphrase.length >= 8 ? "✓" : "○"} At least 8 characters
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-1.5 rounded bg-destructive/10 px-2 py-1.5 text-[10px] text-destructive">
              <AlertCircle className="h-3 w-3 shrink-0" />
              <span>
                {error instanceof Error ? error.message : "Error occurred"}
              </span>
            </div>
          )}

          <Button
            type="submit"
            size="sm"
            className="h-8 w-full text-xs"
            disabled={!isValid || isLoading}
            loading={isLoading}
          >
            {isFirstTime ? "Create Vault" : "Unlock"}
          </Button>
        </form>

        <p className="mt-4 text-center text-[10px] text-muted-foreground">
          {isFirstTime
            ? "Passphrase never leaves your device"
            : "Encrypted with AES-256-GCM"}
        </p>
      </div>
    </div>
  )
}
