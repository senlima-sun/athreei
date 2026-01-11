import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Shield, Lock, Key, CheckCircle, ChevronRight } from "lucide-react"
import { useVaultLock } from "@/hooks"
import { ErrorDisplay } from "@/components/common/error-display"
import { ChangePassphraseDialog } from "@/components/change-passphrase-dialog"
import { Section } from "./section"
import { SettingRow } from "./setting-row"

export function VaultSection(): React.ReactElement {
  const vaultLock = useVaultLock()
  const [showChangePassphrase, setShowChangePassphrase] = useState(false)

  const handleLockVault = async (): Promise<void> => {
    await vaultLock.mutateAsync()
  }

  return (
    <>
      <Section
        icon={Shield}
        title="Vault"
        badge={
          <Badge variant="success" className="gap-0.5">
            <CheckCircle className="h-2.5 w-2.5" />
            Unlocked
          </Badge>
        }
      >
        <SettingRow
          label="Lock Vault"
          description="Protect your memories"
          action={
            <Button
              variant="secondary"
              size="sm"
              className="h-6 gap-1 text-xs"
              onClick={handleLockVault}
              loading={vaultLock.isPending}
            >
              <Lock className="h-3 w-3" />
              Lock
            </Button>
          }
        />
        {vaultLock.error && <ErrorDisplay error={vaultLock.error} />}

        <SettingRow
          label="Encryption"
          description="Local encryption with your passphrase"
          action={
            <Badge variant="outline">
              <Key className="h-2.5 w-2.5" />
              AES-256
            </Badge>
          }
        />

        <SettingRow
          label="Change Passphrase"
          description="Update vault passphrase"
          action={
            <button
              onClick={() => setShowChangePassphrase(true)}
              className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Change
              <ChevronRight className="h-3 w-3" />
            </button>
          }
        />
      </Section>

      <ChangePassphraseDialog
        open={showChangePassphrase}
        onOpenChange={setShowChangePassphrase}
      />
    </>
  )
}
