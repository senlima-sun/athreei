import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useVaultUnlock, useVaultSetup } from "@/hooks"
import {
  Lock,
  Eye,
  EyeOff,
  Shield,
  AlertCircle,
  Sparkles,
  Check,
} from "lucide-react"
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
    <div className="dark flex min-h-screen items-center justify-center bg-background p-6">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full opacity-[0.03]"
          style={{ background: "var(--gradient-brand)" }}
        />
        <div
          className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full opacity-[0.03]"
          style={{ background: "var(--gradient-brand)" }}
        />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in-up">
        <div className="mb-8 text-center">
          <div className="relative mx-auto mb-5 inline-flex">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand shadow-lg shadow-brand/20">
              {isFirstTime ? (
                <Shield className="h-7 w-7 text-brand-foreground" />
              ) : (
                <Lock className="h-7 w-7 text-brand-foreground" />
              )}
            </div>
            <div className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-card shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
            </div>
          </div>
          <h1 className="text-lg font-semibold tracking-tight">
            {isFirstTime ? "Set Up Your Vault" : "Welcome Back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isFirstTime
              ? "Create a passphrase to keep your memories safe"
              : "Enter your passphrase to unlock"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="passphrase"
              className="text-[13px] font-medium text-foreground/80"
            >
              Passphrase
            </label>
            <div className="relative">
              <Input
                id="passphrase"
                type={showPassphrase ? "text" : "password"}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder={
                  isFirstTime
                    ? "Create a strong passphrase"
                    : "Enter passphrase"
                }
                autoFocus
                disabled={isLoading}
                className="h-11 pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                tabIndex={-1}
              >
                {showPassphrase ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {isFirstTime && (
            <div className="space-y-2">
              <label
                htmlFor="confirm"
                className="text-[13px] font-medium text-foreground/80"
              >
                Confirm Passphrase
              </label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder="Re-enter your passphrase"
                  disabled={isLoading}
                  className="h-11 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {passphrase.length > 0 && confirmPassphrase.length > 0 && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    passphrase === confirmPassphrase
                      ? "text-emerald-500"
                      : "text-destructive"
                  )}
                >
                  {passphrase === confirmPassphrase ? (
                    <>
                      <Check className="h-3 w-3" />
                      <span>Passphrases match</span>
                    </>
                  ) : (
                    <span>Passphrases don&apos;t match</span>
                  )}
                </div>
              )}
            </div>
          )}

          {isFirstTime && (
            <div className="rounded-lg border border-border/50 bg-card/50 px-3 py-2.5">
              <div
                className={cn(
                  "flex items-center gap-2 text-xs transition-colors",
                  passphrase.length >= 8
                    ? "text-emerald-500"
                    : "text-muted-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border transition-colors",
                    passphrase.length >= 8
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-muted-foreground/30"
                  )}
                >
                  {passphrase.length >= 8 && (
                    <Check className="h-2.5 w-2.5 text-emerald-500" />
                  )}
                </div>
                <span>At least 8 characters</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {error instanceof Error ? error.message : "An error occurred"}
              </span>
            </div>
          )}

          <Button
            type="submit"
            className="h-11 w-full bg-brand text-sm font-medium text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:bg-brand/90 hover:shadow-brand/30"
            disabled={!isValid || isLoading}
            loading={isLoading}
          >
            {isFirstTime ? "Create Vault" : "Unlock"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          {isFirstTime ? (
            <>
              <Lock className="mb-0.5 mr-1 inline-block h-3 w-3" />
              Your passphrase never leaves this device
            </>
          ) : (
            <>
              <Shield className="mb-0.5 mr-1 inline-block h-3 w-3" />
              End-to-end encrypted with AES-256-GCM
            </>
          )}
        </p>
      </div>
    </div>
  )
}
