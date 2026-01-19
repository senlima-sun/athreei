"use client"

import { useState } from "react"
import {
  MoreHorizontal,
  Power,
  PowerOff,
  Download,
  Trash2,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { PluginInstallation } from "@/types/marketplace"

interface PluginActionsProps {
  installation: PluginInstallation
  hasUpdate?: boolean
  onEnable?: (installation: PluginInstallation) => void
  onDisable?: (installation: PluginInstallation) => void
  onUpdate?: (installation: PluginInstallation) => void
  onConfigure?: (installation: PluginInstallation) => void
  onUninstall?: (installation: PluginInstallation) => void
  isUpdating?: boolean
  isToggling?: boolean
  isUninstalling?: boolean
}

export function PluginActions({
  installation,
  hasUpdate = false,
  onEnable,
  onDisable,
  onUpdate,
  onConfigure,
  onUninstall,
  isUpdating = false,
  isToggling = false,
  isUninstalling = false,
}: PluginActionsProps) {
  const [showUninstallDialog, setShowUninstallDialog] = useState(false)
  const isDisabled = installation.status === "disabled"
  const isLoading = isUpdating || isToggling || isUninstalling

  const handleUninstallConfirm = () => {
    onUninstall?.(installation)
    setShowUninstallDialog(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="icon-sm" disabled={isLoading} />
          }
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Plugin actions</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onConfigure && (
            <DropdownMenuItem onClick={() => onConfigure(installation)}>
              <Settings className="mr-2 h-4 w-4" />
              Configure
            </DropdownMenuItem>
          )}

          {isDisabled
            ? onEnable && (
                <DropdownMenuItem
                  onClick={() => onEnable(installation)}
                  disabled={isToggling}
                >
                  <Power className="mr-2 h-4 w-4" />
                  {isToggling ? "Enabling..." : "Enable"}
                </DropdownMenuItem>
              )
            : onDisable && (
                <DropdownMenuItem
                  onClick={() => onDisable(installation)}
                  disabled={isToggling}
                >
                  <PowerOff className="mr-2 h-4 w-4" />
                  {isToggling ? "Disabling..." : "Disable"}
                </DropdownMenuItem>
              )}

          {hasUpdate && onUpdate && (
            <DropdownMenuItem
              onClick={() => onUpdate(installation)}
              disabled={isUpdating}
            >
              <Download className="mr-2 h-4 w-4" />
              {isUpdating ? "Updating..." : "Update"}
            </DropdownMenuItem>
          )}

          {onUninstall && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setShowUninstallDialog(true)}
                disabled={isUninstalling}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isUninstalling ? "Uninstalling..." : "Uninstall"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={showUninstallDialog}
        onOpenChange={setShowUninstallDialog}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Uninstall {installation.plugin.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the plugin and all its components from your
              organization. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleUninstallConfirm}
            >
              Uninstall
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
