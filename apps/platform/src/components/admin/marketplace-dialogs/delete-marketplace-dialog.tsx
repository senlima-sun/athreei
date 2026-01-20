"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Loader2, AlertTriangle } from "lucide-react"
import {
  useDeleteMarketplace,
  type AdminMarketplace,
} from "@/hooks/use-admin-marketplaces"

interface DeleteMarketplaceDialogProps {
  marketplace: AdminMarketplace | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function DeleteMarketplaceDialog({
  marketplace,
  open,
  onOpenChange,
  onSuccess,
}: DeleteMarketplaceDialogProps) {
  const [error, setError] = useState<string | null>(null)
  const deleteMutation = useDeleteMarketplace()

  function handleOpenChange(newOpen: boolean) {
    if (!newOpen) {
      setError(null)
    }
    onOpenChange(newOpen)
  }

  async function handleDelete() {
    if (!marketplace) return

    setError(null)

    try {
      await deleteMutation.mutateAsync(marketplace.slug)
      handleOpenChange(false)
      onSuccess?.()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete marketplace"
      setError(message)
    }
  }

  if (!marketplace) return null

  const pluginCount = marketplace.pluginCount || 0

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Delete Marketplace</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {marketplace.name}
              </span>{" "}
              (
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                {marketplace.slug}
              </code>
              )?
            </p>
            {pluginCount > 0 && (
              <p className="text-destructive">
                This will also remove {pluginCount} plugin
                {pluginCount === 1 ? "" : "s"} from this marketplace.
              </p>
            )}
            <p>This action cannot be undone.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && <p className="text-sm text-destructive px-1">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
