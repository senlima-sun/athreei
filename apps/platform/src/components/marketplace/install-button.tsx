"use client"

import { useState } from "react"
import {
  Download,
  Check,
  ChevronDown,
  Settings,
  RefreshCw,
  Trash2,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { InstallModal } from "./install-modal"
import {
  usePluginInstallation,
  useUninstallPlugin,
  useUpdatePlugin,
} from "@/hooks/use-plugin-installation"
import type { EnvVarDefinition } from "@/types/marketplace"

interface InstallButtonProps {
  pluginId: string
  pluginName: string
  pluginSlug: string
  marketplaceSlug: string
  latestVersion?: string
  envVars?: EnvVarDefinition[]
  canInstallForOrg?: boolean
  onConfigure?: () => void
  size?: "default" | "sm"
}

export function InstallButton({
  pluginId,
  pluginName,
  pluginSlug,
  marketplaceSlug,
  latestVersion,
  envVars = [],
  canInstallForOrg = true,
  onConfigure,
  size = "default",
}: InstallButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data, isPending: isCheckingInstallation } =
    usePluginInstallation(pluginId)
  const uninstallMutation = useUninstallPlugin()
  const updateMutation = useUpdatePlugin()

  const installation = data?.installation
  const isInstalled = !!installation
  const installedVersion = installation?.version?.version
  const hasUpdate =
    isInstalled && latestVersion && installedVersion !== latestVersion

  const handleUninstall = async () => {
    if (!installation) return
    await uninstallMutation.mutateAsync(installation.id)
  }

  const handleUpdate = async () => {
    if (!installation) return
    await updateMutation.mutateAsync({
      installationId: installation.id,
      version: latestVersion,
    })
  }

  const isLoading =
    isCheckingInstallation ||
    uninstallMutation.isPending ||
    updateMutation.isPending

  if (isCheckingInstallation) {
    return (
      <Button variant="outline" size={size} disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading
      </Button>
    )
  }

  if (isInstalled) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size={size}
                disabled={isLoading}
                className="gap-1.5"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 text-green-600" />
                )}
                <span>Installed</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            {onConfigure && (
              <DropdownMenuItem onClick={onConfigure}>
                <Settings className="mr-2 h-4 w-4" />
                Configure
              </DropdownMenuItem>
            )}
            {hasUpdate && (
              <DropdownMenuItem onClick={handleUpdate}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Update to {latestVersion}
              </DropdownMenuItem>
            )}
            {(onConfigure || hasUpdate) && <DropdownMenuSeparator />}
            <DropdownMenuItem variant="destructive" onClick={handleUninstall}>
              <Trash2 className="mr-2 h-4 w-4" />
              Uninstall
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <InstallModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          pluginName={pluginName}
          pluginSlug={pluginSlug}
          marketplaceSlug={marketplaceSlug}
          version={latestVersion}
          envVars={envVars}
          canInstallForOrg={canInstallForOrg}
        />
      </>
    )
  }

  return (
    <>
      <Button size={size} onClick={() => setIsModalOpen(true)}>
        <Download className="mr-2 h-4 w-4" />
        Install
      </Button>

      <InstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pluginName={pluginName}
        pluginSlug={pluginSlug}
        marketplaceSlug={marketplaceSlug}
        version={latestVersion}
        envVars={envVars}
        canInstallForOrg={canInstallForOrg}
      />
    </>
  )
}
