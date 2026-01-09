import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 rounded-full bg-primary/10 p-4">
            {isFirstTime ? (
              <Shield className="h-8 w-8 text-primary" />
            ) : (
              <Lock className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isFirstTime ? "Set Up Your Vault" : "Unlock Your Vault"}
          </CardTitle>
          <CardDescription>
            {isFirstTime
              ? "Create a passphrase to encrypt your memories. This passphrase never leaves your device."
              : "Enter your passphrase to access your encrypted memories."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Passphrase input */}
            <div className="space-y-2">
              <label
                htmlFor="passphrase"
                className="text-sm font-medium text-foreground"
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
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassphrase(!showPassphrase)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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

            {/* Confirm passphrase (first time only) */}
            {isFirstTime && (
              <div className="space-y-2">
                <label
                  htmlFor="confirm"
                  className="text-sm font-medium text-foreground"
                >
                  Confirm Passphrase
                </label>
                <div className="relative">
                  <Input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassphrase}
                    onChange={(e) => setConfirmPassphrase(e.target.value)}
                    placeholder="Confirm your passphrase"
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
                  <p
                    className={cn(
                      "text-xs",
                      passphrase === confirmPassphrase
                        ? "text-green-500"
                        : "text-destructive"
                    )}
                  >
                    {passphrase === confirmPassphrase
                      ? "Passphrases match"
                      : "Passphrases do not match"}
                  </p>
                )}
              </div>
            )}

            {/* Passphrase requirements (first time only) */}
            {isFirstTime && (
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Requirements:
                </p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li
                    className={cn(passphrase.length >= 8 && "text-green-500")}
                  >
                    {passphrase.length >= 8 ? "✓" : "○"} At least 8 characters
                  </li>
                </ul>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  {error instanceof Error
                    ? error.message
                    : "An error occurred. Please try again."}
                </span>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full"
              disabled={!isValid || isLoading}
              loading={isLoading}
            >
              {isFirstTime ? "Create Vault" : "Unlock"}
            </Button>
          </form>

          {/* Security note */}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {isFirstTime
              ? "Your passphrase is used to derive an encryption key locally. We never store or transmit your passphrase."
              : "Your memories are encrypted with AES-256-GCM and only accessible with your passphrase."}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
